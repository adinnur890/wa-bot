import { guilds, buildGuildText } from "./addabsen.js"

export async function handleAbsen(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
  const lowerText = text.toLowerCase()

  const isAdmin = async () => {
    try {
      const meta = await sock.groupMetadata(from)
      const admins = meta.participants.filter(p => p.admin).map(p => p.id)
      const senderNum = sender.split("@")[0]
      return admins.some(id => id.split("@")[0] === senderNum)
    } catch { return false }
  }

  const handle = async (guildKey) => {
    if (!await isAdmin()) {
      try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
      return true
    }
    if (!guilds[guildKey]) {
      try { await sock.sendMessage(from, { text: `❌ Data absen *${guildKey}* belum ada! Gunakan .addabsen ${guildKey.toLowerCase()} dulu.` }, { quoted: msg }) } catch {}
      return true
    }
    try { await sock.sendMessage(from, { text: buildGuildText(guilds[guildKey]) }) } catch (e) { console.log("Gagal .absen:", e.message) }
    return true
  }

  if (lowerText === ".absen vlr") return handle("VLR")
  if (lowerText === ".absen nova") return handle("NOVA")
  if (lowerText === ".absen rise") return handle("RISE")

  return false
}
