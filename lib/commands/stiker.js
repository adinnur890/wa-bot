import { downloadMediaMessage } from "@whiskeysockets/baileys"
import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas"
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg"
import ffmpeg from "fluent-ffmpeg"
import fs from "fs"
import path from "path"
import os from "os"
import { fileURLToPath } from "url"

ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fontPath = path.join(__dirname, "..", "..", "assets", "fonts", "Poppins-Bold.ttf")
let F = "Arial"
if (fs.existsSync(fontPath)) { GlobalFonts.registerFromPath(fontPath, "Poppins"); F = "Poppins" }

async function pngToWebp(pngBuffer) {
  const tmpIn = path.join(os.tmpdir(), `stiker-in-${Date.now()}.png`)
  const tmpOut = path.join(os.tmpdir(), `stiker-out-${Date.now()}.webp`)
  try {
    fs.writeFileSync(tmpIn, pngBuffer)
    await new Promise((resolve, reject) => {
      ffmpeg(tmpIn)
        .outputOptions(["-vf", "scale=512:512", "-lossless", "1", "-q:v", "90"])
        .output(tmpOut)
        .on("end", resolve)
        .on("error", reject)
        .run()
    })
    const webpBuf = fs.readFileSync(tmpOut)
    return webpBuf
  } finally {
    try { fs.unlinkSync(tmpIn) } catch {}
    try { fs.unlinkSync(tmpOut) } catch {}
  }
}

async function makeStiker(imageBuffer) {
  const canvas = createCanvas(512, 512)
  const ctx = canvas.getContext("2d")
  const img = await loadImage(imageBuffer)
  // crop tengah supaya tidak gepeng
  const s = Math.min(img.width, img.height)
  const sx = (img.width - s) / 2
  const sy = (img.height - s) / 2
  ctx.drawImage(img, sx, sy, s, s, 0, 0, 512, 512)
  const png = canvas.toBuffer("image/png")
  return await pngToWebp(png)
}

export async function handleStiker(sock, msg) {
  const from = msg.key.remoteJid
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ""

  const lowerText = text.toLowerCase().trim()
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo
  const quotedMsg = contextInfo?.quotedMessage

  // .stiker — reply foto jadi stiker
  if (lowerText === ".stiker") {
    if (!quotedMsg?.imageMessage) {
      try { await sock.sendMessage(from, { text: "❌ Reply foto dulu bro!" }, { quoted: msg }) } catch {}
      return true
    }
    try {
      const buffer = await downloadMediaMessage(
        { message: quotedMsg, key: { ...msg.key, id: contextInfo.stanzaId, participant: contextInfo.participant } },
        "buffer", {}
      )
      const out = await makeStiker(buffer)
      await sock.sendMessage(from, { sticker: out }, { quoted: msg })
      console.log("[stiker] terkirim size:", out.length)
    } catch (e) {
      console.log("[stiker] Gagal:", e.message)
      try { await sock.sendMessage(from, { text: "❌ Gagal buat stiker!" }, { quoted: msg }) } catch {}
    }
    return true
  }

  // .brat <teks>
  if (lowerText.startsWith(".brat ")) {
    const teks = text.slice(6).trim()
    if (!teks) {
      try { await sock.sendMessage(from, { text: "❌ Tulis teksnya!\nContoh: .brat twisted alpha" }, { quoted: msg }) } catch {}
      return true
    }
    try {
      const size = 512
      const canvas = createCanvas(size, size)
      const ctx = canvas.getContext("2d")

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, size, size)
      ctx.fillStyle = "#000000"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      let fontSize = 80
      ctx.font = `bold ${fontSize}px ${F}`
      while (ctx.measureText(teks).width > size - 60 && fontSize > 20) {
        fontSize -= 4
        ctx.font = `bold ${fontSize}px ${F}`
      }
      ctx.shadowColor = "#000000"
      ctx.shadowBlur = 3
      ctx.fillText(teks, size / 2, size / 2)

      const png = canvas.toBuffer("image/png")
      const out = await pngToWebp(png)
      await sock.sendMessage(from, { sticker: out }, { quoted: msg })
      console.log("[brat] terkirim size:", out.length)
    } catch (e) {
      console.log("[brat] Gagal:", e.message)
      try { await sock.sendMessage(from, { text: "❌ Gagal buat stiker brat!" }, { quoted: msg }) } catch {}
    }
    return true
  }

  // .smeme teks atas | teks bawah
  if (lowerText.startsWith(".smeme")) {
    if (!quotedMsg?.imageMessage) {
      try { await sock.sendMessage(from, { text: "❌ Reply foto dulu!\nContoh: .smeme teks atas | teks bawah" }, { quoted: msg }) } catch {}
      return true
    }
    const parts = text.slice(6).trim().split("|")
    const atas = parts[0]?.trim() || ""
    const bawah = parts[1]?.trim() || ""
    try {
      const buffer = await downloadMediaMessage(
        { message: quotedMsg, key: { ...msg.key, id: contextInfo.stanzaId, participant: contextInfo.participant } },
        "buffer", {}
      )
      const size = 512
      const canvas = createCanvas(size, size)
      const ctx = canvas.getContext("2d")

      const foto = await loadImage(buffer)
      ctx.drawImage(foto, 0, 0, size, size)

      ctx.textAlign = "center"
      ctx.font = `bold 46px ${F}`
      ctx.lineWidth = 7
      ctx.strokeStyle = "#000000"
      ctx.fillStyle = "#ffffff"

      if (atas) {
        ctx.strokeText(atas.toUpperCase(), size / 2, 52)
        ctx.fillText(atas.toUpperCase(), size / 2, 52)
      }
      if (bawah) {
        ctx.strokeText(bawah.toUpperCase(), size / 2, size - 18)
        ctx.fillText(bawah.toUpperCase(), size / 2, size - 18)
      }

      const png = canvas.toBuffer("image/png")
      const out = await pngToWebp(png)
      await sock.sendMessage(from, { sticker: out }, { quoted: msg })
      console.log("[smeme] terkirim size:", out.length)
    } catch (e) {
      console.log("[smeme] Gagal:", e.message)
      try { await sock.sendMessage(from, { text: "❌ Gagal buat meme!" }, { quoted: msg }) } catch {}
    }
    return true
  }

  return false
}
