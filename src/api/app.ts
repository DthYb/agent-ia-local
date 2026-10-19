import express, { type NextFunction, type Request, type Response } from "express";
import { logger } from "../config/logger";
import { healthRouter } from "./health";
import { chatRouter } from "./chat";
import { documentsRouter } from "./documents";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(healthRouter);
  app.use(chatRouter);
  app.use(chatRouter);
  app.use(documentsRouter);

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

  app.use(healthRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route introuvable" });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, "erreur non gérée");
    const unavailable =
      err.name === "TimeoutError" || err.name === "AbortError" || /fetch failed|ECONNREFUSED/i.test(err.message);
    if (unavailable) {
      res.status(503).json({ error: "Le modèle Ollama est indisponible ou trop lent" });
      return;
    }
    res.status(500).json({ error: "Erreur interne" });
  });

  return app;
}