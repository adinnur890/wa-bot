import fs from "fs"

const DB_PATH = "./database/antikata.json"

// ── Daftar kata terlarang (bisa tambah sendiri di sini) ──
const KATA_TERLARANG = [
  "anjing", "anj", "anying", "anjg",
  "babi", "bab1",
  "bangsat", "bgst", "bngst",
  "kontol", "kntl", "k0ntol",
  "memek", "mmk",
  "pepek",
  "bajingan", "bjgn",
  "goblok", "g0blok", "gblk",
  "tolol", "t0lol",
  "idiot", "idi0t",
  "bodoh", "b0doh",
  "tai", "t4i",
  "kampret", "kmpr",
  "keparat", "kprt",
  "sialan", "sialn",
  "bedebah",
  "celeng",
  "cuki", "cukimai",
  "jancuk", "jnck", "jancok",
  "ndasmu", "ndas",
  "asu", "4su",
  "lonte", "l0nte",
  "pelacur", "plcr",
  "sundal",
  "brengsek", "brngsek"
]

const loadDB = () => {
  try { return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) } catch { return {} }
}

const saveDB = (data) => {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)) } catch (e) {
    console.log("[antikata] Gagal simpan DB:", e.message)
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

export function isAntiKataEnabled(groupId) {
  const db = loadDB()
  return db[groupId]?.enabled === true
}

function cekKataKasar(text) {
  const lower = text.toLowerCase()
  return KATA_TERLARANG.find(kata => {
    const regex = new RegExp(`\\b${kata}\\b`, "i")
    return regex.test(lower) || lower.includes(kata)
  })
}

export async function handleAntiKataCommand(sock, msg, text) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".antikata")) return false

  if (!await isAdmin(sock, from, sender)) {
    await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }).catch(() => {})
    return true
  }

  const db = loadDB()
  if (!db[from]) db[from] = { enabled: false }

  if (lowerText === ".antikata on") {
    db[from].enabled = true
    saveDB(db)
    await sock.sendMessage(from, { text: "✅ *Anti kata kasar* diaktifkan.\nMember yang kirim kata kasar akan dapat peringatan, 3x = kick." }, { quoted: msg }).catch(() => {})
    return true
  }

  if (lowerText === ".antikata off") {
    db[from].enabled = false
    saveDB(db)
    await sock.sendMessage(from, { text: "🔴 *Anti kata kasar* dinonaktifkan." }, { quoted: msg }).catch(() => {})
    return true
  }

  if (lowerText === ".antikata") {
    const status = db[from]?.enabled ? "✅ ON" : "🔴 OFF"
    await sock.sendMessage(from, {
      text: `📋 *Anti Kata Kasar*\nStatus: ${status}\n\nGunakan:\n• .antikata on\n• .antikata off`
    }, { quoted: msg }).catch(() => {})
    return true
  }

  return false
}

export async function handleAntiKata(sock, msg) {
  const from = msg.key.remoteJid
  if (!from.endsWith("@g.us")) return
  if (!isAntiKataEnabled(from)) return

  const sender = msg.key.participant || from
  if (!sender) return
  if (await isAdmin(sock, from, sender)) return

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
  if (!text) return

  const kataKena = cekKataKasar(text)
  if (!kataKena) return

  const nomor = sender.replace("@s.whatsapp.net", "")

  // tambah warn
  const warnPath = "./database/warning.json"
  let warnData = {}
  try { warnData = JSON.parse(fs.readFileSync(warnPath, "utf-8")) } catch {}
  if (!warnData[from]) warnData[from] = {}
  if (!warnData[from][sender]) warnData[from][sender] = { count: 0, reasons: [] }
  warnData[from][sender].count++
  warnData[from][sender].reasons.push(`kata kasar: ${kataKena}`)
  const warnCount = warnData[from][sender].count
  try { fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2)) } catch {}

  console.log(`[antikata] ${nomor} kena kata: ${kataKena}, warn: ${warnCount}/3`)

  if (warnCount >= 3) {
    try {
      await sock.groupParticipantsUpdate(from, [sender], "remove")
      await sock.sendMessage(from, {
        text: `🚫 @${nomor} dikick karena 3x menggunakan kata kasar!`,
        mentions: [sender]
      }).catch(() => {})
    } catch (e) {
      console.log("[antikata] Gagal kick:", e.message)
      await sock.sendMessage(from, {
        text: `⚠️ @${nomor} menggunakan kata kasar! Gagal kick — pastikan bot adalah admin.`,
        mentions: [sender]
      }).catch(() => {})
    }
    delete warnData[from][sender]
    try { fs.writeFileSync(warnPath, JSON.stringify(warnData, null, 2)) } catch {}
  } else {
    await sock.sendMessage(from, {
      text: `⚠️ @${nomor} dilarang menggunakan kata kasar!\nPeringatan: *${warnCount}/3*`,
      mentions: [sender]
    }).catch(() => {})
  }
}
