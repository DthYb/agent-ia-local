import { Router } from "express";
import { getDb } from "../db/connection";
import { checkOllama } from "../llm/client";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res) => {
  let dbOk = false;
  try {
    getDb().prepare("SELECT 1").get();
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const ollama = await checkOllama();
  const ok = dbOk && ollama.up && ollama.chatModelInstalled && ollama.embedModelInstalled;

  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    database: { up: dbOk },
    ollama,
  });
});