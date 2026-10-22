import "dotenv/config";
import path from "node:path";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),
  CHAT_MODEL: z.string().min(1).default("qwen2.5:7b"),
  EMBED_MODEL: z.string().min(1).default("nomic-embed-text"),
  DB_PATH: z.string().min(1).default("./data/agent.db"),
  CRM_DB_PATH: z.string().min(1).default("./data/crm.db"),
  CATALOGUE_DB_PATH: z.string().min(1).default("./data/catalogue.db"),
  VENTES_DB_PATH: z.string().min(1).default("./data/ventes.db"),
  CORPUS_PATH: z.string().min(1).default("./corpus"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60000),
  MAX_TOOL_ITERATIONS: z.coerce.number().int().positive().default(5),
  RAG_TOP_K: z.coerce.number().int().positive().default(4),
  CHUNK_SIZE: z.coerce.number().int().positive().default(800),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(100),
  API_KEY_ADMIN: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().min(16).optional()
  ),
  // Recherche web : désactivée tant que SEARXNG_URL n'est pas renseignée
  SEARXNG_URL: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
  WEB_SEARCH_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  WEB_SEARCH_MAX_CALLS: z.coerce.number().int().nonnegative().default(2),
  WEB_SEARCH_SKIP_SCORE: z.coerce.number().min(0).max(1).default(0.6),
  WEB_CACHE_TTL_HOURS: z.coerce.number().int().nonnegative().default(24),
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
  dataSources: {
    crm: path.resolve(env.CRM_DB_PATH),
    catalogue: path.resolve(env.CATALOGUE_DB_PATH),
    ventes: path.resolve(env.VENTES_DB_PATH),
  },
  corpusPath: path.resolve(env.CORPUS_PATH),
  agent: { maxToolIterations: env.MAX_TOOL_ITERATIONS },
  rag: {
    topK: env.RAG_TOP_K,
    chunkSize: env.CHUNK_SIZE,
    chunkOverlap: env.CHUNK_OVERLAP,
  },
  auth: { adminKey: env.API_KEY_ADMIN },
  webSearch: {
    searxngUrl: env.SEARXNG_URL,
    timeoutMs: env.WEB_SEARCH_TIMEOUT_MS,
    maxCalls: env.WEB_SEARCH_MAX_CALLS,
    skipScore: env.WEB_SEARCH_SKIP_SCORE,
    cacheTtlHours: env.WEB_CACHE_TTL_HOURS,
  },
} as const;