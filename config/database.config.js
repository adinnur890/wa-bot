import { createConfigManager } from "../lib/managers/config.manager.js"

export const databaseConfig = createConfigManager()

databaseConfig.registerSchema("database.host", (value) => typeof value === "string", "")
databaseConfig.registerSchema("database.name", (value) => typeof value === "string", "")
databaseConfig.registerSchema("database.user", (value) => typeof value === "string", "")
databaseConfig.registerSchema("database.port", (value) => Number.isInteger(Number(value)), 3306)

export function getDatabaseConfig() {
  return databaseConfig.load()
}
