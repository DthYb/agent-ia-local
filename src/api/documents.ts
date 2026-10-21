import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/connection";
import { IngestPathError, ingestPath } from "../rag/ingest";
import { requireRole } from "./auth";

export const documentsRouter = Router();

const ingestBody = z.object({ path: z.string().max(300).default(".") });

documentsRouter.post("/ingest", requireRole("admin"), async (req, res, next) => {
  const parsed = ingestBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Requête invalide", details: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    const results = await ingestPath(getDb(), parsed.data.path);
    res.json({ results });
  } catch (err) {
    if (err instanceof IngestPathError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

documentsRouter.get("/documents", (_req, res) => {
  const documents = getDb()
    .prepare("SELECT path, chunk_count AS chunks, indexed_at AS indexedAt FROM documents ORDER BY path")
    .all();
  res.json({ documents });
});