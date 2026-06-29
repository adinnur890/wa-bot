const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export async function handleGrupControl(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || !text.startsWith(".")) return false
  const lowerText = text.toLowerCase()

  if (lowerText === ".tutup") {
    if (!await isAdmin(sock, from, sender)) {
      try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
      return true
    }
    try {
      await sock.groupSettingUpdate(from, "announcement")
      await sock.sendMessage(from, { text: "🔒 *Grup ditutup!*\nHanya admin yang bisa kirim pesan." })
    } catch {
      try { await sock.sendMessage(from, { text: "❌ Gagal tutup grup. Pastikan bot adalah admin." }, { quoted: msg }) } catch {}
    }
    return true
  }

  if (lowerText === ".buka") {
    if (!await isAdmin(sock, from, sender)) {
      try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
      return true
    }
    try {
      await sock.groupSettingUpdate(from, "not_announcement")
      await sock.sendMessage(from, { text: "🔓 *Grup dibuka!*\nSemua member bisa kirim pesan." })
    } catch {
      try { await sock.sendMessage(from, { text: "❌ Gagal buka grup. Pastikan bot adalah admin." }, { quoted: msg }) } catch {}
    }
    return true
  }

  return false
}
