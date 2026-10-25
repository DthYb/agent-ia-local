import { config } from "./config";
import { logger } from "./config/logger";
import { getDb } from "./db/connection";
import { migrate } from "./db/migrate";
import { migrateSources } from "./db/sources";
import { createApp } from "./api/app";

migrate(getDb());
migrateSources();

createApp().listen(config.port, () => {
  logger.info(`API démarrée sur http://localhost:${config.port}`);
});