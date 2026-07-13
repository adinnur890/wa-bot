import { createConfigManager } from "../lib/managers/config.manager.js"

export const premiumConfig = createConfigManager()

premiumConfig.registerSchema("premium.enabled", (value) => typeof value === "boolean", true)
premiumConfig.registerSchema("premium.maxDays", (value) => Number.isInteger(Number(value)), 30)

export function getPremiumConfig() {
  return premiumConfig.load()
}
