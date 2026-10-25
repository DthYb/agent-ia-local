import { z } from "zod";
import { DATA_SOURCES, getReadonlySourceDb, SOURCE_NAMES } from "../db/sources";
import { defineTool } from "./types";

const MAX_ROWS = 50;

const FORBIDDEN = new Set([
  "insert", "update", "delete", "drop", "alter", "create", "replace",
  "attach", "detach", "pragma", "vacuum", "reindex", "truncate",
]);

// Fonction pure (facile à tester) : renvoie la requête nettoyée ou lève une erreur.
export function validateReadOnlySql(sql: string, knownTables: string[], allowed: string[]): string {
  const q = sql.trim().replace(/;+\s*$/, "");
  if (!q) throw new Error("Requête vide");
  if (q.length > 1000) throw new Error("Requête trop longue");
  if (q.includes(";")) throw new Error("Une seule instruction est autorisée");
  if (/--|\/\*/.test(q)) throw new Error("Les commentaires SQL sont interdits");
  if (!/^select\b/i.test(q)) throw new Error("Seules les requêtes SELECT sont autorisées");

  const withoutStrings = q.replace(/'(?:[^']|'')*'/g, "''");
  const tokens = withoutStrings.toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? [];
  const known = knownTables.map((t) => t.toLowerCase());
  const ok = allowed.map((t) => t.toLowerCase());

  for (const t of tokens) {
    if (FORBIDDEN.has(t)) throw new Error(`Mot-clé interdit : ${t}`);
    if (t.startsWith("sqlite_")) throw new Error("Accès aux tables système interdit");
    if (known.includes(t) && !ok.includes(t)) throw new Error(`Table non autorisée : ${t}`);
  }
  return q;
}

export const sqlQueryTool = defineTool({
  name: "sql_query",
  access: "read",
  description:
    "Exécute une requête SQL SELECT en lecture seule sur UNE des bases métier. " +
    "Choisis la base qui contient l'information : " +
    SOURCE_NAMES.map((n) => `${n} = ${DATA_SOURCES[n].description}`).join(" | ") +
    ". Pas de jointure entre bases : fais une requête par base si nécessaire. Maximum 50 lignes renvoyées.",
  parameters: z.object({
    database: z.enum(SOURCE_NAMES).describe("La base à interroger"),
    query: z.string().describe("Une requête SELECT, par exemple SELECT * FROM contacts WHERE city = 'Lille'"),
  }),
  execute: ({ database, query }) => {
    const db = getReadonlySourceDb(database);
    const known = (
      db.prepare("SELECT name FROM sqlite_master WHERE type IN ('table','view')").all() as { name: string }[]
    ).map((r) => r.name);

    const safe = validateReadOnlySql(query, known, DATA_SOURCES[database].tables);
    const stmt = db.prepare(safe);
    if (!stmt.reader || !stmt.readonly) throw new Error("Requête non autorisée");

    const rows: unknown[] = [];
    let truncated = false;
    for (const row of stmt.iterate()) {
      if (rows.length >= MAX_ROWS) {
        truncated = true;
        break;
      }
      rows.push(row);
    }
    return JSON.stringify({ database, rows, truncated });
  },
});
