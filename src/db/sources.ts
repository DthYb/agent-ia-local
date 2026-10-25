import Database from "better-sqlite3";
import { config } from "../config";
import { openDb, type Db } from "./connection";

// Bases métier interrogeables par l'agent. agent.db reste réservée au fonctionnement
// interne (sessions, RAG, cache web) et n'est jamais exposée à sql_query.
export const SOURCE_NAMES = ["crm", "catalogue", "ventes"] as const;
export type SourceName = (typeof SOURCE_NAMES)[number];

interface DataSource {
  path: string;
  description: string; // vue par le modèle pour choisir la bonne base
  tables: string[]; // allowlist de sql_query
  schema: string;
}

export const DATA_SOURCES: Record<SourceName, DataSource> = {
  crm: {
    path: config.dataSources.crm,
    description: "clients et contacts : contacts(id, name, email, company, city)",
    tables: ["contacts"],
    schema: `
CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  city TEXT
);`,
  },
  catalogue: {
    path: config.dataSources.catalogue,
    description: "produits vendus : produits(id, nom, categorie, prix, stock)",
    tables: ["produits"],
    schema: `
CREATE TABLE IF NOT EXISTS produits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL UNIQUE,
  categorie TEXT,
  prix REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0
);`,
  },
  ventes: {
    path: config.dataSources.ventes,
    description:
      "commandes passées : commandes(id, client_email, produit, quantite, montant, date_commande) ; " +
      "client_email correspond à contacts.email (base crm), produit à produits.nom (base catalogue)",
    tables: ["commandes"],
    schema: `
CREATE TABLE IF NOT EXISTS commandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_email TEXT NOT NULL,
  produit TEXT NOT NULL,
  quantite INTEGER NOT NULL,
  montant REAL NOT NULL,
  date_commande TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commandes_client ON commandes(client_email);`,
  },
};

const rwInstances = new Map<SourceName, Db>();
const roInstances = new Map<SourceName, Db>();

// Connexion en écriture (outils admin, seed). Crée le fichier et les tables au besoin.
export function getSourceDb(name: SourceName): Db {
  let db = rwInstances.get(name);
  if (!db) {
    db = openDb(DATA_SOURCES[name].path);
    db.exec(DATA_SOURCES[name].schema);
    rwInstances.set(name, db);
  }
  return db;
}

// Connexion en lecture seule, utilisée par sql_query (voir ADR-3).
export function getReadonlySourceDb(name: SourceName): Db {
  let db = roInstances.get(name);
  if (!db) {
    db = new Database(DATA_SOURCES[name].path, { readonly: true, fileMustExist: true });
    roInstances.set(name, db);
  }
  return db;
}

export function migrateSources(): void {
  for (const name of SOURCE_NAMES) getSourceDb(name);
}

export function closeSources(): void {
  for (const db of [...rwInstances.values(), ...roInstances.values()]) db.close();
  rwInstances.clear();
  roInstances.clear();
}
