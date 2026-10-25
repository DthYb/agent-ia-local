import { openDb } from "../src/db/connection";
import { migrate } from "../src/db/migrate";
import { closeSources, migrateSources } from "../src/db/sources";
import { logger } from "../src/config/logger";

const db = openDb();
migrate(db);
migrateSources();
logger.info("Bases initialisées (agent, crm, catalogue, ventes)");
db.close();
closeSources();
