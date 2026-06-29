const afkData = new Map()

const formatDurasi = (ms) => {
  const totalSec = Math.floor(ms / 1000)
  const jam = Math.floor(totalSec / 3600)
  const menit = Math.floor((totalSec % 3600) / 60)
  const detik = totalSec % 60
  if (jam > 0) return `${jam} jam ${menit} menit`
  if (menit > 0) return `${menit} menit ${detik} detik`
  return `${detik} detik`
}

const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export async function handleAFK(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text) return false
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".afk") && afkData.has(sender)) {
    if (!await isAdmin(sock, from, sender)) return false
    const { alasan, waktu } = afkData.get(sender)
    const durasi = formatDurasi(Date.now() - waktu)
    afkData.delete(sender)
    try {
      await sock.sendMessage(from, {
        text: `👑 *${msg.pushName || sender.split("@")[0]} ganteng balik lagi!*\n\n⏱️ AFK selama: *${durasi}*\n📝 Alasan: *${alasan}*`,
        mentions: [sender]
      })
    } catch (e) { console.log("Gagal balik AFK:", e.message) }
    return false
  }

  if (lowerText.startsWith(".afk")) {
    if (!await isAdmin(sock, from, sender)) {
      try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
      return true
    }
    const alasan = text.slice(4).trim() || "Tidak ada alasan"
    const waktuSekarang = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    afkData.set(sender, { alasan, waktu: Date.now() })
    try {
      await sock.sendMessage(from, {
        text: `😴 *${msg.pushName || sender.split("@")[0]} lagi AFK!*\n\n📝 Alasan: *${alasan}*\n🕐 Jam: *${waktuSekarang}*`,
        mentions: [sender]
      }, { quoted: msg })
    } catch (e) { console.log("Gagal .afk:", e.message) }
    return true
  }

  return false
}
