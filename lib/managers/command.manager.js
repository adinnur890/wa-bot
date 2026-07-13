export function createCommandManager(initialHandlers = []) {
  let entries = []

  const normalizeEntry = (command, index) => {
    if (!command) return null

    if (typeof command === "function") {
      return {
        name: command.name || `command_${index + 1}`,
        handler: command,
        originalHandler: command,
        aliases: [],
        category: "General",
        file: null,
        enabled: true
      }
    }

    if (typeof command === "object" && typeof command.handler === "function") {
      return {
        name: command.name || command.handler.name || `command_${index + 1}`,
        handler: command.handler,
        originalHandler: command.handler,
        aliases: Array.isArray(command.aliases) ? command.aliases.slice() : [],
        category: command.category || "General",
        file: command.file || null,
        enabled: command.enabled !== false
      }
    }

    return null
  }

  const register = (command) => {
    const normalized = normalizeEntry(command, entries.length)
    if (!normalized) return null
    entries.push(normalized)
    return normalized
  }

  ;(Array.isArray(initialHandlers) ? initialHandlers : []).forEach((command) => register(command))

  return {
    registerCommand(command) {
      return register(command)
    },
    setHandlers(newHandlers) {
      entries = (Array.isArray(newHandlers) ? newHandlers : [])
        .map((command, index) => normalizeEntry(command, index))
        .filter(Boolean)
    },
    setEntries(newEntries) {
      entries = (Array.isArray(newEntries) ? newEntries : [])
        .map((command, index) => normalizeEntry(command, index))
        .filter(Boolean)
    },
    getHandlers() {
      return entries.filter((entry) => entry.enabled).map((entry) => entry.handler)
    },
    getRegisteredCommands() {
      return entries.slice()
    },
    findByName(name) {
      if (!name) return null
      const target = String(name).toLowerCase()
      return entries.find((entry) => {
        const names = [entry.name, ...(entry.aliases || [])]
        return names.some((value) => String(value).toLowerCase() === target)
      }) || null
    },
    getCommandCount() {
      return entries.length
    }
  }
}
