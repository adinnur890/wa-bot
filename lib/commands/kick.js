const formatNumber = (jid) => jid.split("@")[0]

const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export async function handleKick(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || !text.toLowerCase().startsWith(".kick")) return false

  if (!await isAdmin(sock, from, sender)) {
    try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
    return true
  }

  const tagged = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
  if (!tagged.length) {
    try { await sock.sendMessage(from, { text: "❌ Tag dulu orangnya!\nContoh: .kick @nomor" }, { quoted: msg }) } catch {}
    return true
  }

  for (const jid of tagged) {
    try {
      await sock.groupParticipantsUpdate(from, [jid], "remove")
      await sock.sendMessage(from, { text: `👢 @${formatNumber(jid)} telah dikeluarkan.`, mentions: [jid] })
    } catch {
      try { await sock.sendMessage(from, { text: "❌ Gagal kick. Pastikan bot adalah admin grup." }, { quoted: msg }) } catch {}
    }
  }
  return true
}
