import fs from "fs"

const DB_PATH = "./database/antispam.json"

const loadDB = () => {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) } catch { return {} }
}

const saveDB = (data) => {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)) } catch (e) {
    console.log("[antispam] Gagal simpan DB:", e.message)
  }
}

const tracker = {}

const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export function isAntispamEnabled(groupId) {
  const db = loadDB()
  return db[groupId]?.enabled === true
}

export async function handleAntispamCommand(sock, msg, text) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".antispam")) return false

  if (!await isAdmin(sock, from, sender)) {
    await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
    return true
  }

  const db = loadDB()
  if (!db[from]) db[from] = { enabled: false }

  if (lowerText === ".antispam on") {
    db[from].enabled = true
    saveDB(db)
    await sock.sendMessage(from, { text: "✅ *Anti spam stiker* diaktifkan.\nKirim 3 stiker dalam 10 detik = kick." }, { quoted: msg }).catch(() => {})
    return true
  }

  if (lowerText === ".antispam off") {
    db[from].enabled = false
    saveDB(db)
    await sock.sendMessage(from, { text: "🔴 *Anti spam stiker* dinonaktifkan." }, { quoted: msg }).catch(() => {})
    return true
  }

  if (lowerText === ".antispam") {
    const status = db[from]?.enabled ? "✅ ON" : "🔴 OFF"
    await sock.sendMessage(from, {
      text: `📋 *Anti Spam Stiker*\nStatus: ${status}\n\nGunakan:\n• .antispam on\n• .antispam off`
    }, { quoted: msg }).catch(() => {})
    return true
  }

  return false
}

export async function handleAntispamStiker(sock, msg) {
  const from = msg.key.remoteJid
  if (!from.endsWith("@g.us")) return
  if (!isAntispamEnabled(from)) return
  if (!msg.message?.stickerMessage) return

  const sender = msg.key.participant || from
  if (!sender) return
  if (await isAdmin(sock, from, sender)) return

  const now = Date.now()
  const key = `${from}:${sender}`
  const WINDOW = 10000
  const MAX = 3

  if (!tracker[key]) {
    tracker[key] = { count: 1, firstTime: now }
    return
  }

  const diff = now - tracker[key].firstTime

  if (diff > WINDOW) {
    tracker[key] = { count: 1, firstTime: now }
    return
  }

  tracker[key].count++
  const count = tracker[key].count
  const nomor = sender.replace("@s.whatsapp.net", "")

  console.log(`[antispam] ${nomor} stiker ke-${count} dalam ${diff}ms`)

  if (count < MAX) {
    await sock.sendMessage(from, {
      text: `⚠️ @${nomor} jangan spam stiker! *${count}/${MAX}*`,
      mentions: [sender]
    }).catch(() => {})
    return
  }

  // count >= MAX → kick
  tracker[key] = { count: 0, firstTime: now }

  try {
    await sock.groupParticipantsUpdate(from, [sender], "remove")
    await sock.sendMessage(from, {
      text: `🚫 @${nomor} dikick karena spam stiker!`,
      mentions: [sender]
    }).catch(() => {})
    console.log(`[antispam] ${nomor} dikick dari ${from}`)
  } catch (e) {
    console.log("[antispam] Gagal kick:", e.message)
    await sock.sendMessage(from, {
      text: `⚠️ @${nomor} spam stiker! Gagal kick — pastikan bot adalah admin grup.`,
      mentions: [sender]
    }).catch(() => {})
  }
}
