import type { Message } from "ollama";
import type { Role } from "../auth/roles";
import { config } from "../config";
import { logger } from "../config/logger";
import type { Db } from "../db/connection";
import { addMessage, createSession, getMessages, sessionExists } from "../db/sessions";
import { chat } from "../llm/client";
import { retrieve, type RetrievedChunk } from "../rag/retriever";
import { createRegistry } from "../tools";

const WEB_TOOL = "web_search";

function systemPrompt(webSearch: boolean): string {
  return (
    "Tu es un assistant utile et concis. Réponds en français sauf demande contraire. " +
    "N'appelle un outil que s'il est nécessaire : si les extraits du corpus fournis ou la conversation " +
    "suffisent, réponds directement. Sinon utilise les outils au lieu de deviner : calculator pour les calculs, " +
    "list_documents et read_document pour les documents du corpus, " +
    "sql_query pour les bases métier (crm : contacts, catalogue : produits, ventes : commandes) " +
    "en interrogeant uniquement la base concernée. " +
    (webSearch
      ? "web_search en dernier recours seulement : quand l'information n'est ni dans les extraits, " +
      "ni dans les documents, ni dans les bases, ou qu'elle est récente ou externe à l'entreprise. " +
      "Cite alors les URL utilisées. "
      : "") +
    "Tu n'as accès qu'aux outils qui te sont fournis : si une action demandée n'est pas possible " +
    "avec eux, dis-le simplement. " +
    "Si un outil renvoie une erreur, explique-la honnêtement à l'utilisateur."
  );
}

// Local d'abord : si le corpus contient déjà un passage très pertinent,
// la recherche web n'est même pas proposée au modèle.
export function shouldOfferWebSearch(
  passages: RetrievedChunk[],
  skipScore: number = config.webSearch.skipScore
): boolean {
  return !passages.some((p) => p.score >= skipScore);
}

// Clé de déduplication : même outil + mêmes arguments = même résultat dans un tour.
export function toolCallKey(name: string, args: unknown): string {
  return `${name}:${JSON.stringify(args)}`;
}

export interface ChatResult {
  sessionId: string;
  answer: string;
  toolsUsed: string[];
  sources: string[];
}

export class SessionNotFoundError extends Error { }

const registry = createRegistry();

export async function runChat(
  db: Db,
  userMessage: string,
  sessionId?: string,
  role: Role = "reader"
): Promise<ChatResult> {
  let id = sessionId;
  if (id) {
    if (!sessionExists(db, id)) throw new SessionNotFoundError(`Session inconnue : ${id}`);
  } else {
    id = createSession(db);
  }

  const history: Message[] = getMessages(db, id)
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));

  // RAG : recherche des passages pertinents avant l'appel au modèle
  const passages = await retrieve(db, userMessage);
  const sources = [...new Set(passages.map((p) => p.path))];

  // Boucle d'outils bornée : le modèle ne voit que les outils autorisés pour son rôle
  const offerWeb = shouldOfferWebSearch(passages);
  const tools = registry
    .toOllamaTools(role)
    .filter((t) => offerWeb || t.function.name !== WEB_TOOL);
  const webAvailable = tools.some((t) => t.function.name === WEB_TOOL);

  const messages: Message[] = [{ role: "system", content: systemPrompt(webAvailable) }];
  if (passages.length > 0) {
    messages.push({
      role: "system",
      content:
        "Extraits pertinents du corpus. Appuie-toi dessus pour répondre et cite le nom du fichier :\n\n" +
        passages.map((p, i) => `[${i + 1}] (${p.path})\n${p.content}`).join("\n\n"),
    });
  }
  messages.push(...history, { role: "user", content: userMessage });

  const toolsUsed: string[] = [];
  const toolResults = new Map<string, string>();
  let webCalls = 0;
  let answer = "";
  let finished = false;

  for (let i = 0; i < config.agent.maxToolIterations; i++) {
    const res = await chat(messages, tools);
    const toolCalls = res.message.tool_calls ?? [];

    if (toolCalls.length === 0) {
      answer = res.message.content;
      finished = true;
      break;
    }

    messages.push(res.message);
    for (const call of toolCalls) {
      const name = call.function.name;
      const args = call.function.arguments;
      const key = toolCallKey(name, args);
      let output = toolResults.get(key);

      if (output !== undefined) {
        logger.info({ tool: name, role, args }, "appel d'outil dédoublonné");
      } else if (name === WEB_TOOL && !webAvailable) {
        output = "Erreur : la recherche web n'est pas disponible pour cette question, utilise les sources locales.";
      } else if (name === WEB_TOOL && webCalls >= config.webSearch.maxCalls) {
        output = "Erreur : nombre maximal de recherches web atteint, réponds avec les informations déjà obtenues.";
      } else {
        if (name === WEB_TOOL) webCalls++;
        logger.info({ tool: name, role, args }, "appel d'outil");
        output = await registry.execute(name, args, role);
        toolsUsed.push(name);
        toolResults.set(key, output);
      }
      messages.push({ role: "tool", content: output, tool_name: name });
    }
  }

  if (!finished) {
    answer = "Je n'ai pas pu terminer : le nombre maximal d'appels d'outils a été atteint.";
  }

  addMessage(db, id, { role: "user", content: userMessage });
  addMessage(db, id, { role: "assistant", content: answer });

  return { sessionId: id, answer, toolsUsed, sources };
}