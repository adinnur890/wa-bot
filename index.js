import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import fs from "fs"
import pino from "pino"
import qrcode from "qrcode-terminal"
import readline from "readline"

const question = (prompt) => new Promise(resolve => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(prompt, ans => { rl.close(); resolve(ans.trim()) })
})

import { handleAddAbsen } from "./lib/commands/addabsen.js"
import { handleAbsen } from "./lib/commands/absen.js"
import { handleResetAbsen } from "./lib/commands/resetabsen.js"
import { handleCN } from "./lib/commands/cn.js"
import { handleLicense, isGroupLicensed } from "./lib/commands/license.js"
import { handleMenu } from "./lib/commands/menu.js"
import { handleWarning } from "./lib/commands/warning.js"
import { handleEvent } from "./lib/commands/event.js"
import { handleJadwal } from "./lib/commands/jadwal.js"
import { handlePremium } from "./lib/commands/premium.js"
import { handleOwner, initSuperOwner } from "./lib/commands/owner.js"
import { handleStiker } from "./lib/commands/stiker.js"
import { handleKick } from "./lib/commands/kick.js"
import { handlePing } from "./lib/commands/ping.js"
import { handleInfo } from "./lib/commands/info.js"
import { handleReply } from "./lib/commands/reply.js"
import { handleAFK } from "./lib/commands/afk.js"
import { handleGrupControl } from "./lib/commands/grupcontrol.js"
import { handleTagall } from "./lib/commands/tagall.js"
import { handleTiktok } from "./lib/commands/tiktok.js"
import { handleWelcomeMember, handleWelcomeCommand } from "./lib/handlers/welcome.js"
import { handleLeaveMember, handleLeaveCommand } from "./lib/handlers/leave.js"
import { handleAutoKick } from "./lib/handlers/autokick.js"
import { handleAntispamCommand, handleAntispamStiker } from "./lib/handlers/antispam.js"
import { handleBotReply } from "./lib/handlers/botreply.js"
import { handleAntiKataCommand, handleAntiKata } from "./lib/handlers/antikata.js"

const WHITELIST_FILE = "./database/whitelist.json"

const loadWhitelist = () => {
  try {
    if (!fs.existsSync(WHITELIST_FILE)) return []
    return JSON.parse(fs.readFileSync(WHITELIST_FILE, "utf-8")) || []
  } catch { return [] }
}

const saveWhitelist = (list) => {
  try { fs.writeFileSync(WHITELIST_FILE, JSON.stringify(list, null, 2)) } catch {}
}

const isWhitelisted = (groupId) => loadWhitelist().includes(groupId)
const isGroup = (jid) => jid.endsWith("@g.us")

const SKIP_WELCOME_LEAVE = ["120363406873472137@g.us"]

const handlers = [
  handleAutoKick,
  handleStiker,
  handleLicense,
  handleAddAbsen,
  handleAbsen,
  handleResetAbsen,
  handleCN,
  handleWarning,
  handleEvent,
  handleJadwal,
  handlePremium,
  handleOwner,
  handleKick,
  handlePing,
  handleInfo,
  handleReply,
  handleAFK,
  handleGrupControl,
  handleTagall,
  handleTiktok,
  handleMenu
]

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth")
  const { version } = await fetchLatestBaileysVersion()

  const usePairingCode = !state.creds.registered

  let phoneNumber = ""
  if (usePairingCode) {
    phoneNumber = await question("Masukkan nomor WA (contoh: 628123456789): ")
  }

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ["Windows", "Chrome", "120.0.0"],
    logger: pino({ level: "silent" })
  })

  if (usePairingCode && phoneNumber) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber)
        console.log("\n================================")
        console.log("   KODE PAIRING:", code)
        console.log("================================")
        console.log("WA → Setelan → Perangkat Tertaut → Tautkan dengan nomor telepon\n")
      } catch (e) {
        console.log("Gagal minta pairing code:", e.message)
      }
    }, 1000)
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update
    if (qr && !usePairingCode) {
      console.log("\n================================")
      console.log("   SCAN QR INI PAKAI WHATSAPP")
      console.log("================================\n")
      qrcode.generate(qr, { small: true })
      console.log("\nWA → Setelan → Perangkat Tertaut → Tautkan Perangkat\n")
    }
    if (connection === "open") {
      const botId = sock.user?.id || ""
      const created = initSuperOwner(botId)
      console.log("Database Loaded")
      console.log("Premium Loaded")
      console.log("Event Loaded")
      console.log("Jadwal Loaded")
      console.log("Warning Loaded")
      console.log(created ? "Super Owner Created" : "Super Owner Loaded")
      console.log("✅ BOT CONNECTED")
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log("❌ Putus, kode:", code, "| reconnect:", shouldReconnect)
      if (shouldReconnect) {
        setTimeout(() => startBot(), 2000)
      } else {
        console.log("🔴 Logged out. Menghapus sesi dan restart...")
        fs.rmSync("./auth", { recursive: true, force: true })
        console.log("✅ Auth terhapus. Restart bot untuk scan QR baru.")
        process.exit(0)
      }
    }
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("group-participants.update", async ({ id, participants, action }) => {
    if (action === "add") {
      if (!SKIP_WELCOME_LEAVE.includes(id)) await handleWelcomeMember(sock, id, participants)
    } else if (action === "remove") {
      if (!SKIP_WELCOME_LEAVE.includes(id)) await handleLeaveMember(sock, id, participants)
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return
    if (msg.key.fromMe) return

    const from = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ""

    // cek anti spam stiker dulu
    await handleAntispamStiker(sock, msg)
    await handleAntiKata(sock, msg)

    if (isGroup(from)) {
      const isWelcomeCmd = await handleWelcomeCommand(sock, msg, text)
      const isLeaveCmd = await handleLeaveCommand(sock, msg, text)
      const isAntispamCmd = await handleAntispamCommand(sock, msg, text)
      const isAntiKataCmd = await handleAntiKataCommand(sock, msg, text)
      const isBotReply = await handleBotReply(sock, msg)
      if (isWelcomeCmd || isLeaveCmd || isAntispamCmd || isAntiKataCmd || isBotReply) return

      const skipCheck = [".aktif", ".ceklisensi", ".menu", ".help", ".whitelist"]
      const isSkip = skipCheck.some(cmd => text.toLowerCase().trim().startsWith(cmd))
      if (!isSkip && !isWhitelisted(from) && !isGroupLicensed(from)) {
        if (text.toLowerCase().trim().startsWith(".")) {
          try { await sock.sendMessage(from, { text: "⚠️ Lisensi grup ini belum aktif atau sudah expired.\n\nHubungi owner untuk aktivasi.\nKetik .aktif <key> setelah mendapat key dari owner." }) } catch {}
        }
        return
      }

      if (text.toLowerCase().trim().startsWith(".whitelist")) {
        const ownerData = fs.existsSync("./database/owner.json") ? JSON.parse(fs.readFileSync("./database/owner.json", "utf-8")) : {}
        const sender = msg.key.participant || from
        const isOwner = ownerData.superOwner === sender || ownerData.owners?.includes(sender)
        if (!isOwner) {
          try { await sock.sendMessage(from, { text: "❌ Khusus owner!" }, { quoted: msg }) } catch {}
          return
        }
        const args = text.trim().split(" ")
        const sub = args[1]?.toLowerCase()
        const list = loadWhitelist()
        if (sub === "add") {
          if (list.includes(from)) {
            try { await sock.sendMessage(from, { text: "✅ Grup ini sudah ada di whitelist." }, { quoted: msg }) } catch {}
          } else {
            list.push(from)
            saveWhitelist(list)
            try { await sock.sendMessage(from, { text: `✅ Grup *${from}* ditambahkan ke whitelist.\nGrup ini sekarang bebas lisensi.` }, { quoted: msg }) } catch {}
          }
        } else if (sub === "del") {
          const newList = list.filter(id => id !== from)
          saveWhitelist(newList)
          try { await sock.sendMessage(from, { text: `✅ Grup *${from}* dihapus dari whitelist.` }, { quoted: msg }) } catch {}
        } else if (sub === "list") {
          if (!list.length) {
            try { await sock.sendMessage(from, { text: "❌ Belum ada grup di whitelist." }, { quoted: msg }) } catch {}
          } else {
            try { await sock.sendMessage(from, { text: `📋 *Whitelist Grup:*\n${list.map((id, i) => `${i + 1}. ${id}`).join("\n")}` }, { quoted: msg }) } catch {}
          }
        } else {
          try { await sock.sendMessage(from, { text: "❌ Format:\n.whitelist add — tambah grup ini\n.whitelist del — hapus grup ini\n.whitelist list — lihat daftar" }, { quoted: msg }) } catch {}
        }
        return
      }
    }

    for (const handler of handlers) {
      try {
        const result = await handler(sock, msg)
        if (result === true) break
      } catch (error) {
        console.log("Handler error:", error?.message || error)
      }
    }
  })
}

startBot().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
