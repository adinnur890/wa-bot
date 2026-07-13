import { createConfigManager } from "../lib/managers/config.manager.js"

export const themeConfig = createConfigManager()

themeConfig.registerSchema("theme.color", (value) => typeof value === "string" && value.length > 0, "#00bcd4")
themeConfig.registerSchema("theme.mode", (value) => typeof value === "string" && value.length > 0, "dark")

export function getThemeConfig() {
  return themeConfig.load()
}
