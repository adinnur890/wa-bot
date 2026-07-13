import { SpotifyService } from "../../services/spotify.service.js"
import { createLogger } from "../../logger/logger.js"
import { getApiConfig } from "../../../config/api.config.js"

const logger = createLogger({ prefix: "SPOTIFY" })

const extractText = (msg) => msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || ""

const resolveAccessToken = (apiConfig) => {
  const fromConfig = apiConfig?.api?.spotify || apiConfig?.spotify || apiConfig?.api?.token || ""
  return typeof fromConfig === "string" ? fromConfig : ""
}

const parseQuery = (text) => {
  const trimmed = text.trim()
  if (!trimmed) return ""
  const normalized = trimmed.replace(/^\.(spotify|play)\s*/i, "")
  return normalized.trim()
}

export async function handleSpotify(sock, msg) {
  const from = msg?.key?.remoteJid
  const text = extractText(msg)
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".spotify") && !lowerText.startsWith(".play")) {
    return false
  }

  const query = parseQuery(text)
  if (!query) {
    await sock.sendMessage(from, {
      text: "❌ Format: .spotify <judul lagu>\nContoh: .spotify midnight city"
    }, { quoted: msg }).catch(() => {})
    return true
  }

  try {
    await sock.sendMessage(from, {
      text: "⏳ Sedang mencari info lagu, tunggu sebentar..."
    }, { quoted: msg }).catch(() => {})

    const apiConfig = getApiConfig()
    const accessToken = resolveAccessToken(apiConfig)
    const service = new SpotifyService({ apiKey: accessToken })
    const result = await service.getTrack(query, { accessToken })

    const response = [
      `🎵 *Song:* ${result.title}`,
      `🎤 *Artist:* ${result.artist}`,
      `⏱️ *Duration:* ${result.duration}`,
      `🖼️ *Thumbnail:* ${result.thumbnail || "-"}`,
      `🔗 *Download link:* ${result.downloadLink || "-"}`
    ].join("\n")

    await sock.sendMessage(from, { text: response }, { quoted: msg }).catch(() => {})
    logger.info("Spotify command resolved", { query, from })
    return true
  } catch (error) {
    logger.error("Spotify command failed", { query, from, error: error?.message || error })
    await sock.sendMessage(from, {
      text: "❌ Gagal mengambil info lagu dari Spotify. Coba lagi dengan judul yang berbeda."
    }, { quoted: msg }).catch(() => {})
    return true
  }
}
