import { createConfigManager } from "../lib/managers/config.manager.js"

export const apiConfig = createConfigManager()

apiConfig.registerSchema("api.youtube", (value) => typeof value === "string", "")
apiConfig.registerSchema("api.gemini", (value) => typeof value === "string", "")
apiConfig.registerSchema("api.openai", (value) => typeof value === "string", "")

export function getApiConfig() {
  return apiConfig.load()
}
