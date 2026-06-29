const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export async function handleReply(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || text.toLowerCase().trim() !== ".h") return false

  if (!await isAdmin(sock, from, sender)) {
    try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
    return true
  }

  const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
  const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ""
  if (!quotedText) {
    try { await sock.sendMessage(from, { text: "❌ Reply pesan dulu bro!" }, { quoted: msg }) } catch {}
    return true
  }

  try { await sock.sendMessage(from, { text: quotedText }, { quoted: msg }) } catch (e) { console.log("Gagal .h:", e.message) }
  return true
}
