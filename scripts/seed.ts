import { closeSources, getSourceDb } from "../src/db/sources";
import { logger } from "../src/config/logger";

const contacts = [
  ["Alice Martin", "alice.martin@example.com", "Acme", "Lille"],
  ["Bruno Lefèvre", "bruno.lefevre@example.com", "Globex", "Paris"],
  ["Chloé Durand", "chloe.durand@example.com", "Initech", "Lyon"],
  ["David Petit", "david.petit@example.com", "Acme", "Lille"],
  ["Emma Roux", "emma.roux@example.com", "Umbrella", "Marseille"],
  ["Farid Benali", "farid.benali@example.com", "Globex", "Valenciennes"],
];

const produits = [
  ["Clavier mécanique", "Périphériques", 89.9, 12],
  ["Souris sans fil", "Périphériques", 29.9, 40],
  ["Écran 27 pouces", "Écrans", 249.0, 5],
  ["Casque audio", "Audio", 59.9, 18],
  ["Station d'accueil USB-C", "Accessoires", 119.0, 7],
];

const commandes = [
  ["alice.martin@example.com", "Clavier mécanique", 2, 179.8, "2026-09-02"],
  ["alice.martin@example.com", "Souris sans fil", 2, 59.8, "2026-09-02"],
  ["bruno.lefevre@example.com", "Écran 27 pouces", 1, 249.0, "2026-09-15"],
  ["chloe.durand@example.com", "Casque audio", 3, 179.7, "2026-10-01"],
  ["farid.benali@example.com", "Station d'accueil USB-C", 1, 119.0, "2026-10-08"],
  ["david.petit@example.com", "Souris sans fil", 5, 149.5, "2026-10-12"],
];

function seed(source: "crm" | "catalogue" | "ventes", table: string, sql: string, rows: unknown[][]) {
  const db = getSourceDb(source);
  const insert = db.prepare(sql);
  db.transaction(() => {
    db.exec(`DELETE FROM ${table}`);
    for (const r of rows) insert.run(...r);
  })();
  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number };
  logger.info(`Seed ${source}.${table} : ${n} lignes`);
}

seed("crm", "contacts", "INSERT INTO contacts (name, email, company, city) VALUES (?, ?, ?, ?)", contacts);
seed("catalogue", "produits", "INSERT INTO produits (nom, categorie, prix, stock) VALUES (?, ?, ?, ?)", produits);
seed(
  "ventes",
  "commandes",
  "INSERT INTO commandes (client_email, produit, quantite, montant, date_commande) VALUES (?, ?, ?, ?, ?)",
  commandes
);
closeSources();
