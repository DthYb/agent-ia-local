import { randomUUID } from "node:crypto";
import type { Db } from "./connection";

export interface StoredMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: string | null;
  tool_name?: string | null;
}

export function createSession(db: Db): string {
  const id = randomUUID();
  db.prepare("INSERT INTO sessions (id) VALUES (?)").run(id);
  return id;
}

export function sessionExists(db: Db, id: string): boolean {
  return !!db.prepare("SELECT 1 FROM sessions WHERE id = ?").get(id);
}

export function addMessage(db: Db, sessionId: string, msg: StoredMessage): void {
  db.prepare(
    `INSERT INTO messages (session_id, role, content, tool_calls, tool_name)
     VALUES (?, ?, ?, ?, ?)`
  ).run(sessionId, msg.role, msg.content, msg.tool_calls ?? null, msg.tool_name ?? null);
  db.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(sessionId);
}

export function getMessages(db: Db, sessionId: string): StoredMessage[] {
  return db
    .prepare(
      `SELECT role, content, tool_calls, tool_name
       FROM messages WHERE session_id = ? ORDER BY id`
    )
    .all(sessionId) as StoredMessage[];
}

export function deleteSession(db: Db, id: string): boolean {
  return db.prepare("DELETE FROM sessions WHERE id = ?").run(id).changes > 0;
}