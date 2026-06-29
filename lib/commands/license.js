import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import crypto from "crypto"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LICENSE_DB = path.join(__dirname, "..", "..", "database", "licenses.json")
const GROUP_LICENSE_DB = path.join(__dirname, "..", "..", "database", "group-licenses.json")

const initDB = () => {
  const dir = path.dirname(LICENSE_DB)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(LICENSE_DB)) fs.writeFileSync(LICENSE_DB, JSON.stringify({ licenses: {} }, null, 2))
  if (!fs.existsSync(GROUP_LICENSE_DB)) fs.writeFileSync(GROUP_LICENSE_DB, JSON.stringify({}, null, 2))
}

const loadLicenses = () => {
  try { return JSON.parse(fs.readFileSync(LICENSE_DB, "utf-8")) } catch { return { licenses: {} } }
}

const saveLicenses = (data) => {
  try { fs.writeFileSync(LICENSE_DB, JSON.stringify(data, null, 2)) } catch (e) { console.log("[license] Save error:", e.message) }
}

const loadGroupLicenses = () => {
  try { return JSON.parse(fs.readFileSync(GROUP_LICENSE_DB, "utf-8")) } catch { return {} }
}

const saveGroupLicenses = (data) => {
  try { fs.writeFileSync(GROUP_LICENSE_DB, JSON.stringify(data, null, 2)) } catch (e) { console.log("[group-license] Save error:", e.message) }
}

// Cek apakah grup sudah punya lisensi aktif
export const isGroupLicensed = (groupId) => {
  const groups = loadGroupLicenses()
  const record = groups[groupId]
  if (!record) return false
  return record.expiresAt > Date.now()
}

// Generate key lisensi
export const generateLicenseKey = () => {
  const part1 = crypto.randomBytes(4).toString("hex").toUpperCase()
  const part2 = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `LGB-${part1}-${part2}`
}

// Buat lisensi baru (oleh owner)
export const createLicense = (buyerName, duration = 30) => {
  initDB()
  const db = loadLicenses()
  const key = generateLicenseKey()
  const now = Date.now()
  db.licenses[key] = {
    key,
    buyerName,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + duration * 86400000).toISOString(),
    duration,
    usedBy: null,
    usedAt: null
  }
  saveLicenses(db)
  return key
}

initDB()

const loadOwner = () => {
  try { return JSON.parse(fs.readFileSync("./database/owner.json", "utf-8")) } catch { return { superOwner: "", owners: [] } }
}

const isOwner = (sender) => {
  const o = loadOwner()
  return o.superOwner === sender || o.owners?.includes(sender)
}

export async function handleLicense(sock, msg) {
  const from = msg.key.remoteJid
  const sender = msg.key.participant || from
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
  if (!text) return false
  const lowerText = text.toLowerCase().trim()

  // .aktif <key> — diketik di grup oleh pembeli
  if (lowerText.startsWith(".aktif ")) {
    if (!from.endsWith("@g.us")) {
      try { await sock.sendMessage(from, { text: "❌ Aktivasi hanya bisa dilakukan di dalam grup!" }, { quoted: msg }) } catch {}
      return true
    }
    const key = text.slice(7).trim()
    const db = loadLicenses()
    const license = db.licenses[key]

    if (!license) {
      try { await sock.sendMessage(from, { text: "❌ License key tidak valid!" }, { quoted: msg }) } catch {}
      return true
    }

    const now = Date.now()
    const expiresAt = new Date(license.expiresAt).getTime()

    if (now > expiresAt) {
      try { await sock.sendMessage(from, { text: "❌ License key sudah expired!" }, { quoted: msg }) } catch {}
      return true
    }

    if (license.usedBy && license.usedBy !== from) {
      try { await sock.sendMessage(from, { text: "❌ License key sudah dipakai di grup lain!" }, { quoted: msg }) } catch {}
      return true
    }

    // Aktivasi grup
    const groups = loadGroupLicenses()
    const existing = groups[from]
    const baseTime = existing && existing.expiresAt > now ? existing.expiresAt : now
    groups[from] = {
      key,
      activatedAt: new Date(now).toISOString(),
      expiresAt: baseTime + license.duration * 86400000
    }
    saveGroupLicenses(groups)

    // Tandai key sudah dipakai
    license.usedBy = from
    license.usedAt = new Date(now).toISOString()
    saveLicenses(db)

    const remaining = Math.ceil((groups[from].expiresAt - now) / 86400000)
    try { await sock.sendMessage(from, { text: `✅ *Bot berhasil diaktifkan!*\n• Masa aktif: *${remaining} hari*\n• Expired: *${new Date(groups[from].expiresAt).toLocaleString()}*\n\nKetik .menu untuk melihat semua command.` }) } catch {}
    return true
  }

  // .ceklisensi — cek status lisensi grup
  if (lowerText === ".ceklisensi") {
    if (!from.endsWith("@g.us")) return false

    // cek whitelist dulu
    try {
      const whitelist = JSON.parse(fs.readFileSync("./database/whitelist.json", "utf-8"))
      if (Array.isArray(whitelist) && whitelist.includes(from)) {
        try { await sock.sendMessage(from, { text: `✅ *Status Lisensi Grup*\n• Status: *AKTIF (Whitelist)*\n• Sisa: *Selamanya*\n• Grup ini bebas lisensi.` }, { quoted: msg }) } catch {}
        return true
      }
    } catch {}

    const groups = loadGroupLicenses()
    const record = groups[from]
    if (!record || record.expiresAt <= Date.now()) {
      try { await sock.sendMessage(from, { text: "❌ Grup ini belum aktif atau lisensi sudah expired.\n\nHubungi owner untuk aktivasi." }, { quoted: msg }) } catch {}
      return true
    }
    const remaining = Math.ceil((record.expiresAt - Date.now()) / 86400000)
    try { await sock.sendMessage(from, { text: `✅ *Status Lisensi Grup*\n• Status: *AKTIF*\n• Sisa: *${remaining} hari*\n• Expired: *${new Date(record.expiresAt).toLocaleString()}*` }, { quoted: msg }) } catch {}
    return true
  }

  // Command owner
  if (!lowerText.startsWith(".license")) return false
  if (!isOwner(sender)) {
    try { await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }) } catch {}
    return true
  }

  // .license buat <nama> <hari>
  if (lowerText.startsWith(".license buat ")) {
    const args = text.slice(14).trim().split(" ")
    const duration = parseInt(args[args.length - 1])
    const buyerName = isNaN(duration) ? args.join(" ") : args.slice(0, -1).join(" ")
    const days = isNaN(duration) ? 30 : duration
    if (!buyerName) {
      try { await sock.sendMessage(from, { text: "❌ Format: .license buat <nama> <hari>" }, { quoted: msg }) } catch {}
      return true
    }
    const key = createLicense(buyerName, days)
    try { await sock.sendMessage(from, { text: `✅ *License dibuat!*\n• Nama: *${buyerName}*\n• Durasi: *${days} hari*\n• Key: *${key}*\n\nKirim key ini ke pembeli, lalu suruh ketik:\n*.aktif ${key}*\ndi grup mereka.` }, { quoted: msg }) } catch {}
    return true
  }

  // .license list
  if (lowerText === ".license list") {
    const db = loadLicenses()
    const list = Object.values(db.licenses)
    if (!list.length) {
      try { await sock.sendMessage(from, { text: "❌ Belum ada license." }, { quoted: msg }) } catch {}
      return true
    }
    const now = Date.now()
    const text = list.map((l, i) => {
      const remaining = Math.ceil((new Date(l.expiresAt).getTime() - now) / 86400000)
      return `${i + 1}. *${l.key}*\n   Pembeli: ${l.buyerName}\n   Sisa: ${remaining > 0 ? remaining : 0} hari\n   Dipakai: ${l.usedBy ? "Ya" : "Belum"}`
    }).join("\n\n")
    try { await sock.sendMessage(from, { text: `📋 *Daftar License:*\n\n${text}` }, { quoted: msg }) } catch {}
    return true
  }

  // .license cabut <key>
  if (lowerText.startsWith(".license cabut ")) {
    const key = text.slice(15).trim()
    const db = loadLicenses()
    if (!db.licenses[key]) {
      try { await sock.sendMessage(from, { text: "❌ License key tidak ditemukan." }, { quoted: msg }) } catch {}
      return true
    }
    const groupId = db.licenses[key].usedBy
    delete db.licenses[key]
    saveLicenses(db)
    if (groupId) {
      const groups = loadGroupLicenses()
      delete groups[groupId]
      saveGroupLicenses(groups)
    }
    try { await sock.sendMessage(from, { text: `✅ License *${key}* dicabut.` }, { quoted: msg }) } catch {}
    return true
  }

  return false
}
