import type { Message } from "ollama";
import { config } from "../config";
import { logger } from "../config/logger";
import type { Db } from "../db/connection";
import { addMessage, createSession, getMessages, sessionExists } from "../db/sessions";
import { chat } from "../llm/client";
import { retrieve } from "../rag/retriever";
import { createRegistry } from "../tools";

const SYSTEM_PROMPT =
  "Tu es un assistant utile et concis. Réponds en français sauf demande contraire. " +
  "Utilise les outils au lieu de deviner : calculator pour les calculs, " +
  "list_documents et read_document pour les documents du corpus, " +
  "sql_query pour interroger la table contacts. " +
  "Si un outil renvoie une erreur, explique-la honnêtement à l'utilisateur.";

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
  sessionId?: string
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

  const messages: Message[] = [{ role: "system", content: SYSTEM_PROMPT }];
  if (passages.length > 0) {
    messages.push({
      role: "system",
      content:
        "Extraits pertinents du corpus. Appuie-toi dessus pour répondre et cite le nom du fichier :\n\n" +
        passages.map((p, i) => `[${i + 1}] (${p.path})\n${p.content}`).join("\n\n"),
    });
  }
  messages.push(...history, { role: "user", content: userMessage });

  // Boucle d'outils bornée
  const tools = registry.toOllamaTools();
  const toolsUsed: string[] = [];
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
      logger.info({ tool: name, args: call.function.arguments }, "appel d'outil");
      const output = await registry.execute(name, call.function.arguments);
      toolsUsed.push(name);
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