import { createConfigManager } from "../lib/managers/config.manager.js"

export const botConfig = createConfigManager()

botConfig.registerSchema("bot.name", (value) => typeof value === "string" && value.length > 0, "NOVA")
botConfig.registerSchema("bot.prefix", (value) => typeof value === "string" && value.length > 0, ".")
botConfig.registerSchema("bot.mode", (value) => typeof value === "string" && value.length > 0, "production")

export function getBotConfig() {
  return botConfig.load()
}
