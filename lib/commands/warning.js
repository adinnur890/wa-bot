import fs from "fs"

const DATABASE_DIR = "./database"
const DATA_FILE = `${DATABASE_DIR}/warning.json`
let warnData = {}

if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true })
if (fs.existsSync(DATA_FILE)) {
  try { warnData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) } catch {}
}

const saveData = () => {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(warnData, null, 2)) } catch (e) { console.log("Gagal simpan warning:", e.message) }
}

const formatNumber = (jid) => jid.split("@")[0]

const getAdminList = async (sock, from) => {
  try {
    const meta = await sock.groupMetadata(from)
    return meta.participants.filter(p => p.admin).map(p => p.id)
  } catch { return [] }
}

const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

const kickIfNeeded = async (sock, from, target, count) => {
  if (count >= 3) {
    try {
      await sock.groupParticipantsUpdate(from, [target], "remove")
      await sock.sendMessage(from, { text: `❌ @${formatNumber(target)} telah dikick karena 3 peringatan.`, mentions: [target] }).catch(() => {})
    } catch {
      await sock.sendMessage(from, { text: `⚠️ Gagal mengeluarkan @${formatNumber(target)} meskipun mencapai 3 peringatan.`, mentions: [target] }).catch(() => {})
    }
  }
}

export async function handleWarning(sock, msg) {
  try {
    const from = msg.key.remoteJid
    if (!from.endsWith("@g.us")) return
    const sender = msg.key.participant || from
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
    if (!text || !text.startsWith(".")) return
    const lowerText = text.toLowerCase().trim()

    if (lowerText.startsWith(".warn ")) {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const reason = text.slice(6).trim()
      if (!mentions.length || !reason) {
        await sock.sendMessage(from, { text: "❌ Format: .warn @tag alasan" }, { quoted: msg }).catch(() => {})
        return
      }
      const target = mentions[0]
      const group = warnData[from] || {}
      const record = group[target] || { count: 0, reasons: [] }
      record.count += 1
      record.reasons.push(reason)
      group[target] = record
      warnData[from] = group
      saveData()
      await sock.sendMessage(from, { text: `⚠️ @${formatNumber(target)} diberi peringatan: *${reason}*\nTotal peringatan: *${record.count}*`, mentions: [target] }).catch(() => {})
      await kickIfNeeded(sock, from, target, record.count)
      return
    }

    if (lowerText.startsWith(".unwarn")) {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      if (!mentions.length) {
        await sock.sendMessage(from, { text: "❌ Format: .unwarn @tag" }, { quoted: msg }).catch(() => {})
        return
      }
      const target = mentions[0]
      const group = warnData[from] || {}
      if (!group[target]) {
        await sock.sendMessage(from, { text: `❌ @${formatNumber(target)} tidak memiliki peringatan.`, mentions: [target] }, { quoted: msg }).catch(() => {})
        return
      }
      delete group[target]
      warnData[from] = group
      saveData()
      await sock.sendMessage(from, { text: `✅ Peringatan untuk @${formatNumber(target)} dihapus.`, mentions: [target] }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".checkwarn")) {
      const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const target = mentions[0] || sender
      const group = warnData[from] || {}
      const record = group[target]
      const count = record ? record.count : 0
      const reasons = record ? record.reasons : []
      const textOut = record
        ? `⚠️ @${formatNumber(target)} memiliki *${count}* peringatan.\n${reasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
        : `✅ @${formatNumber(target)} belum memiliki peringatan.`
      await sock.sendMessage(from, { text: textOut, mentions: [target] }).catch(() => {})
      return
    }

    if (lowerText === ".warnlist") {
      const group = warnData[from] || {}
      const entries = Object.entries(group)
      if (!entries.length) {
        await sock.sendMessage(from, { text: "✅ Belum ada peringatan di grup ini." }, { quoted: msg }).catch(() => {})
        return
      }
      const list = entries.map(([jid, record], i) => `${i + 1}. @${formatNumber(jid)} — ${record.count} peringatan`).join("\n")
      await sock.sendMessage(from, { text: `⚠️ *Daftar Peringatan Grup:*\n${list}`, mentions: entries.map(([jid]) => jid) }).catch(() => {})
      return
    }

    if (lowerText === ".clearwarn") {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      warnData[from] = {}
      saveData()
      await sock.sendMessage(from, { text: "🗑️ Semua peringatan grup telah dibersihkan." }, { quoted: msg }).catch(() => {})
      return
    }
  } catch (error) {
    console.log("handleWarning error:", error?.message || error)
  }
}
