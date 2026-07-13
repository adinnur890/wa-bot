import fs from "fs"
import path from "path"
import { pathToFileURL } from "url"

const COMMAND_ROOT = "./lib/commands"
const PRIORITY = {
  "addabsen.js": 0,
  "absen.js": 1,
  "resetabsen.js": 2,
  "cn.js": 3,
  "warning.js": 4,
  "event.js": 5,
  "jadwal.js": 6,
  "premium.js": 7,
  "owner.js": 8,
  "kick.js": 9,
  "ping.js": 10,
  "info.js": 11,
  "reply.js": 12,
  "afk.js": 13,
  "grupcontrol.js": 14,
  "tagall.js": 15,
  "tiktok.js": 16,
  "menu.js": 17
}

const CATEGORY_MAP = {
  absen: "Attendance",
  addabsen: "Attendance",
  resetabsen: "Attendance",
  warning: "Moderation",
  event: "Management",
  jadwal: "Management",
  premium: "Owner",
  owner: "Owner",
  license: "Owner",
  kick: "Moderation",
  ping: "Utility",
  info: "Information",
  reply: "Utility",
  afk: "Utility",
  grupcontrol: "Group",
  tagall: "Group",
  tiktok: "Media",
  menu: "Utility",
  stiker: "Media",
  cn: "Utility"
}

const ALIAS_MAP = {
  license: [".aktif", ".ceklisensi"],
  menu: [".menu"],
  help: [".help"]
}

const toCommandName = (handlerName) => {
  if (!handlerName) return ""
  return `.${handlerName.replace(/^handle/, "").replace(/([a-z0-9])([A-Z])/g, "$1$2").toLowerCase()}`
}

const inferCategory = (file) => {
  const base = path.basename(file, ".js").toLowerCase()
  return CATEGORY_MAP[base] || "General"
}

const inferAliases = (file, handlerName) => {
  const base = path.basename(file, ".js").toLowerCase()
  const aliases = new Set(ALIAS_MAP[base] || [])
  const command = toCommandName(handlerName)
  if (command) aliases.add(command)
  return Array.from(aliases)
}

const collectFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  const files = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith(".js") && entry.name !== "index.js") {
      files.push(fullPath)
    }
  }

  return files
}

const sortFiles = (files) => files
  .map((file) => path.relative(process.cwd(), file).replace(/\\/g, "/"))
  .sort((a, b) => {
    const aName = a.split("/").pop()
    const bName = b.split("/").pop()
    return (PRIORITY[aName] ?? 1000) - (PRIORITY[bName] ?? 1000) || a.localeCompare(b)
  })

export async function loadCommandHandlers(rootDir = COMMAND_ROOT) {
  const discoveredFiles = sortFiles(collectFiles(rootDir))
  const loadedHandlers = []
  const loadedEntries = []
  const validation = {
    discoveredFiles,
    loadedHandlers: [],
    duplicateHandlers: [],
    skippedModules: [],
    invalidModules: [],
    errors: []
  }

  for (const file of discoveredFiles) {
    console.log(`[command-loader] Loading command file: ${file}`)
    try {
      const imported = await import(pathToFileURL(path.resolve(file)).href)
      const handlerNames = Object.entries(imported)
        .filter(([, value]) => typeof value === "function" && /^handle[A-Z]/.test("" + value.name))
        .map(([name]) => name)

      console.log(`[command-loader] ${file} exported handlers: ${handlerNames.join(", ") || "(none)"}`)

      if (handlerNames.length === 0) {
        validation.invalidModules.push(file)
        continue
      }

      for (const [name, value] of Object.entries(imported)) {
        const isHandler = typeof value === "function" && /^handle[A-Z]/.test(name)
        if (!isHandler) continue
        if (loadedHandlers.some((existing) => existing.name === value.name)) {
          validation.duplicateHandlers.push({ file, handler: name })
          continue
        }
        loadedHandlers.push(value)
        const aliases = inferAliases(file, name)
        loadedEntries.push({
          name: value.name || name,
          handler: value,
          file,
          aliases,
          category: inferCategory(file)
        })
        console.log(`[command-loader] Registered ${name} -> ${aliases.join(", ")}`)
        validation.loadedHandlers.push({ file, handler: name })
      }
    } catch (error) {
      validation.errors.push({ file, message: error?.message || String(error) })
    }
  }

  return { handlers: loadedHandlers, entries: loadedEntries, validation }
}
