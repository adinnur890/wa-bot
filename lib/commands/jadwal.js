import fs from "fs"

const DATABASE_DIR = "./database"
const DATA_FILE = `${DATABASE_DIR}/jadwal.json`
const LEGACY_FILE = "./jadwal-data.json"
let jadwalData = {}
let schedulerStarted = false

if (!fs.existsSync(DATABASE_DIR)) fs.mkdirSync(DATABASE_DIR, { recursive: true })
if (fs.existsSync(DATA_FILE)) {
  try { jadwalData = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) } catch {}
} else if (fs.existsSync(LEGACY_FILE)) {
  try { jadwalData = JSON.parse(fs.readFileSync(LEGACY_FILE, "utf-8")) } catch {}
}

const saveData = () => {
  try { fs.writeFileSync(DATA_FILE, JSON.stringify(jadwalData, null, 2)) } catch (e) { console.log("Gagal simpan jadwal:", e.message) }
}

const formatNumber = (jid) => jid.split("@")[0]

const parseDateTime = (dateInput, timeInput) => {
  const iso = `${dateInput}T${timeInput}:00`
  const dateTime = new Date(iso)
  return Number.isNaN(dateTime.getTime()) ? null : dateTime
}

const buildListText = (list) => {
  if (!list.length) return "✅ Belum ada jadwal di grup ini."
  return list.map(item => `• *${item.id}. ${item.title}*
  • Hari: ${item.day}
  • Tanggal: ${item.date}
  • Jam: ${item.time}
  • Lokasi: ${item.location}
  • Deskripsi: ${item.description}`).join("\n\n")
}

const startScheduler = (sock) => {
  if (schedulerStarted) return
  schedulerStarted = true
  setInterval(async () => {
    const now = Date.now()
    for (const [groupId, list] of Object.entries(jadwalData)) {
      for (const item of list) {
        if (!item.notified && item.datetime <= now) {
          item.notified = true
          saveData()
          await sock.sendMessage(groupId, {
            text: `⏰ *Jadwal Tiba!*
• ${item.title}
• ${item.date} ${item.time}
• Lokasi: ${item.location}
• Deskripsi: ${item.description}`
          }).catch(() => {})
        }
      }
    }
  }, 60000)
}

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

export async function handleJadwal(sock, msg) {
  try {
    const from = msg.key.remoteJid
    if (!from.endsWith("@g.us")) return
    const sender = msg.key.participant || from
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
    if (!text || !text.startsWith(".")) return
    const lowerText = text.toLowerCase().trim()
    const scheduleList = jadwalData[from] || []
    startScheduler(sock)

    if (lowerText === ".jadwal" || lowerText === ".listjadwal") {
      await sock.sendMessage(from, { text: `📅 *Daftar Jadwal:*
${buildListText(scheduleList)}` }, { quoted: msg }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".setjadwal ")) {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      const payload = text.slice(10).trim().split("|").map(p => p.trim())
      if (payload.length !== 6 || payload.some(p => !p)) {
        await sock.sendMessage(from, { text: "❌ Format: .setjadwal Nama|Hari|Tanggal|Jam|Lokasi|Deskripsi" }, { quoted: msg }).catch(() => {})
        return
      }
      const [title, day, date, time, location, description] = payload
      const dateTime = parseDateTime(date, time)
      if (!dateTime) {
        await sock.sendMessage(from, { text: "❌ Format tanggal/jam salah. Contoh: 2026-07-10|20:00" }, { quoted: msg }).catch(() => {})
        return
      }
      const next = scheduleList.length + 1
      jadwalData[from] = [...scheduleList, { id: next, title, day, date, time, location, description, datetime: dateTime.getTime(), notified: false }]
      saveData()
      await sock.sendMessage(from, { text: `✅ Jadwal ditambahkan: *${title}*\n• Hari: ${day}\n• Tanggal: ${date}\n• Jam: ${time}\n• Lokasi: ${location}\n• Deskripsi: ${description}` }, { quoted: msg }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".editjadwal ")) {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      const payload = text.slice(11).trim().split("|").map(p => p.trim())
      if (payload.length !== 7) {
        await sock.sendMessage(from, { text: "❌ Format: .editjadwal nomor|Nama|Hari|Tanggal|Jam|Lokasi|Deskripsi" }, { quoted: msg }).catch(() => {})
        return
      }
      const id = Number(payload[0])
      const [_, title, day, date, time, location, description] = payload
      if (!id || !title || !day || !date || !time || !location || !description) {
        await sock.sendMessage(from, { text: "❌ Format: .editjadwal nomor|Nama|Hari|Tanggal|Jam|Lokasi|Deskripsi" }, { quoted: msg }).catch(() => {})
        return
      }
      const dateTime = parseDateTime(date, time)
      if (!dateTime) {
        await sock.sendMessage(from, { text: "❌ Format tanggal/jam salah. Contoh: 2026-07-10|20:00" }, { quoted: msg }).catch(() => {})
        return
      }
      const item = scheduleList.find(item => item.id === id)
      if (!item) {
        await sock.sendMessage(from, { text: `❌ Jadwal nomor ${id} tidak ditemukan.` }, { quoted: msg }).catch(() => {})
        return
      }
      item.title = title
      item.day = day
      item.date = date
      item.time = time
      item.location = location
      item.description = description
      item.datetime = dateTime.getTime()
      item.notified = false
      jadwalData[from] = scheduleList
      saveData()
      await sock.sendMessage(from, { text: `✅ Jadwal nomor ${id} diperbarui.` }, { quoted: msg }).catch(() => {})
      return
    }

    if (lowerText.startsWith(".deljadwal ")) {
      if (!await isAdmin(sock, from, sender)) {
        await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
        return
      }
      const id = Number(text.slice(10).trim())
      if (!id) {
        await sock.sendMessage(from, { text: "❌ Format: .deljadwal nomor" }, { quoted: msg }).catch(() => {})
        return
      }
      const nextList = scheduleList.filter(item => item.id !== id)
      if (nextList.length === scheduleList.length) {
        await sock.sendMessage(from, { text: `❌ Jadwal nomor ${id} tidak ditemukan.` }, { quoted: msg }).catch(() => {})
        return
      }
      jadwalData[from] = nextList
      saveData()
      await sock.sendMessage(from, { text: `✅ Jadwal nomor ${id} dihapus.` }, { quoted: msg }).catch(() => {})
      return
    }
  } catch (error) {
    console.log("handleJadwal error:", error?.message || error)
  }
}

export const schedulerActive = true
