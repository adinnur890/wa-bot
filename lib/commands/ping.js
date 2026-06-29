const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export async function handlePing(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || text.toLowerCase().trim() !== ".ping") return false

  if (!await isAdmin(sock, from, sender)) {
    try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
    return true
  }

  const start = Date.now()
  try { await sock.sendMessage(from, { text: `🏓 *Pong!*\n⏱️ Response: *${Date.now() - start}ms*\n✅ Bot aktif!` }, { quoted: msg }) } catch (e) { console.log("Gagal .ping:", e.message) }
  return true
}
