const formatNumber = (jid) => jid.split("@")[0]

export async function handleAutoKick(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from

  const allText =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption || ""

  const isLinkGrup = allText.match(/chat\.whatsapp\.com\/[A-Za-z0-9]+/i)
  const isStatusMention = !!msg.message?.groupStatusMentionMessage
  const contextInfo =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    msg.message?.audioMessage?.contextInfo ||
    msg.message?.stickerMessage?.contextInfo || null

  const isForwardDariGrup =
    (contextInfo?.isForwarded === true || (contextInfo?.forwardingScore && contextInfo.forwardingScore > 0)) &&
    (contextInfo?.remoteJid?.endsWith("@g.us") ||
      contextInfo?.remoteJid?.endsWith("@broadcast") ||
      contextInfo?.remoteJid === "status@broadcast")

  if (!isLinkGrup && !isForwardDariGrup && !isStatusMention) return false

  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    if (admins.some(id => id.split("@")[0] === senderNum)) return false
  } catch { return false }

  const alasan = isLinkGrup
    ? "mengirim link grup"
    : isStatusMention
    ? "men-tag status WA ke grup"
    : "mem-forward pesan dari grup lain"

  try {
    await sock.groupParticipantsUpdate(from, [sender], "remove")
    await sock.sendMessage(from, {
      text: `⚠️ @${formatNumber(sender)} telah dikeluarkan karena ${alasan}!\n\n🚫 Dilarang tag status WA, share link grup, atau forward pesan dari grup lain di sini.`,
      mentions: [sender]
    })
  } catch (e) { console.log("Gagal auto kick:", e.message) }

  return true
}
