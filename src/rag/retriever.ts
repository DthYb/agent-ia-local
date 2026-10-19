import { config } from "../config";
import type { Db } from "../db/connection";
import { embed } from "../llm/client";
import { cosineSimilarity, fromBlob } from "./similarity";

export interface RetrievedChunk {
  path: string;
  content: string;
  score: number;
}

// Seuil minimal de pertinence, à ajuster selon ton modèle d'embeddings
const MIN_SCORE = 0.3;

export async function retrieve(
  db: Db,
  question: string,
  topK: number = config.rag.topK
): Promise<RetrievedChunk[]> {
  const rows = db
    .prepare(
      `SELECT c.content, c.embedding, d.path
       FROM chunks c JOIN documents d ON d.id = c.document_id`
    )
    .all() as { content: string; embedding: Buffer; path: string }[];
  if (rows.length === 0) return []; // rien d'indexé : pas d'appel à Ollama

  const [q] = await embed([question]);
  return rows
    .map((r) => ({ path: r.path, content: r.content, score: cosineSimilarity(q, fromBlob(r.embedding)) }))
    .filter((r) => r.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}