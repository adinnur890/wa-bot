import fs from "fs"
import { exec } from "child_process"

const DATABASE_DIR = "./database"
const OWNER_FILE = `${DATABASE_DIR}/owner.json`

const MODULE_PATHS = [
  "./warning.js", "./event.js", "./jadwal.js", "./premium.js",
  "./license.js", "./menu.js", "./owner.js", "./kick.js",
  "./ping.js", "./stiker.js", "./grupcontrol.js"
]

const JSON_FILES = [
  "./database/warning.json", "./database/event.json", "./database/jadwal.json",
  "./database/premium.json", "./database/welcome.json", "./database/leave.json",
  "./database/licenses.json", "./database/group-licenses.json",
  "./database/whitelist.json", "./database/owner.json"
]

if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true })
if (!fs.existsSync("./backups")) fs.mkdirSync("./backups", { recursive: true })

let ownerData = { superOwner: "", owners: [], adminGuilds: {} }
if (fs.existsSync(OWNER_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(OWNER_FILE, "utf-8"))
    ownerData = {
      superOwner: typeof raw?.superOwner === "string" ? raw.superOwner : "",
      owners: Array.isArray(raw?.owners) ? raw.owners : [],
      adminGuilds: raw?.adminGuilds && typeof raw.adminGuilds === "object" && !Array.isArray(raw.adminGuilds) ? raw.adminGuilds : {}
    }
  } catch {}
}

const saveOwners = () => {
  try { fs.writeFileSync(OWNER_FILE, JSON.stringify(ownerData, null, 2)) } catch (e) { console.log("Gagal simpan owner:", e.message) }
}

if (!fs.existsSync(OWNER_FILE)) saveOwners()

const formatNumber = (jid) => jid.split("@")[0]
const isOwner = (jid) => ownerData.owners.includes(jid)
export const isSuperOwner = (jid) => ownerData.superOwner === jid
export const isOwnerOrSuper = (jid) => isSuperOwner(jid) || isOwner(jid)
const isPrivateChat = (jid) => jid && !jid.endsWith("@g.us")

const normalizeTargetJid = (text, msg) => {
  const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  if (mentions.length) return mentions[0]
  const parts = text.trim().split(/\s+/)
  const last = parts[parts.length - 1]
  if (!last) return null
  if (last.endsWith("@s.whatsapp.net") || last.endsWith("@g.us")) return last
  if (/^\d{5,}$/.test(last)) return `${last}@s.whatsapp.net`
  return null
}

export const getGroupAdmins = (groupId) => {
  if (!groupId || typeof ownerData.adminGuilds !== "object") return []
  return Array.isArray(ownerData.adminGuilds[groupId]) ? ownerData.adminGuilds[groupId] : []
}

const ensureGroupAdmins = (groupId) => {
  if (!ownerData.adminGuilds[groupId] || !Array.isArray(ownerData.adminGuilds[groupId])) {
    ownerData.adminGuilds[groupId] = []
  }
  return ownerData.adminGuilds[groupId]
}

export const addGroupAdmin = (groupId, target) => {
  const admins = ensureGroupAdmins(groupId)
  if (!admins.includes(target)) admins.push(target)
  saveOwners()
}

export const removeGroupAdmin = (groupId, target) => {
  if (!groupId || !ownerData.adminGuilds[groupId]) return false
  const prev = ownerData.adminGuilds[groupId].length
  ownerData.adminGuilds[groupId] = ownerData.adminGuilds[groupId].filter(jid => jid !== target)
  const changed = ownerData.adminGuilds[groupId].length !== prev
  if (changed) saveOwners()
  return changed
}

export const isGroupAdmin = (groupId, jid) => getGroupAdmins(groupId).includes(jid)

export const isGroupAdminOrOwner = async (sock, groupId, sender) => {
  if (isOwnerOrSuper(sender)) return true
  if (isGroupAdmin(groupId, sender)) return true
  try {
    const meta = await sock.groupMetadata(groupId)
    return meta.participants.filter(p => p.admin).map(p => p.id).includes(sender)
  } catch { return false }
}

const formatDuration = (seconds) => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hrs}j ${mins}m ${secs}d`
}

export const initSuperOwner = (botId) => {
  if (!ownerData.superOwner && botId) {
    ownerData.superOwner = botId
    ownerData.owners = ownerData.owners || []
    saveOwners()
    return true
  }
  return false
}

const readJson = (p, fallback) => {
  if (!fs.existsSync(p)) return fallback
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) } catch { return fallback }
}

const ensureJsonFile = (p, defaultValue) => {
  if (!fs.existsSync(p)) {
    try { fs.writeFileSync(p, JSON.stringify(defaultValue, null, 2)) } catch {}
  }
}

const backupDatabase = () => {
  const folder = `./backups/backup-${Date.now()}`
  fs.mkdirSync(folder, { recursive: true })
  const files = fs.readdirSync(DATABASE_DIR).filter(f => f.endsWith(".json"))
  for (const file of files) fs.copyFileSync(`${DATABASE_DIR}/${file}`, `${folder}/${file}`)
  return folder
}

const restoreDatabase = () => {
  if (!fs.existsSync("./backups")) return null
  const backups = fs.readdirSync("./backups").filter(f => f.startsWith("backup-")).sort()
  if (!backups.length) return null
  const folder = `./backups/${backups[backups.length - 1]}`
  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"))
  for (const file of files) fs.copyFileSync(`${folder}/${file}`, `${DATABASE_DIR}/${file}`)
  return folder
}

const collectGroupIds = () => {
  const groups = new Set()
  const warnData = readJson("./database/warning.json", {})
  const eventData = readJson("./database/event.json", {})
  const jadwalData = readJson("./database/jadwal.json", {})
  const whitelist = readJson("./database/whitelist.json", [])
  const groupLicenses = readJson("./database/group-licenses.json", {})
  Object.keys(warnData).forEach(id => groups.add(id))
  Object.keys(eventData).forEach(id => groups.add(id))
  Object.keys(jadwalData).forEach(id => groups.add(id))
  if (Array.isArray(whitelist)) whitelist.forEach(id => groups.add(id))
  Object.keys(groupLicenses).forEach(id => groups.add(id))
  return Array.from(groups)
}

const runSelftest = async () => {
  const moduleStatuses = []
  let schedulerStatus = false
  for (const modulePath of MODULE_PATHS) {
    let loaded = false
    try {
      await import(new URL(modulePath, import.meta.url))
      loaded = true
      if (modulePath === "./jadwal.js") schedulerStatus = true
    } catch { loaded = false }
    moduleStatuses.push({ path: modulePath, loaded })
  }

  const jsonStatuses = JSON_FILES.map(p => ({ path: p, exists: fs.existsSync(p) }))
  for (const file of jsonStatuses) {
    if (!file.exists) {
      const def = file.path === OWNER_FILE ? { superOwner: "", owners: [], adminGuilds: {} }
        : file.path.endsWith("whitelist.json") ? []
        : file.path.endsWith("licenses.json") ? { licenses: {} }
        : {}
      ensureJsonFile(file.path, def)
      file.exists = true
    }
  }

  const indexText = fs.readFileSync("./index.js", "utf-8")
  const handlerNames = [
    "handleWarning", "handleEvent", "handleJadwal", "handlePremium",
    "handleOwner", "handleMenu", "handleKick", "handlePing",
    "handleStiker", "handleGrupControl", "handleAutoKick",
    "handleWelcomeMember", "handleLeaveMember"
  ]
  const commandsRegistered = handlerNames.map(name => ({ name, registered: indexText.includes(name) }))

  return {
    modules: moduleStatuses,
    json: jsonStatuses,
    scheduler: schedulerStatus,
    memory: process.memoryUsage(),
    commandsRegistered,
    ownerCount: ownerData.owners.length + (ownerData.superOwner ? 1 : 0)
  }
}

export async function handleOwner(sock, msg) {
  try {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
    if (!text || !text.startsWith(".")) return
    const lowerText = text.toLowerCase().trim()

    const canDo = () => isOwnerOrSuper(sender)

    // ── .owner ──────────────────────────────────────────────
    if (lowerText === ".owner") {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const superText = ownerData.superOwner ? `@${formatNumber(ownerData.superOwner)}` : "Belum diset"
      const ownerList = ownerData.owners.length
        ? ownerData.owners.map((jid, i) => `${i + 1}. @${formatNumber(jid)}`).join("\n")
        : "Belum ada owner."
      await sock.sendMessage(from, {
        text: `👑 *Owner Panel*\n━━━━━━━━━━━━━━━━━━\n• Super Owner: *${superText}*\n• Daftar Owner:\n${ownerList}\n• Total: *${ownerData.owners.length}*`
      }, { quoted: msg }).catch(() => {})
      return
    }

    // ── .owner add / .addowner ───────────────────────────────
    if (lowerText.startsWith(".owner add ") || lowerText.startsWith(".addowner ")) {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const target = normalizeTargetJid(text, msg)
      if (!target) {
        await sock.sendMessage(from, { text: "❌ Format: .owner add 628xxx atau .owner add @tag" }, { quoted: msg }).catch(() => {})
        return
      }
      if (target === ownerData.superOwner) {
        await sock.sendMessage(from, { text: `❌ @${formatNumber(target)} adalah Super Owner.`, mentions: [target] }).catch(() => {})
        return
      }
      if (ownerData.owners.includes(target)) {
        await sock.sendMessage(from, { text: `❌ @${formatNumber(target)} sudah owner.`, mentions: [target] }).catch(() => {})
        return
      }
      ownerData.owners.push(target)
      saveOwners()
      await sock.sendMessage(from, { text: `✅ @${formatNumber(target)} ditambahkan sebagai owner.`, mentions: [target] }).catch(() => {})
      return
    }

    // ── .unowner / .owner del ────────────────────────────────
    if (lowerText.startsWith(".unowner") || lowerText.startsWith(".owner del ") || lowerText.startsWith(".delowner ")) {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const target = normalizeTargetJid(text, msg)
      if (!target) {
        await sock.sendMessage(from, { text: "❌ Format: .unowner 628xxx atau .unowner @tag" }, { quoted: msg }).catch(() => {})
        return
      }
      if (target === ownerData.superOwner) {
        await sock.sendMessage(from, { text: "❌ Super Owner tidak bisa dihapus." }).catch(() => {})
        return
      }
      if (!ownerData.owners.includes(target)) {
        await sock.sendMessage(from, { text: `❌ @${formatNumber(target)} bukan owner.`, mentions: [target] }).catch(() => {})
        return
      }
      ownerData.owners = ownerData.owners.filter(jid => jid !== target)
      saveOwners()
      await sock.sendMessage(from, { text: `✅ @${formatNumber(target)} dihapus dari owner.`, mentions: [target] }).catch(() => {})
      return
    }

    // ── .botinfo ─────────────────────────────────────────────
    if (lowerText === ".botinfo") {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const pkg = readJson("./package.json", { name: "wa-bot", version: "1.0.0" })
      const memory = process.memoryUsage()
      let totalGroups = 0
      try { const g = await sock.groupFetchAllParticipating(); totalGroups = Object.keys(g).length } catch {}
      const premiumData = readJson("./database/premium.json", { groups: {} })
      const totalPremium = Object.entries(premiumData.groups || {}).filter(([, r]) => r.until > Date.now()).length
      const groupLicenses = readJson("./database/group-licenses.json", {})
      const totalLicensed = Object.entries(groupLicenses).filter(([, r]) => r.expiresAt > Date.now()).length
      const whitelist = readJson("./database/whitelist.json", [])
      await sock.sendMessage(from, {
        text: `🤖 *Bot Info*\n━━━━━━━━━━━━━━━━━━\n• Nama: *${pkg.name || "wa-bot"}*\n• Versi: *${pkg.version || "1.0.0"}*\n• Node: *${process.version}*\n• Uptime: *${formatDuration(process.uptime())}*\n• RAM: *${Math.round(memory.rss / 1024 / 1024)} MB*\n• Total Grup: *${totalGroups}*\n• Grup Berlisensi: *${totalLicensed}*\n• Grup Whitelist: *${Array.isArray(whitelist) ? whitelist.length : 0}*\n• Grup Premium: *${totalPremium}*\n• Total Owner: *${ownerData.owners.length + (ownerData.superOwner ? 1 : 0)}*`
      }, { quoted: msg }).catch(() => {})
      return
    }

    // ── .broadcast ───────────────────────────────────────────
    if (lowerText.startsWith(".broadcast ")) {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const textToSend = text.slice(11).trim()
      if (!textToSend) {
        await sock.sendMessage(from, { text: "❌ Format: .broadcast pesan" }, { quoted: msg }).catch(() => {})
        return
      }
      const groupIds = collectGroupIds()
      if (!groupIds.length) {
        await sock.sendMessage(from, { text: "❌ Belum ada grup terdaftar." }, { quoted: msg }).catch(() => {})
        return
      }
      let sent = 0
      for (const groupId of groupIds) {
        try { await sock.sendMessage(groupId, { text: textToSend }); sent++ } catch {}
      }
      await sock.sendMessage(from, { text: `📢 Broadcast terkirim ke *${sent}* grup dari total *${groupIds.length}*.` }, { quoted: msg }).catch(() => {})
      return
    }

    // ── .backupdb ─────────────────────────────────────────────
    if (lowerText === ".backupdb") {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const folder = backupDatabase()
      const files = fs.readdirSync(folder)
      await sock.sendMessage(from, { text: `💾 *Backup berhasil!*\n• Folder: ${folder}\n• File: ${files.length} file tersimpan` }, { quoted: msg }).catch(() => {})
      return
    }

    // ── .restoredb ────────────────────────────────────────────
    if (lowerText === ".restoredb") {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const folder = restoreDatabase()
      if (!folder) {
        await sock.sendMessage(from, { text: "❌ Tidak ada backup yang tersedia." }, { quoted: msg }).catch(() => {})
        return
      }
      await sock.sendMessage(from, { text: `♻️ *Restore berhasil!*\n• Dari: ${folder}` }, { quoted: msg }).catch(() => {})
      return
    }

    // ── .selftest ─────────────────────────────────────────────
    if (lowerText === ".selftest") {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const result = await runSelftest()
      const moduleLines = result.modules.map(m => `• ${m.path.replace("./", "")}: ${m.loaded ? "✅" : "❌"}`).join("\n")
      const jsonLines = result.json.map(j => `• ${j.path.replace("./database/", "")}: ${j.exists ? "✅" : "❌"}`).join("\n")
      const handlerLines = result.commandsRegistered.map(c => `• ${c.name}: ${c.registered ? "✅" : "❌"}`).join("\n")
      const mem = Math.round(result.memory.rss / 1024 / 1024)
      await sock.sendMessage(from, {
        text: `✅ *Selftest Report*\n━━━━━━━━━━━━━━━━━━\n*📦 Modules*\n${moduleLines}\n\n*🗃️ Database*\n${jsonLines}\n\n*⚙️ Handlers*\n${handlerLines}\n\n*📊 Info*\n• Scheduler: ${result.scheduler ? "✅" : "❌"}\n• RAM: ${mem} MB\n• Uptime: ${formatDuration(process.uptime())}\n• Owner: ${result.ownerCount} terdaftar`
      }, { quoted: msg }).catch(() => {})
      return
    }

    // ── .eval ─────────────────────────────────────────────────
    if (lowerText.startsWith(".eval ")) {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const code = text.slice(6)
      try {
        const result = await eval(code)
        await sock.sendMessage(from, { text: `✅ Hasil:\n${String(result)}` }, { quoted: msg }).catch(() => {})
      } catch (e) {
        await sock.sendMessage(from, { text: `❌ Error:\n${e.message}` }, { quoted: msg }).catch(() => {})
      }
      return
    }

    // ── .exec ─────────────────────────────────────────────────
    if (lowerText.startsWith(".exec ")) {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const command = text.slice(6).trim()
      exec(command, { timeout: 10000, maxBuffer: 1024 * 500 }, async (err, stdout, stderr) => {
        const output = err ? err.message : (stdout || stderr || "(tidak ada output)")
        await sock.sendMessage(from, { text: `💻 *Exec*\n${output}` }, { quoted: msg }).catch(() => {})
      })
      return
    }

    // ── .shutdown / .restart ──────────────────────────────────
    if (lowerText === ".shutdown" || lowerText === ".restart") {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      await sock.sendMessage(from, { text: `⚠️ Bot akan ${lowerText === ".restart" ? "restart" : "shutdown"}...` }, { quoted: msg }).catch(() => {})
      setTimeout(() => process.exit(0), 1000)
      return
    }

    // ── .addadmin / .deladmin / .adminlist ────────────────────
    if (lowerText.startsWith(".addadmin ")) {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const args = text.trim().split(/\s+/).slice(1)
      const groupId = args[0]?.endsWith("@g.us") ? args[0] : null
      const target = normalizeTargetJid(text, msg)
      if (!groupId || !target) {
        await sock.sendMessage(from, { text: "❌ Format: .addadmin 120363xxx@g.us 628xxx" }, { quoted: msg }).catch(() => {})
        return
      }
      addGroupAdmin(groupId, target)
      await sock.sendMessage(from, { text: `✅ @${formatNumber(target)} ditambahkan admin guild.`, mentions: [target] }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".deladmin ")) {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const args = text.trim().split(/\s+/).slice(1)
      const groupId = args[0]?.endsWith("@g.us") ? args[0] : null
      const target = normalizeTargetJid(text, msg)
      if (!groupId || !target) {
        await sock.sendMessage(from, { text: "❌ Format: .deladmin 120363xxx@g.us 628xxx" }, { quoted: msg }).catch(() => {})
        return
      }
      const removed = removeGroupAdmin(groupId, target)
      await sock.sendMessage(from, { text: removed ? `✅ @${formatNumber(target)} dihapus dari admin guild.` : `❌ @${formatNumber(target)} bukan admin guild.`, mentions: [target] }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".adminlist")) {
      if (!isPrivateChat(from)) {
        await sock.sendMessage(from, { text: "❌ Khusus di chat pribadi ke bot." }, { quoted: msg }).catch(() => {})
        return
      }
      if (!canDo()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
      const args = text.trim().split(/\s+/).slice(1)
      const groupId = args[0]?.endsWith("@g.us") ? args[0] : null
      if (!groupId) {
        await sock.sendMessage(from, { text: "❌ Format: .adminlist 120363xxx@g.us" }, { quoted: msg }).catch(() => {})
        return
      }
      const admins = getGroupAdmins(groupId)
      const list = admins.length ? admins.map((jid, i) => `${i + 1}. @${formatNumber(jid)}`).join("\n") : "Belum ada admin guild."
      await sock.sendMessage(from, { text: `📋 *Admin Guild:*\n${list}`, mentions: admins }).catch(() => {})
      return
    }

  } catch (error) {
    console.log("handleOwner error:", error?.message || error)
  }
}
