import { openDb } from "../src/db/connection";
import { migrate } from "../src/db/migrate";
import { logger } from "../src/config/logger";

const db = openDb();
migrate(db);
logger.info("Base initialisée");
db.close();