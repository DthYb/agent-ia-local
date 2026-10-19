import { config } from "./config";
import { logger } from "./config/logger";
import { getDb } from "./db/connection";
import { migrate } from "./db/migrate";
import { createApp } from "./api/app";

migrate(getDb());

createApp().listen(config.port, () => {
  logger.info(`API démarrée sur http://localhost:${config.port}`);
});