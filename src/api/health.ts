import { Router } from "express";
import { config } from "../config";
import type { Db } from "../db/connection";
import { getDb } from "../db/connection";
import { getReadonlySourceDb, SOURCE_NAMES } from "../db/sources";
import { checkOllama } from "../llm/client";

export const healthRouter = Router();

function ping(open: () => Db): boolean {
  try {
    open().prepare("SELECT 1").get();
    return true;
  } catch {
    return false;
  }
}

healthRouter.get("/health", async (_req, res) => {
  const dbOk = ping(getDb);
  const sources = Object.fromEntries(
    SOURCE_NAMES.map((name) => [name, { up: ping(() => getReadonlySourceDb(name)) }])
  );
  const sourcesOk = Object.values(sources).every((s) => s.up);

  const ollama = await checkOllama();
  const ok =
    dbOk && sourcesOk && ollama.up && ollama.chatModelInstalled && ollama.embedModelInstalled;

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    database: { up: dbOk },
    sources,
    webSearch: { enabled: Boolean(config.webSearch.searxngUrl) },
    ollama,
  });
});
