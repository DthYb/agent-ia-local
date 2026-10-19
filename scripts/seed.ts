import { openDb } from "../src/db/connection";
import { migrate } from "../src/db/migrate";
import { logger } from "../src/config/logger";

const contacts = [
  ["Alice Martin", "alice.martin@example.com", "Acme", "Lille"],
  ["Bruno Lefèvre", "bruno.lefevre@example.com", "Globex", "Paris"],
  ["Chloé Durand", "chloe.durand@example.com", "Initech", "Lyon"],
  ["David Petit", "david.petit@example.com", "Acme", "Lille"],
  ["Emma Roux", "emma.roux@example.com", "Umbrella", "Marseille"],
  ["Farid Benali", "farid.benali@example.com", "Globex", "Valenciennes"],
];

const db = openDb();
migrate(db);

const insert = db.prepare(
  "INSERT INTO contacts (name, email, company, city) VALUES (?, ?, ?, ?)"
);
const seed = db.transaction(() => {
  db.exec("DELETE FROM contacts");
  for (const c of contacts) insert.run(...c);
});
seed();

const { n } = db.prepare("SELECT COUNT(*) AS n FROM contacts").get() as { n: number };
logger.info(`Seed terminé : ${n} contacts`);
db.close();