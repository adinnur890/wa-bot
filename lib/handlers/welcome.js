import fs from "fs"
import { generateWelcomeImage } from "../../utils/canvas.js"

const DB_PATH = "./database/welcome.json"

const loadDB = () => {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) } catch { return {} }
}

const saveDB = (data) => {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)) } catch (e) {
    console.log("[welcome] Gagal simpan DB:", e.message)
  }
}

export function isWelcomeEnabled(groupId) {
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

export async function handleWelcomeCommand(sock, msg, text) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".welcome")) return false

  if (!await isAdmin(sock, from, sender)) {
    await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
    return true
  }

  const db = loadDB()
  if (!db[from]) db[from] = { enabled: true }

  if (lowerText === ".welcome on") {
    db[from].enabled = true
    saveDB(db)
    await sock.sendMessage(from, { text: "✅ *Welcome message* diaktifkan." }, { quoted: msg }).catch(() => {})
    return true
  }

  if (lowerText === ".welcome off") {
    db[from].enabled = false
    saveDB(db)
    await sock.sendMessage(from, { text: "🔴 *Welcome message* dinonaktifkan." }, { quoted: msg }).catch(() => {})
    return true
  }

  if (lowerText === ".welcome") {
    const status = db[from]?.enabled ? "✅ ON" : "🔴 OFF"
    await sock.sendMessage(from, {
      text: `📋 *Welcome Message*\nStatus: ${status}\n\nGunakan:\n• .welcome on\n• .welcome off`
    }, { quoted: msg }).catch(() => {})
    return true
  }

  return false
}

const AUTO_KICK_GROUPS = ["BIG FAMILY LEGACY"]

export async function handleWelcomeMember(sock, groupId, participants) {
  if (!isWelcomeEnabled(groupId)) {
    console.log("[welcome] Dinonaktifkan untuk grup:", groupId)
    return
  }

  let groupName = groupId
  try {
    const meta = await sock.groupMetadata(groupId)
    groupName = meta.subject || groupId
  } catch {}

  const isAutoKickGroup = AUTO_KICK_GROUPS.some(name =>
    groupName.toLowerCase().includes(name.toLowerCase())
  )

  for (let p of participants) {
    const jid = typeof p === "object" ? (p.id || p.jid || String(p)) : String(p)
    if (!jid || !jid.includes("@")) continue

    if (isAutoKickGroup) {
      try {
        await sock.groupParticipantsUpdate(groupId, [jid], "remove")
        console.log(`[auto-kick] ${jid} dikick dari ${groupName}`)
      } catch (e) {
        console.log("[auto-kick] Gagal kick:", e.message)
      }
      continue
    }

    const nomor = jid.replace("@s.whatsapp.net", "")
    console.log(`[welcome] Member join: ${nomor} di ${groupName}`)

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
      imageBuffer = await generateWelcomeImage(avatarBuffer, nomor)
      console.log("[welcome] imageBuffer size:", imageBuffer?.length)
    } catch (e) {
      console.log("[welcome] Gagal generate gambar:", e.message)
    }

    const caption =
      `👋 Selamat datang @${nomor} di *LEGACY*.\n\n` +
      `Silakan isi data berikut:\n\n` +
      `📛 Nama :\n` +
      `🎂 Umur :\n` +
      `📍 Askot :\n` +
      `🎮 Asal Guild :\n` +
      `🎯 Tujuan Bergabung :\n\n` +
      `Selamat bergabung.\nSemoga betah di LEGACY. 🔥`

    if (!imageBuffer) {
      console.log("[welcome] imageBuffer null, kirim teks saja")
      try { await sock.sendMessage(groupId, { text: caption, mentions: [jid] }) } catch (e) { console.log("[welcome] Gagal kirim teks:", e.message) }
      continue
    }

    try {
      await sock.sendMessage(groupId, { image: Buffer.from(imageBuffer), caption, mentions: [jid] })
      console.log("[welcome] Pesan + gambar terkirim ke", groupId)
    } catch (e) {
      console.log("[welcome] Gagal kirim gambar:", e.message)
      try { await sock.sendMessage(groupId, { text: caption, mentions: [jid] }) } catch {}
    }
  }
}
