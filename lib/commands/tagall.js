const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export async function handleTagall(sock, msg) {
  const from = msg.key.remoteJid
  if (!from.endsWith("@g.us")) return false

  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".tagall")) return false

  if (!await isAdmin(sock, from, sender)) {
    await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
    return true
  }

  const pesan = text.slice(7).trim()
  if (!pesan) {
    await sock.sendMessage(from, { text: "❌ Format: .tagall pesan\nContoh: .tagall Ada meeting jam 8 malam!" }, { quoted: msg }).catch(() => {})
    return true
  }

  try {
    const meta = await sock.groupMetadata(from)
    const members = meta.participants.map(p => p.id)

    const mentions = members
    const tags = members.map(jid => `@${jid.split("@")[0]}`).join(" ")

    await sock.sendMessage(from, {
      text: `📢 *${pesan}*\n\n${tags}`,
      mentions
    })
    console.log(`[tagall] Tag ${members.length} member di ${from}`)
  } catch (e) {
    console.log("[tagall] Gagal:", e.message)
    await sock.sendMessage(from, { text: "❌ Gagal tagall, coba lagi." }, { quoted: msg }).catch(() => {})
  }

  return true
}
