import { createConfigManager } from "../lib/managers/config.manager.js"

export const securityConfig = createConfigManager()

securityConfig.registerSchema("security.rateLimit", (value) => Number.isInteger(Number(value)), 20)
securityConfig.registerSchema("security.encryption", (value) => typeof value === "boolean", true)

export function getSecurityConfig() {
  return securityConfig.load()
}
