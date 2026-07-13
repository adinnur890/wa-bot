import { createConfigManager } from "../lib/managers/config.manager.js"

export const licenseConfig = createConfigManager()

licenseConfig.registerSchema("license.enabled", (value) => typeof value === "boolean", true)
licenseConfig.registerSchema("license.mode", (value) => typeof value === "string" && value.length > 0, "standard")

export function getLicenseConfig() {
  return licenseConfig.load()
}
