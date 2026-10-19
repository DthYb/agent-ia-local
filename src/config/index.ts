import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  CHAT_MODEL: z.string().min(1).default("qwen2.5:7b"),
  EMBED_MODEL: z.string().min(1).default("nomic-embed-text"),
  DB_PATH: z.string().min(1).default("./data/agent.db"),
  CORPUS_PATH: z.string().min(1).default("./corpus"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  MAX_TOOL_ITERATIONS: z.coerce.number().int().positive().default(5),
  RAG_TOP_K: z.coerce.number().int().positive().default(4),
  CHUNK_SIZE: z.coerce.number().int().positive().default(800),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(100),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Configuration invalide :", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
const env = parsed.data;

export const config = {
  port: env.PORT,
  ollama: {
    url: env.OLLAMA_URL,
    chatModel: env.CHAT_MODEL,
    embedModel: env.EMBED_MODEL,
    timeoutMs: env.LLM_TIMEOUT_MS,
  },
  db: { path: path.resolve(env.DB_PATH) },
  corpusPath: path.resolve(env.CORPUS_PATH),
  agent: { maxToolIterations: env.MAX_TOOL_ITERATIONS },
  rag: {
    topK: env.RAG_TOP_K,
    chunkSize: env.CHUNK_SIZE,
    chunkOverlap: env.CHUNK_OVERLAP,
  },
} as const;