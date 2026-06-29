import fs from "fs"

const DATA_FILE = "./cn-data.json"
let cnName = ""

if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
    cnName = saved.cnName || ""
  } catch {}
}

const saveData = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ cnName }, null, 2))
  } catch (e) { console.log("Gagal simpan cn:", e.message) }
}

export async function handleCN(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""

  if (!text || !text.startsWith(".")) return false
  const lowerText = text.toLowerCase()

  const getAdminList = async () => {
    try {
      const meta = await sock.groupMetadata(from)
      return meta.participants.filter(p => p.admin).map(p => p.id)
    } catch { return [] }
  }
  const isAdmin = async () => (await getAdminList()).includes(sender)

  if (lowerText.startsWith(".setcn ")) {
    if (!await isAdmin()) {
      try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
      return true
    }
    cnName = text.slice(7).trim()
    if (!cnName) {
      try { await sock.sendMessage(from, { text: "❌ Format: .setcn NAMAㅤLGC" }, { quoted: msg }) } catch {}
      return true
    }
    saveData()
    try { await sock.sendMessage(from, { text: `✅ CN disimpan: *${cnName}*` }, { quoted: msg }) } catch (e) { console.log("Gagal .setcn:", e.message) }
    return true
  }

  if (lowerText === ".cn") {
    if (!cnName) {
      try { await sock.sendMessage(from, { text: "❌ CN belum diset! Admin ketik .setcn NamaCN" }, { quoted: msg }) } catch {}
      return true
    }
    try { await sock.sendMessage(from, { text: cnName }, { quoted: msg }) } catch (e) { console.log("Gagal .cn:", e.message) }
    return true
  }

  return false
}
