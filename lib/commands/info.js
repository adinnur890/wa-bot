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

export async function handleInfo(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || text.toLowerCase().trim() !== ".info") return false

  if (!await isAdmin(sock, from, sender)) {
    try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
    return true
  }

  let lastInfo = ""
  try {
    if (fs.existsSync(DATA_FILE)) {
      const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
      lastInfo = saved.lastInfo || ""
    }
  } catch {}

  if (!lastInfo) {
    try { await sock.sendMessage(from, { text: "❌ Belum ada pengumuman" }, { quoted: msg }) } catch {}
    return true
  }

  try {
    await sock.sendMessage(from, {
      text: `╔══════════════════╗\n       📢 *INFO GUILD*\n╚══════════════════╝\n\n${lastInfo}`
    })
  } catch (e) { console.log("Gagal .info:", e.message) }
  return true
}
