import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config";

export type Db = Database.Database;

export function openDb(dbPath: string = config.db.path): Db {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  return db;
}

let instance: Db | null = null;

export function getDb(): Db {
  if (!instance) instance = openDb();
  return instance;
}

let roInstance: Db | null = null;

// Connexion distincte, ouverte en lecture seule : même si la validation du SQL
// avait un trou, SQLite refuserait toute écriture.
export function getReadonlyDb(): Db {
  if (!roInstance) {
    roInstance = new Database(config.db.path, { readonly: true, fileMustExist: true });
  }
  return roInstance;
}