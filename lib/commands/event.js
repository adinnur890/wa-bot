import fs from "fs"

const DATABASE_DIR = "./database"
const DATA_FILE = `${DATABASE_DIR}/event.json`
let eventData = {}

if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true })
if (fs.existsSync(DATA_FILE)) {
  try { eventData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) } catch {}
}

const saveData = () => {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(eventData, null, 2)) } catch (e) { console.log("Gagal simpan event:", e.message) }
}

const formatNumber = (jid) => jid.split("@")[0]

const getAdminList = async (sock, from) => {
  try {
    const meta = await sock.groupMetadata(from)
    return meta.participants.filter(p => p.admin).map(p => p.id)
  } catch {
    return []
  }
}

const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

const buildEventsText = (events) => {
  if (!events.length) return "✅ Belum ada event di grup ini."
  return events.map((item) => `• *${item.id}. ${item.title}*
  • Tanggal: ${item.date}
  • Jam: ${item.time}
  • Lokasi: ${item.location}
  • Deskripsi: ${item.description}`).join("\n\n")
}

export async function handleEvent(sock, msg) {
  try {
    const from = msg.key.remoteJid
    if (!from.endsWith("@g.us")) return
    const sender = msg.key.participant || from
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
    if (!text || !text.startsWith(".")) return
    const lowerText = text.toLowerCase().trim()
    const groupEvents = eventData[from] || []

    if (lowerText === ".event" || lowerText === ".listevent") {
      await sock.sendMessage(from, { text: `🎯 *Daftar Event:*
${buildEventsText(groupEvents)}` }, { quoted: msg }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".addevent ")) {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      const payload = text.slice(10).trim().split("|").map(p => p.trim())
      if (payload.length !== 5 || payload.some(p => !p)) {
        await sock.sendMessage(from, { text: "❌ Format: .addevent Nama Event|Tanggal|Jam|Lokasi|Deskripsi" }, { quoted: msg }).catch(() => {})
        return
      }
      const [title, date, time, location, description] = payload
      const next = groupEvents.length + 1
      eventData[from] = [...groupEvents, { id: next, title, date, time, location, description }]
      saveData()
      await sock.sendMessage(from, { text: `✅ Event ditambahkan: *${title}*
• Tanggal: ${date}
• Jam: ${time}
• Lokasi: ${location}
• Deskripsi: ${description}` }, { quoted: msg }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".editevent ")) {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      const payload = text.slice(10).trim().split("|").map(p => p.trim())
      if (payload.length !== 6) {
        await sock.sendMessage(from, { text: "❌ Format: .editevent nomor|Nama Event|Tanggal|Jam|Lokasi|Deskripsi" }, { quoted: msg }).catch(() => {})
        return
      }
      const id = Number(payload[0])
      const [_, title, date, time, location, description] = payload
      if (!id || !title || !date || !time || !location || !description) {
        await sock.sendMessage(from, { text: "❌ Format: .editevent nomor|Nama Event|Tanggal|Jam|Lokasi|Deskripsi" }, { quoted: msg }).catch(() => {})
        return
      }
      const event = groupEvents.find(item => item.id === id)
      if (!event) {
        await sock.sendMessage(from, { text: `❌ Event nomor ${id} tidak ditemukan.` }, { quoted: msg }).catch(() => {})
        return
      }
      event.title = title
      event.date = date
      event.time = time
      event.location = location
      event.description = description
      eventData[from] = groupEvents
      saveData()
      await sock.sendMessage(from, { text: `✅ Event nomor ${id} diperbarui.` }, { quoted: msg }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".delevent ")) {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      const id = Number(text.slice(9).trim())
      if (!id) {
        await sock.sendMessage(from, { text: "❌ Format: .delevent nomor" }, { quoted: msg }).catch(() => {})
        return
      }
      const nextEvents = groupEvents.filter(item => item.id !== id)
      if (nextEvents.length === groupEvents.length) {
        await sock.sendMessage(from, { text: `❌ Event nomor ${id} tidak ditemukan.` }, { quoted: msg }).catch(() => {})
        return
      }
      eventData[from] = nextEvents
      saveData()
      await sock.sendMessage(from, { text: `✅ Event nomor ${id} dihapus.` }, { quoted: msg }).catch(() => {})
      return
    }
  } catch (error) {
    console.log("handleEvent error:", error?.message || error)
  }
}
