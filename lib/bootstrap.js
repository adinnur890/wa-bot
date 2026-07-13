import fs from "fs"
import { createCommandManager } from "./managers/command.manager.js"
import { createPluginManager } from "./managers/plugin.manager.js"
import { createCategoryManager } from "./managers/category.manager.js"
import { createAliasManager } from "./managers/alias.manager.js"
import { createMiddlewareManager } from "./managers/middleware.manager.js"
import { createEventManager } from "./managers/event.manager.js"
import { createConfigManager } from "./managers/config.manager.js"
import { createLogger, logger as baseLogger } from "./logger/logger.js"
import { WeatherService } from "./services/weather.service.js"
import { ownerMiddleware } from "./middlewares/owner.middleware.js"
import { createAuthRuntime } from "./runtime/auth.runtime.js"
import { createConnectionRuntime } from "./runtime/connection.runtime.js"
import { createLifecycleRuntime } from "./runtime/lifecycle.runtime.js"

import { handleLicense, isGroupLicensed } from "./commands/license.js"
import { handleOwner, initSuperOwner } from "./commands/owner.js"
import { handleWelcomeMember, handleWelcomeCommand } from "./handlers/welcome.js"
import { handleLeaveMember, handleLeaveCommand } from "./handlers/leave.js"
import { handleAutoKick } from "./handlers/autokick.js"
import { handleAntispamCommand, handleAntispamStiker } from "./handlers/antispam.js"
import { handleBotReply } from "./handlers/botreply.js"
import { handleAntiKataCommand, handleAntiKata } from "./handlers/antikata.js"
import { getBotConfig } from "../config/bot.config.js"
import { getOwnerConfig } from "../config/owner.config.js"
import { getApiConfig } from "../config/api.config.js"
import { getDatabaseConfig } from "../config/database.config.js"
import { getThemeConfig } from "../config/theme.config.js"
import { getMessageConfig } from "../config/message.config.js"
import { getPremiumConfig } from "../config/premium.config.js"
import { getLicenseConfig } from "../config/license.config.js"
import { getSecurityConfig } from "../config/security.config.js"
import { getSchedulerConfig } from "../config/scheduler.config.js"

const WHITELIST_FILE = "./database/whitelist.json"
const SKIP_WELCOME_LEAVE = ["120363406873472137@g.us"]

const loadWhitelist = () => {
  try {
    if (!fs.existsSync(WHITELIST_FILE)) return []
    return JSON.parse(fs.readFileSync(WHITELIST_FILE, "utf-8")) || []
  } catch {
    return []
  }
}

const saveWhitelist = (list) => {
  try {
    fs.writeFileSync(WHITELIST_FILE, JSON.stringify(list, null, 2))
  } catch {}
}

const isWhitelisted = (groupId) => loadWhitelist().includes(groupId)
const isGroup = (jid) => jid.endsWith("@g.us")

const buildConfigSnapshot = () => ({
  bot: getBotConfig(),
  owner: getOwnerConfig(),
  api: getApiConfig(),
  database: getDatabaseConfig(),
  theme: getThemeConfig(),
  message: getMessageConfig(),
  premium: getPremiumConfig(),
  license: getLicenseConfig(),
  security: getSecurityConfig(),
  scheduler: getSchedulerConfig()
})

export function initializeConfig() {
  const logger = createLogger({ prefix: "NOVA" })
  const eventManager = createEventManager({ logger })
  const middlewareManager = createMiddlewareManager({ logger })
  const configManager = createConfigManager()
  const services = { weather: new WeatherService() }
  const authRuntime = createAuthRuntime()
  const runtime = {
    commandManager: createCommandManager(),
    pluginManager: createPluginManager(),
    categoryManager: createCategoryManager(),
    aliasManager: createAliasManager(),
    middlewareManager,
    eventManager,
    configManager,
    logger,
    services,
    authRuntime,
    lifecycleRuntime: null,
    configSnapshot: buildConfigSnapshot(),
    validation: null
  }

  runtime.lifecycleRuntime = createLifecycleRuntime(runtime)
  return runtime
}

export function loadManagers(runtime) {
  if (!runtime) return null
  if (!runtime.commandManager) runtime.commandManager = createCommandManager()
  if (!runtime.pluginManager) runtime.pluginManager = createPluginManager()
  if (!runtime.categoryManager) runtime.categoryManager = createCategoryManager()
  if (!runtime.aliasManager) runtime.aliasManager = createAliasManager()
  if (!runtime.middlewareManager) runtime.middlewareManager = createMiddlewareManager({ logger: runtime.logger || baseLogger })
  if (!runtime.eventManager) runtime.eventManager = createEventManager({ logger: runtime.logger || baseLogger })
  if (!runtime.configManager) runtime.configManager = createConfigManager()
  if (!runtime.logger) runtime.logger = createLogger({ prefix: "NOVA" })
  if (!runtime.services) runtime.services = { weather: new WeatherService() }
  if (!runtime.authRuntime) runtime.authRuntime = createAuthRuntime()
  if (!runtime.lifecycleRuntime) runtime.lifecycleRuntime = createLifecycleRuntime(runtime)
  if (!runtime.configSnapshot) runtime.configSnapshot = buildConfigSnapshot()

  if (!runtime.middlewareManager.middlewares?.has?.(ownerMiddleware.name)) {
    runtime.middlewareManager.register(ownerMiddleware)
  }

  return runtime
}

export async function loadLoaders(runtime) {
  if (!runtime) return null
  const lifecycleRuntime = runtime.lifecycleRuntime || createLifecycleRuntime(runtime)
  runtime.lifecycleRuntime = lifecycleRuntime
  return lifecycleRuntime.loadRuntime()
}

export function createStartupSummary(runtime, validation) {
  const lifecycleRuntime = runtime.lifecycleRuntime || createLifecycleRuntime(runtime)
  runtime.lifecycleRuntime = lifecycleRuntime
  return lifecycleRuntime.createStartupSummary(validation)
}

export async function startBot(runtime, validation) {
  const authRuntime = runtime.authRuntime || createAuthRuntime()
  const lifecycleRuntime = runtime.lifecycleRuntime || createLifecycleRuntime(runtime)
  runtime.authRuntime = authRuntime
  runtime.lifecycleRuntime = lifecycleRuntime
  const summary = lifecycleRuntime.createStartupSummary(validation)

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━")
  console.log("NOVA Framework Boot")
  console.log("━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`Commands Loaded : ${summary.commandsLoaded}`)
  console.log(`Plugins Loaded  : ${summary.pluginsLoaded}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━")
  console.log("Category Manager")
  console.log("━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`Categories : ${summary.categories}`)
  console.log(`Commands : ${summary.totalCommands}`)
  console.log(`Largest Category : ${summary.largestCategory} (${summary.largestCategoryCount})`)
  console.log(`Uncategorized : ${summary.uncategorized}`)
  console.log(`Plugin Errors   : ${summary.pluginErrors}`)
  console.log(`Plugin Warnings : ${summary.pluginWarnings}`)
  console.log(`Aliases Loaded  : ${runtime.aliasManager.getCount()}`)
  console.log(`Handlers Loaded : ${runtime.commandManager.getCommandCount()}`)
  console.log(`Events Loaded   : 1`)
  console.log(`Errors          : ${summary.errors}`)
  console.log(`Warnings        : ${summary.warnings}`)
  console.log("━━━━━━━━━━━━━━━━━━━━━━\n")

  if (validation?.errors?.length) {
    console.log("Loader errors:")
    validation.errors.forEach(({ file, message }) => console.log(`- ${file}: ${message}`))
  }

  if (validation?.invalidModules?.length || validation?.duplicateHandlers?.length) {
    console.log("Loader validation warnings:")
    validation.invalidModules.forEach((file) => console.log(`- Invalid module: ${file}`))
    validation.duplicateHandlers.forEach(({ file, handler }) => console.log(`- Duplicate handler: ${file} -> ${handler}`))
  }

  const pluginState = runtime.pluginManager.getState()
  if (pluginState.errors.length) {
    console.log("Plugin load errors:")
    pluginState.errors.forEach(({ file, message }) => console.log(`- ${file}: ${message}`))
  }

  if (pluginState.warnings.length) {
    console.log("Plugin load warnings:")
    pluginState.warnings.forEach(({ file, reason }) => console.log(`- ${file}: ${reason}`))
  }

  const sock = await createConnectionRuntime(runtime, {
    authRuntime,
    question: authRuntime.question,
    initSuperOwner,
    startBot: (rt) => startBot(rt, validation)
  })

  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    if (action === "add") {
      if (!SKIP_WELCOME_LEAVE.includes(id)) await handleWelcomeMember(sock, id, participants)
    } else if (action === "remove") {
      if (!SKIP_WELCOME_LEAVE.includes(id)) await handleLeaveMember(sock, id, participants)
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return
    if (msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

    await handleAntispamStiker(sock, msg)
    await handleAntiKata(sock, msg)

    if (isGroup(from)) {
      const isWelcomeCmd = await handleWelcomeCommand(sock, msg, text)
      const isLeaveCmd = await handleLeaveCommand(sock, msg, text)
      const isAntispamCmd = await handleAntispamCommand(sock, msg, text)
      const isAntiKataCmd = await handleAntiKataCommand(sock, msg, text)
      const isBotReply = await handleBotReply(sock, msg)
      if (isWelcomeCmd || isLeaveCmd || isAntispamCmd || isAntiKataCmd || isBotReply) return

      const skipCheck = [".aktif", ".ceklisensi", ".menu", ".help", ".whitelist"]
      const isSkip = skipCheck.some((cmd) => text.toLowerCase().trim().startsWith(cmd))
      if (!isSkip && !isWhitelisted(from) && !isGroupLicensed(from)) {
        if (text.toLowerCase().trim().startsWith(".")) {
          try {
            await sock.sendMessage(from, { text: "⚠️ Lisensi grup ini belum aktif atau sudah expired.\n\nHubungi owner untuk aktivasi.\nKetik .aktif <key> setelah mendapat key dari owner." })
          } catch {}
        }
        return
      }

      if (text.toLowerCase().trim().startsWith(".whitelist")) {
        const ownerData = fs.existsSync("./database/owner.json") ? JSON.parse(fs.readFileSync("./database/owner.json", "utf-8")) : {}
        const sender = msg.key.participant || from
        const isOwner = ownerData.superOwner === sender || ownerData.owners?.includes(sender)
        if (!isOwner) {
          try { await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }) } catch {}
          return
        }
        const args = text.trim().split(" ")
        const sub = args[1]?.toLowerCase()
        const list = loadWhitelist()
        if (sub === "add") {
          if (list.includes(from)) {
            try { await sock.sendMessage(from, { text: "✅ Grup ini sudah ada di whitelist." }, { quoted: msg }) } catch {}
          } else {
            list.push(from)
            saveWhitelist(list)
            try { await sock.sendMessage(from, { text: `✅ Grup *${from}* ditambahkan ke whitelist.\nGrup ini sekarang bebas lisensi.` }, { quoted: msg }) } catch {}
          }
        } else if (sub === "del") {
          const newList = list.filter((id) => id !== from)
          saveWhitelist(newList)
          try { await sock.sendMessage(from, { text: `✅ Grup *${from}* dihapus dari whitelist.` }, { quoted: msg }) } catch {}
        } else if (sub === "list") {
          if (!list.length) {
            try { await sock.sendMessage(from, { text: "❌ Belum ada grup di whitelist." }) } catch {}
          } else {
            try { await sock.sendMessage(from, { text: `📋 *Whitelist Grup:*\n${list.map((id, i) => `${i + 1}. ${id}`).join("\n")}` }, { quoted: msg }) } catch {}
          }
        } else {
          try { await sock.sendMessage(from, { text: "❌ Format:\n.whitelist add — tambah grup ini\n.whitelist del — hapus grup ini\n.whitelist list — lihat daftar" }, { quoted: msg }) } catch {}
        }
        return
      }
    }

    for (const handler of runtime.commandManager.getHandlers()) {
      try {
        const result = await handler(sock, msg)
        if (result === true) break
      } catch (error) {
        console.log("Handler error:", error?.message || error)
      }
    }
  })
}

export async function bootstrap() {
  const runtime = initializeConfig()
  loadManagers(runtime)
  const validation = await loadLoaders(runtime)
  await startBot(runtime, validation)
}
