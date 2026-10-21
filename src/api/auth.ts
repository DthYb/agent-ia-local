import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config";
import { logger } from "../config/logger";
import type { Role } from "../auth/roles";

declare global {
    namespace Express {
        interface Request {
            role: Role;
        }
    }
}

function safeEqual(a: string, b: string): boolean {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const key = req.header("x-api-key");
    if (!key) {
        req.role = "reader";
        return next();
    }
    if (config.auth.adminKey && safeEqual(key, config.auth.adminKey)) {
        req.role = "admin";
        return next();
    }
    logger.warn({ ip: req.ip, url: req.originalUrl }, "clé API invalide");
    res.status(401).json({ error: "Clé API invalide" });
}

export function requireRole(role: Role) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (req.role !== role) {
            res.status(403).json({ error: "Droits administrateur requis" });
            return;
        }
        next();
    };
}