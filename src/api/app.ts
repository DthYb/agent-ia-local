import express, { type NextFunction, type Request, type Response } from "express";
import { logger } from "../config/logger";
import { authenticate } from "./auth";
import { chatRouter } from "./chat";
import { documentsRouter } from "./documents";
import { healthRouter } from "./health";

export function createApp() {
  const app = express();
  app.use(express.json());

  // log de chaque requête
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      logger.info(
        { method: req.method, url: req.originalUrl, status: res.statusCode, ms: Date.now() - start },
        "requête"
      );
    });
    next();
  });

  // détermine le rôle (reader par défaut, admin avec la bonne clé)
  app.use(authenticate);

  app.use(healthRouter);
  app.use(chatRouter);
  app.use(documentsRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route introuvable" });
  });

  app.use((err: Error & { status_code?: number }, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "erreur non gérée");

    if (err.name === "ResponseError") {
      res.status(502).json({ error: "Erreur renvoyée par Ollama", detail: err.message });
      return;
    }
    const unavailable =
      err.name === "TimeoutError" || err.name === "AbortError" || /fetch failed|ECONNREFUSED/i.test(err.message);
    if (unavailable) {
      res.status(503).json({ error: "Le modèle Ollama est indisponible ou trop lent" });
      return;
    }
    res.status(500).json({ error: "Erreur interne", detail: err.message });
  });

  return app;
}