import path from "path"
import { createCategoryManager } from "../managers/category.manager.js"
import { loadCommandHandlers } from "../loaders/command.loader.js"
import { loadPlugins } from "../loaders/plugin.loader.js"

const PLUGIN_ROOT = "./plugins"

const normalizeCommandText = (value) => {
  if (typeof value !== "string") return ""
  return value.trim()
}

const getCanonicalCommand = (entry) => {
  const base = (entry?.name || entry?.handler?.name || "command").replace(/^handle/, "")
  return `.${base.replace(/([a-z0-9])([A-Z])/g, "$1$2").toLowerCase()}`
}

export function createIntegratedCommandHandler(entry, runtime) {
  if (!entry || typeof entry.handler !== "function") {
    return async () => false
  }

  const originalHandler = entry.handler
  const commandName = entry.name || entry.handler.name || "command"
  const aliases = Array.isArray(entry.aliases) ? entry.aliases.slice() : []

  return async (sock, msg) => {
    const text = normalizeCommandText(msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || "")
    const ctx = {
      sock,
      msg,
      command: commandName,
      commandName,
      aliases,
      category: entry.category || "General",
      file: entry.file || null,
      config: runtime.configSnapshot || {},
      services: runtime.services || {},
      logger: runtime.logger || console,
      eventManager: runtime.eventManager,
      middlewareManager: runtime.middlewareManager,
      commandEntry: entry
    }

    try {
      runtime.logger?.info?.(`Executing command: ${commandName}`, { command: commandName, file: entry.file })
      await runtime.eventManager.emit("command.before", { command: commandName, file: entry.file, text }, ctx)
      const result = await runtime.middlewareManager.run(ctx, async () => originalHandler(sock, msg))
      await runtime.eventManager.emit("command.after", { command: commandName, file: entry.file, result }, ctx)
      return result
    } catch (error) {
      runtime.logger?.error?.(`Command failed: ${commandName}`, { command: commandName, file: entry.file, error: error?.message || error })
      await runtime.eventManager.emit("command.error", { command: commandName, file: entry.file, error }, ctx)
      return false
    }
  }
}

export function createLifecycleRuntime(runtime) {
  return {
    async loadRuntime() {
      const commandLoad = await loadCommandHandlers()
      const commandEntries = (commandLoad.entries || []).map((entry) => ({
        ...entry,
        handler: createIntegratedCommandHandler(entry, runtime),
        originalHandler: entry.handler
      }))

      runtime.commandManager.setEntries(commandEntries)
      runtime.categoryManager = createCategoryManager(commandEntries.map((entry) => ({
        name: entry.name,
        file: entry.file,
        category: entry.category || "General"
      })))
      runtime.aliasManager.setAliases(commandEntries.flatMap((entry) => entry.aliases || []))

      const pluginState = await loadPlugins(PLUGIN_ROOT, null)
      runtime.pluginManager.setState(pluginState)
      runtime.validation = commandLoad.validation
      return commandLoad.validation
    },
    createStartupSummary(validation) {
      const categoryManager = createCategoryManager(
        (validation?.discoveredFiles || []).map((file) => ({ file, name: path.basename(file, ".js") }))
      )
      const categories = categoryManager.getCategories()
      const largestCategory = categories
        .map((name) => ({ name, count: categoryManager.getCommandCount(name) }))
        .sort((a, b) => b.count - a.count)[0]
      const uncategorized = categoryManager.getCommandCount("General")
      const pluginState = runtime.pluginManager.getState()

      return {
        commandsLoaded: runtime.commandManager.getCommandCount(),
        pluginsLoaded: pluginState.loaded.length,
        pluginErrors: pluginState.errors.length,
        pluginWarnings: pluginState.warnings.length,
        categories: categories.length,
        totalCommands: categoryManager.getTotalCommands(),
        largestCategory: largestCategory?.name || "None",
        largestCategoryCount: largestCategory?.count || 0,
        uncategorized,
        errors: validation?.errors?.length || 0,
        warnings: (validation?.invalidModules?.length || 0) + (validation?.duplicateHandlers?.length || 0)
      }
    }
  }
}
