import { createConfigManager } from "../lib/managers/config.manager.js"

export const ownerConfig = createConfigManager()

ownerConfig.registerSchema("owner.number", (value) => typeof value === "string" && value.length > 0, "")
ownerConfig.registerSchema("owner.id", (value) => typeof value === "string" && value.length > 0, "")
ownerConfig.registerSchema("owner.super", (value) => typeof value === "string" && value.length > 0, "")

export function getOwnerConfig() {
  return ownerConfig.load()
}
