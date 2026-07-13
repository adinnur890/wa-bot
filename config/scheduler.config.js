import { createConfigManager } from "../lib/managers/config.manager.js"

export const schedulerConfig = createConfigManager()

schedulerConfig.registerSchema("scheduler.enabled", (value) => typeof value === "boolean", true)
schedulerConfig.registerSchema("scheduler.interval", (value) => Number.isInteger(Number(value)), 60000)

export function getSchedulerConfig() {
  return schedulerConfig.load()
}
