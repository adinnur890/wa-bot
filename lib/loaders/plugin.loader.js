import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"

const PLUGIN_ROOT = "./plugins"

export async function loadPlugins(rootDir = PLUGIN_ROOT, client = null) {
  const results = {
    loaded: [],
    errors: [],
    warnings: []
  }

  if (!fs.existsSync(rootDir)) {
    return results
  }

  const collectFiles = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
    const files = []

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        files.push(...collectFiles(fullPath))
      } else if (entry.isFile() && entry.name.endsWith(".js")) {
        files.push(fullPath)
      }
    }

    return files
  }

  const pluginFiles = collectFiles(rootDir)
    .map((file) => path.relative(process.cwd(), file).replace(/\\/g, "/"))

  const pluginNames = new Set()

  for (const file of pluginFiles) {
    try {
      const imported = await import(pathToFileURL(path.resolve(file)).href)
      const plugin = imported.default || imported.plugin || imported
      if (!plugin || typeof plugin !== "object") {
        results.warnings.push({ file, reason: "invalid plugin export" })
        continue
      }

      const pluginName = plugin.name || path.basename(file, ".js")
      if (!pluginName || pluginNames.has(pluginName)) {
        results.warnings.push({ file, reason: pluginName ? `duplicate name: ${pluginName}` : "missing name" })
        continue
      }

      pluginNames.add(pluginName)
      if (typeof plugin.load === "function") {
        await plugin.load(client)
      }
      results.loaded.push({ file, name: pluginName, version: plugin.version || "unknown" })
    } catch (error) {
      results.errors.push({ file, message: error?.message || String(error) })
    }
  }

  return results
}
