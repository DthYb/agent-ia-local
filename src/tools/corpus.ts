import fs from "node:fs";
import path from "node:path";
import { config } from "../config";

export const ALLOWED_EXT = new Set([".md", ".txt", ".json", ".csv"]);
export const MAX_READ_CHARS = 20000;

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
}

// Résout un chemin relatif au corpus, ou lève une erreur s'il en sort.
export function resolveInCorpus(relPath: string, root: string = config.corpusPath): string {
  if (relPath.includes("\0")) throw new Error("Chemin invalide");
  const rootReal = fs.realpathSync(root);
  const target = path.resolve(rootReal, relPath);

  if (!isInside(rootReal, target)) throw new Error("Accès refusé : chemin hors du corpus");
  if (!ALLOWED_EXT.has(path.extname(target).toLowerCase())) {
    throw new Error("Extension non autorisée (md, txt, json, csv uniquement)");
  }
  if (!fs.existsSync(target)) throw new Error("Fichier introuvable dans le corpus");

  // realpath : empêche de s'échapper via un lien symbolique
  const real = fs.realpathSync(target);
  if (!isInside(rootReal, real)) throw new Error("Accès refusé : chemin hors du corpus");
  if (!fs.statSync(real).isFile()) throw new Error("Ce chemin n'est pas un fichier");
  return real;
}

export function listCorpusFiles(root: string = config.corpusPath): string[] {
  const rootReal = fs.realpathSync(root);
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && ALLOWED_EXT.has(path.extname(entry.name).toLowerCase())) {
        out.push(path.relative(rootReal, full).split(path.sep).join("/"));
      }
    }
  };
  walk(rootReal);
  return out.sort();
}