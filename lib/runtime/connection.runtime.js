import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import fs from "fs"
import pino from "pino"
import qrcode from "qrcode-terminal"

export async function createConnectionRuntime(runtime, options = {}) {
  const authRuntime = options.authRuntime || { ensureAuthDir() {} }
  const question = options.question || (async () => "")

  authRuntime.ensureAuthDir()

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
      const created = options.initSuperOwner ? options.initSuperOwner(botId) : false
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
        setTimeout(() => {
          try {
            options.startBot?.(runtime)
          } catch (error) {
            console.log("Reconnect bootstrap failed:", error?.message || error)
          }
        }, 2000)
      } else {
        console.log("🔴 Logged out. Menghapus sesi dan restart...")
        fs.rmSync("./auth", { recursive: true, force: true })
        console.log("✅ Auth terhapus. Restart bot untuk scan QR baru.")
        process.exit(0)
      }
    }
  })

  sock.ev.on("creds.update", saveCreds)

  return sock
}
