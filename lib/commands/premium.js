import fs from "fs"

const DATABASE_DIR = "./database"
const DATA_FILE = `${DATABASE_DIR}/premium.json`
const OWNER_FILE = `${DATABASE_DIR}/owner.json`
let premiumData = { groups: {} }

if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true })
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
    premiumData = raw && typeof raw === "object"
      ? raw.groups && typeof raw.groups === "object"
        ? raw
        : { groups: raw }
      : { groups: {} }
  } catch {}
}

const saveData = () => {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(premiumData, null, 2)) } catch (e) { console.log("Gagal simpan premium:", e.message) }
}

const formatNumber = (jid) => jid.split("@")[0]

const getAdminList = async (sock, from) => {
  try {
    const meta = await sock.groupMetadata(from)
    return meta.participants.filter(p => p.admin).map(p => p.id)
  } catch {
    return []
  }
}

const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

const loadOwnerData = () => {
  if (!fs.existsSync(OWNER_FILE)) return { superOwner: "", owners: [] }
  try {
    const raw = JSON.parse(fs.readFileSync(OWNER_FILE, "utf-8"))
    return {
      superOwner: typeof raw?.superOwner === "string" ? raw.superOwner : "",
      owners: Array.isArray(raw?.owners) ? raw.owners : []
    }
  } catch {
    return { superOwner: "", owners: [] }
  }
}

const isOwner = (jid) => {
  const ownerData = loadOwnerData()
  return ownerData.superOwner === jid || ownerData.owners.includes(jid)
}

const isPremiumGroup = (groupId) => {
  const record = premiumData.groups[groupId]
  return record && record.until > Date.now()
}

const formatSince = (groupId) => {
  const record = premiumData.groups[groupId]
  return record && record.since ? new Date(record.since).toLocaleString() : "-"
}

const formatUntil = (groupId) => {
  const record = premiumData.groups[groupId]
  return record && record.until > Date.now()
    ? new Date(record.until).toLocaleString()
    : "Tidak aktif"
}

export async function handlePremium(sock, msg) {
  try {
    const from = msg.key.remoteJid
    const sender = msg.key.participant || from
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
    if (!text || !text.startsWith(".")) return
    const lowerText = text.toLowerCase().trim()
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const isGroupChat = from.endsWith("@g.us")
    const groupId = isGroupChat ? from : null
    const targetGroup = groupId || (mentions[0]?.endsWith("@g.us") ? mentions[0] : null)

    const canManage = async () => isOwner(sender)

    if (lowerText === ".premium") {
      if (!targetGroup) {
        await sock.sendMessage(from, { text: "❌ Command ini hanya dapat digunakan di dalam grup untuk memeriksa premium grup." }, { quoted: msg }).catch(() => {})
        return
      }
      const active = isPremiumGroup(targetGroup)
      const sinceText = formatSince(targetGroup)
      const untilText = formatUntil(targetGroup)
      const remaining = active ? Math.max(0, Math.ceil((premiumData.groups[targetGroup].until - Date.now()) / 86400000)) : 0
      await sock.sendMessage(from, { text: `💎 *Status Premium Grup:* ${active ? "AKTIF" : "TIDAK AKTIF"}\n• Grup: *${targetGroup}*\n• Tanggal aktif: *${sinceText}*\n• Tanggal expired: *${untilText}*\n• Sisa hari: *${remaining}*` }).catch(() => {})
      return
    }

    if (lowerText === ".listprem") {
      const active = Object.entries(premiumData.groups)
        .filter(([, record]) => record.until > Date.now())
        .map(([group, record]) => `• ${group} — ${new Date(record.until).toLocaleString()}`)
      if (!active.length) {
        await sock.sendMessage(from, { text: "✅ Tidak ada grup premium aktif." }, { quoted: msg }).catch(() => {})
        return
      }
      await sock.sendMessage(from, { text: `💎 *Daftar Premium Aktif:*\n${active.join("\n")}` }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".addprem ") || lowerText.startsWith(".renew ") || lowerText.startsWith(".delprem ")) {
      if (!await canManage()) {
        await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }).catch(() => {})
        return
      }
    }

    if (lowerText.startsWith(".addprem ")) {
      if (!groupId) {
        await sock.sendMessage(from, { text: "❌ Gunakan perintah ini di dalam grup untuk menambahkan premium pada grup tersebut." }, { quoted: msg }).catch(() => {})
        return
      }
      const days = Number(text.split(" ").pop())
      if (!days || days <= 0) {
        await sock.sendMessage(from, { text: "❌ Masa premium tidak valid." }, { quoted: msg }).catch(() => {})
        return
      }
      const now = Date.now()
      premiumData.groups[groupId] = { since: now, until: now + days * 24 * 60 * 60 * 1000 }
      saveData()
      await sock.sendMessage(from, { text: `✅ Premium grup ini diberikan selama ${days} hari.` }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".renew ")) {
      if (!groupId) {
        await sock.sendMessage(from, { text: "❌ Gunakan perintah ini di dalam grup untuk memperpanjang premium grup tersebut." }, { quoted: msg }).catch(() => {})
        return
      }
      const days = Number(text.split(" ").pop())
      if (!days || days <= 0) {
        await sock.sendMessage(from, { text: "❌ Masa renewal tidak valid." }, { quoted: msg }).catch(() => {})
        return
      }
      const existing = premiumData.groups[groupId]
      const current = existing && existing.until > Date.now() ? existing.until : Date.now()
      premiumData.groups[groupId] = { since: existing?.since || Date.now(), until: current + days * 24 * 60 * 60 * 1000 }
      saveData()
      await sock.sendMessage(from, { text: `✅ Premium grup ini diperpanjang ${days} hari.` }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".delprem ")) {
      if (!groupId) {
        await sock.sendMessage(from, { text: "❌ Gunakan perintah ini di dalam grup untuk menghapus premium grup tersebut." }, { quoted: msg }).catch(() => {})
        return
      }
      delete premiumData.groups[groupId]
      saveData()
      await sock.sendMessage(from, { text: `✅ Premium grup ini dihapus.` }).catch(() => {})
      return
    }
  } catch (error) {
    console.log("handlePremium error:", error?.message || error)
  }
}
