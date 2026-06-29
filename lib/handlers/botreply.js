import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg"
import ffmpeg from "fluent-ffmpeg"

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUDIO_DIR = path.join(__dirname, "..", "..", "assets", "audio")

const TRIGGER = ["bot", "bot?", "bot!", "hei bot", "hey bot", "hai bot", "hi bot"]

async function convertToOgg(inputPath) {
  const outputPath = path.join(os.tmpdir(), `bot-reply-${Date.now()}.ogg`)
  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec("libopus")
      .audioBitrate(128)
      .format("ogg")
      .output(outputPath)
      .on("end", resolve)
      .on("error", reject)
      .run()
  })
  return outputPath
}

export async function handleBotReply(sock, msg) {
  const from = msg.key.remoteJid
  if (!from.endsWith("@g.us")) return false

  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
  const lowerText = text.toLowerCase().trim()

  if (!TRIGGER.includes(lowerText)) return false

  const mp3Path = path.join(AUDIO_DIR, "voice_preview_bot.mp3")
  if (!fs.existsSync(mp3Path)) {
    console.log("[botreply] File audio tidak ditemukan:", mp3Path)
    return false
  }

  try {
    const oggPath = await convertToOgg(mp3Path)
    const audio = fs.readFileSync(oggPath)
    try { fs.unlinkSync(oggPath) } catch {}
    await sock.sendMessage(from, {
      audio,
      mimetype: "audio/ogg; codecs=opus",
      ptt: true
    }, { quoted: msg })
    console.log("[botreply] Audio terkirim ke", from)
  } catch (e) {
    console.log("[botreply] Gagal kirim audio:", e.message)
  }

  return true
}
