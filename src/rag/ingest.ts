import fs from "node:fs";
import { createHash } from "node:crypto";
import { config } from "../config";
import { logger } from "../config/logger";
import type { Db } from "../db/connection";
import { embed } from "../llm/client";
import { listCorpusFiles, resolveInCorpus } from "../tools/corpus";
import { chunkText } from "./chunking";
import { toBlob } from "./similarity";

export class IngestPathError extends Error { }

export interface IngestResult {
  path: string;
  status: "indexed" | "unchanged" | "empty";
  chunks: number;
}

// On ne résout que parmi les fichiers réellement présents dans le corpus :
// un chemin hors corpus ne peut donc jamais correspondre.
function resolveTargets(relPath: string): string[] {
  const all = listCorpusFiles();
  const norm = relPath.replace(/\\/g, "/").replace(/^\.?\/*/, "").replace(/\/+$/, "");
  if (norm === "") return all;
  if (all.includes(norm)) return [norm];
  const dir = all.filter((f) => f.startsWith(norm + "/"));
  if (dir.length) return dir;
  throw new IngestPathError(`Chemin introuvable dans le corpus : ${relPath}`);
}

export async function ingestPath(db: Db, relPath: string): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  for (const file of resolveTargets(relPath)) {
    const content = fs.readFileSync(resolveInCorpus(file), "utf8");
    const hash = createHash("sha256").update(content).digest("hex");

    const existing = db
      .prepare("SELECT id, hash, chunk_count FROM documents WHERE path = ?")
      .get(file) as { id: number; hash: string; chunk_count: number } | undefined;

    if (existing && existing.hash === hash) {
      results.push({ path: file, status: "unchanged", chunks: existing.chunk_count });
      continue;
    }

    const chunks = chunkText(content, config.rag.chunkSize, config.rag.chunkOverlap);
    if (chunks.length === 0) {
      results.push({ path: file, status: "empty", chunks: 0 });
      continue;
    }

    const vectors: number[][] = [];
    for (let i = 0; i < chunks.length; i += 16) {
      vectors.push(...(await embed(chunks.slice(i, i + 16))));
    }

    db.transaction(() => {
      if (existing) db.prepare("DELETE FROM documents WHERE id = ?").run(existing.id); // cascade sur chunks
      const { lastInsertRowid } = db
        .prepare("INSERT INTO documents (path, hash, chunk_count) VALUES (?, ?, ?)")
        .run(file, hash, chunks.length);
      const insert = db.prepare(
        "INSERT INTO chunks (document_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?)"
      );
      chunks.forEach((c, i) => insert.run(lastInsertRowid, i, c, toBlob(vectors[i])));
    })();

    logger.info({ file, chunks: chunks.length }, "document indexé");
    results.push({ path: file, status: "indexed", chunks: chunks.length });
  }
  return results;
}