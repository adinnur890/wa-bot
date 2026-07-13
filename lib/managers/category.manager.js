import path from "path"

const CATEGORY_FALLBACK = "General"

const normalizeCategory = (value) => {
  if (!value || typeof value !== "string") return CATEGORY_FALLBACK
  const trimmed = value.trim()
  return trimmed || CATEGORY_FALLBACK
}

const inferCategory = (entry) => {
  if (!entry) return CATEGORY_FALLBACK

  if (typeof entry === "string") {
    return CATEGORY_FALLBACK
  }

  if (entry.category && typeof entry.category === "string") {
    return normalizeCategory(entry.category)
  }

  if (entry.metadata && entry.metadata.category && typeof entry.metadata.category === "string") {
    return normalizeCategory(entry.metadata.category)
  }

  return CATEGORY_FALLBACK
}

export function createCategoryManager(commandEntries = []) {
  const registry = new Map()

  const register = (commandName, entry) => {
    const normalizedCategory = normalizeCategory(inferCategory(entry))
    if (!registry.has(normalizedCategory)) {
      registry.set(normalizedCategory, [])
    }
    registry.get(normalizedCategory).push({
      name: commandName,
      file: entry.file || entry,
      category: normalizedCategory
    })
  }

  for (const entry of commandEntries) {
    const commandName = entry.name || path.basename(entry.file || entry, ".js")
    register(commandName, entry)
  }

  return {
    getCategories() {
      return Array.from(registry.keys()).sort((a, b) => a.localeCompare(b))
    },
    getCommands(category) {
      const key = normalizeCategory(category)
      return (registry.get(key) || []).slice()
    },
    getCommandCount(category) {
      return this.getCommands(category).length
    },
    getTotalCommands() {
      return Array.from(registry.values()).reduce((sum, list) => sum + list.length, 0)
    },
    getRegistry() {
      return registry
    }
  }
}
