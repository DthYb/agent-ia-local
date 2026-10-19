import { Router } from "express";
import { z } from "zod";
import { getDb } from "../db/connection";
import { deleteSession } from "../db/sessions";
import { runChat, SessionNotFoundError } from "../agent/orchestrator";

export const chatRouter = Router();

const chatBody = z.object({
  message: z.string().trim().min(1, "message vide").max(4000),
  sessionId: z.string().uuid().optional(),
});

chatRouter.post("/chat", async (req, res, next) => {
  const parsed = chatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Requête invalide", details: parsed.error.flatten().fieldErrors });
    return;
  }
  try {
    const result = await runChat(getDb(), parsed.data.message, parsed.data.sessionId);
    res.json(result);
  } catch (err) {
    if (err instanceof SessionNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    next(err);
  }
});

chatRouter.delete("/sessions/:id", (req, res) => {
  const deleted = deleteSession(getDb(), req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }
  res.status(204).end();
});