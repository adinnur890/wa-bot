import fs from "fs"

const DATA_FILE = "./absen-data.json"

let guilds = {}
let lastInfo = ""

if (fs.existsSync(DATA_FILE)) {
  try {
    const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"))
    guilds = saved.guilds || {}
    lastInfo = saved.lastInfo || ""
  } catch {}
}

const saveData = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ guilds, lastInfo }, null, 2))
  } catch (e) { console.log("Gagal simpan data:", e.message) }
}

const buildGuildText = (g) => {
  const pengurusTeks = g.pengurus.length
    ? g.pengurus.map(m => `*${m.jabatan} :${m.nama}* // (${m.nomor})`).join("\n")
    : "_Belum ada_"
  const memberTeks = g.member.length
    ? g.member.map((m, i) => `${i + 1}. ${m.nama}${m.hadir ? " ✅" : ""} // (${m.nomor})`).join("\n")
    : "_Belum ada_"
  return `*${g.judul}*\n\n${pengurusTeks}\n\n*${g.judulMember || "ABSEN MEMBER"}*\n${memberTeks}`
}

const parseList = (quotedText) => {
  const guild = { judul: "", judulMember: "", pengurus: [], member: [] }
  let kategori = null
  const lines = quotedText.split("\n").map(l => l.replace(/\*/g, "").trim()).filter(Boolean)

  for (const line of lines) {
    const up = line.toUpperCase()

    if (!kategori && !line.includes(":") && !line.match(/^\d+\./)) {
      guild.judul = line.trim()
      kategori = "pengurus"
      continue
    }

    if (up.includes("ABSEN MEMBER") || (up.includes("MEMBER") && !line.includes(":"))) {
      guild.judulMember = line.trim()
      kategori = "member"
      continue
    }

    if (!kategori) continue

    if (kategori === "pengurus") {
      const match = line.match(/^(.+?)\s*:\s*(.+?)(?:\s*\/\/\s*\(?([\d\s\-]+)\)?)?$/)
      if (match) {
        const jabatan = match[1].trim()
        const nama = match[2].split("//")[0].trim()
        const nomor = match[3] ? match[3].replace(/\s|\-/g, "").trim() : "-"
        guild.pengurus.push({ jabatan, nama, nomor })
      }
    } else {
      const cleaned = line.replace(/^\d+\s*[.)]\s*/, "").trim()
      const nomorMatch = cleaned.match(/\(?(0[\d\s\-]{8,})\)?/)
      const nama = cleaned.split(/\/\/|\(/)[0].replace(/✅/g, "").trim()
      const nomor = nomorMatch ? nomorMatch[1].replace(/\s|\-/g, "").trim() : "-"
      const hadir = cleaned.includes("✅")
      if (nama.length >= 2) guild.member.push({ nama, nomor, hadir })
    }
  }
  return guild
}

export { guilds, saveData, buildGuildText }

export async function handleAddAbsen(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
  const lowerText = text.toLowerCase()

  const isAdmin = async () => {
    try {
      const meta = await sock.groupMetadata(from)
      const admins = meta.participants.filter(p => p.admin).map(p => p.id)
      const senderNum = sender.split("@")[0]
      return admins.some(id => id.split("@")[0] === senderNum)
    } catch { return false }
  }

  const handle = async (guildKey) => {
    if (!await isAdmin()) {
      try { await sock.sendMessage(from, { text: "❌ Khusus admin!" }, { quoted: msg }) } catch {}
      return true
    }
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ""
    if (!quotedText) {
      try { await sock.sendMessage(from, { text: "❌ Reply list dulu bro!" }, { quoted: msg }) } catch {}
      return true
    }
    const guild = parseList(quotedText)
    guild.judul = guild.judul || guildKey
    guilds[guildKey] = guild
    saveData()
    try { await sock.sendMessage(from, { text: buildGuildText(guild) }) } catch (e) { console.log("Gagal .addabsen:", e.message) }
    return true
  }

  if (lowerText === ".addabsen vlr") return handle("VLR")
  if (lowerText === ".addabsen nova") return handle("NOVA")
  if (lowerText === ".addabsen rise") return handle("RISE")

  return false
}
