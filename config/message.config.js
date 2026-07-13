import { createConfigManager } from "../lib/managers/config.manager.js"

export const messageConfig = createConfigManager()

messageConfig.registerSchema("message.welcome", (value) => typeof value === "string", "Welcome")
messageConfig.registerSchema("message.goodbye", (value) => typeof value === "string", "Goodbye")
messageConfig.registerSchema("message.error", (value) => typeof value === "string", "An error occurred")

export function getMessageConfig() {
  return messageConfig.load()
}
