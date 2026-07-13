export async function handleSamplecmd(sock, msg) {
  const from = msg.key.remoteJid
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || text.toLowerCase().trim() !== ".samplecmd") return false

  try {
    await sock.sendMessage(from, { text: "Samplecmd command scaffolded" }, { quoted: msg })
  } catch (error) {
    console.log("Command scaffold error:", error?.message || error)
  }

  return true
}
