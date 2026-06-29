import fs from "fs"

const DATA_FILE = "./absen-data.json"
const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export async function handleResetAbsen(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || text.toLowerCase().trim() !== ".resetabsen") return false

  if (!await isAdmin(sock, from, sender)) {
    try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
    return true
  }

  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
    saved.guilds = {}
    fs.writeFileSync(DATA_FILE, JSON.stringify(saved, null, 2))
  } catch {}

  try { await sock.sendMessage(from, { text: "🗑️ *Semua data absen direset!*" }) } catch (e) { console.log("Gagal .resetabsen:", e.message) }
  return true
}
