import type { Message } from "ollama";
import type { Db } from "../db/connection";
import { addMessage, createSession, getMessages, sessionExists } from "../db/sessions";
import { chat } from "../llm/client";

const SYSTEM_PROMPT =
  "Tu es un assistant utile et concis. Réponds en français sauf demande contraire.";

export interface ChatResult {
  sessionId: string;
  answer: string;
  toolsUsed: string[];
  sources: string[];
}

export class SessionNotFoundError extends Error { }

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

  const messages: Message[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: userMessage },
  ];

  const res = await chat(messages);
  const answer = res.message.content;

  addMessage(db, id, { role: "user", content: userMessage });
  addMessage(db, id, { role: "assistant", content: answer });

  return { sessionId: id, answer, toolsUsed: [], sources: [] };
}