import fs from "fs"
import { generateLeaveImage } from "../../utils/canvas.js"

const DB_PATH = "./database/leave.json"

const loadDB = () => {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) } catch { return {} }
}

const saveDB = (data) => {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)) } catch (e) {
    console.log("[leave] Gagal simpan DB:", e.message)
  }
}

export function isLeaveEnabled(groupId) {
  const db = loadDB()
  if (db[groupId] === undefined) return true
  return db[groupId]?.enabled !== false
}

const isAdmin = async (sock, from, sender) => {
  try {
    const meta = await sock.groupMetadata(from)
    const admins = meta.participants.filter(p => p.admin).map(p => p.id)
    const senderNum = sender.split("@")[0]
    return admins.some(id => id.split("@")[0] === senderNum)
  } catch { return false }
}

export async function handleLeaveCommand(sock, msg, text) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".leave")) return false

  if (!await isAdmin(sock, from, sender)) {
    await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
    return true
  }

  const db = loadDB()
  if (!db[from]) db[from] = { enabled: true }

  if (lowerText === ".leave on") {
    db[from].enabled = true
    saveDB(db)
    await sock.sendMessage(from, { text: "✅ *Leave message* diaktifkan." }, { quoted: msg }).catch(() => {})
    return true
  }

  if (lowerText === ".leave off") {
    db[from].enabled = false
    saveDB(db)
    await sock.sendMessage(from, { text: "🔴 *Leave message* dinonaktifkan." }, { quoted: msg }).catch(() => {})
    return true
  }

  if (lowerText === ".leave") {
    const status = db[from]?.enabled ? "✅ ON" : "🔴 OFF"
    await sock.sendMessage(from, {
      text: `📋 *Leave Message*\nStatus: ${status}\n\nGunakan:\n• .leave on\n• .leave off`
    }, { quoted: msg }).catch(() => {})
    return true
  }

  return false
}

export async function handleLeaveMember(sock, groupId, participants) {
  if (!isLeaveEnabled(groupId)) {
    console.log("[leave] Dinonaktifkan untuk grup:", groupId)
    return
  }

  for (const p of participants) {
    const jid = typeof p === "object" ? (p.id || p.jid || String(p)) : String(p)
    if (!jid || !jid.includes("@")) continue

    const nomor = jid.replace("@s.whatsapp.net", "")
    console.log(`[leave] Member keluar: ${nomor} dari ${groupId}`)

    const avatarBuffer = await Promise.race([
      (async () => {
        try {
          const url = await sock.profilePictureUrl(jid, "image")
          if (!url) return null
          const res = await fetch(url)
          return res.ok ? Buffer.from(await res.arrayBuffer()) : null
        } catch { return null }
      })(),
      new Promise(r => setTimeout(() => r(null), 2000))
    ])

    let imageBuffer = null
    try {
      imageBuffer = await generateLeaveImage(avatarBuffer, nomor)
      console.log("[leave] imageBuffer size:", imageBuffer?.length)
    } catch (e) {
      console.log("[leave] Gagal generate gambar:", e.message)
    }

    const caption =
      `🚪 @${nomor} keluar dari guild.\n\n` +
      `Anjing... satu lagi cabut. 😭\n\n` +
      `Semoga sukses dan jangan lupa bayar utang kalau ada. 🗿`

    if (!imageBuffer) {
      try { await sock.sendMessage(groupId, { text: caption, mentions: [jid] }) } catch {}
      continue
    }

    try {
      await sock.sendMessage(groupId, { image: Buffer.from(imageBuffer), caption, mentions: [jid] })
      console.log("[leave] Pesan + gambar terkirim ke", groupId)
    } catch (e) {
      console.log("[leave] Gagal kirim gambar:", e.message)
      try { await sock.sendMessage(groupId, { text: caption, mentions: [jid] }) } catch {}
    }
  }
}
