export function createAliasManager(initialAliases = []) {
  const aliases = Array.isArray(initialAliases) ? initialAliases.slice() : []

  return {
    setAliases(newAliases) {
      aliases.splice(0, aliases.length, ...(Array.isArray(newAliases) ? newAliases : []))
    },
    getAliases() {
      return aliases.slice()
    },
    getCount() {
      return aliases.length
    }
  }
}
