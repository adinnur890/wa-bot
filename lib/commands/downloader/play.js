import { api } from "../../api.js"

const extractText = (msg) => msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || ""

export async function handlePlay(sock, msg) {
  const from = msg?.key?.remoteJid
  const text = extractText(msg)
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".play ")) {
    return false
  }

  const query = text.slice(6).trim()
  if (!query) {
    await sock.sendMessage(from, {
      text: "❌ Format: .play <judul lagu>\nContoh: .play perfect"
    }, { quoted: msg }).catch(() => {})
    return true
  }

  try {
    console.log(`[command] .play matched for ${from}`)
    await sock.sendMessage(from, { text: "⏳ Searching..." }, { quoted: msg }).catch(() => {})
    console.log(`[command] .play calling API: /play?q=${encodeURIComponent(query)}`)

    const result = await api.play(query)

    console.log(`[command] .play API response: ${JSON.stringify(result)}`)

    if (!result || result.success === false) {
      throw new Error(result?.message || "Invalid response from API")
    }

    const payload = result?.data?.data || result?.data || {}
    const { title, artist, duration, thumbnail, audio } = payload
    const caption = [
      `🎧 *Title:* ${title || "Unknown"}`,
      `🎤 *Artist:* ${artist || "Unknown"}`,
      `⏱️ *Duration:* ${duration || "Unknown"}`
    ].join("\n")

    if (thumbnail) {
      try {
        const buffer = await api.fetchMedia(thumbnail)
        console.log(`[command] .play sending image for ${from}`)
        await sock.sendMessage(from, { image: buffer, caption }, { quoted: msg }).catch(() => {})
        console.log(`[command] .play image sent for ${from}`)
      } catch (_) {
        await sock.sendMessage(from, { text: caption }, { quoted: msg }).catch(() => {})
      }
    } else {
      await sock.sendMessage(from, { text: caption }, { quoted: msg }).catch(() => {})
    }

    if (!audio) {
      await sock.sendMessage(from, { text: "❌ Audio tidak tersedia dari API." }, { quoted: msg }).catch(() => {})
      return true
    }

    const audioBuffer = await api.fetchMedia(audio)
    console.log(`[command] .play sending audio for ${from}`)
    await sock.sendMessage(from, { audio: audioBuffer, mimetype: "audio/mpeg" }, { quoted: msg }).catch(() => {})
    console.log(`[command] .play audio sent for ${from}`)
    return true
  } catch (error) {
    await sock.sendMessage(from, {
      text: `❌ Gagal memproses .play: ${error?.message || "Unknown error"}`
    }, { quoted: msg }).catch(() => {})
    return true
  }
}
