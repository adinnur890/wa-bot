import { api } from "../../api.js"

const extractText = (msg) => msg?.message?.conversation || msg?.message?.extendedTextMessage?.text || ""

export async function handleYtmp3(sock, msg) {
  const from = msg?.key?.remoteJid
  const text = extractText(msg)
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".ytmp3 ")) {
    return false
  }

  const url = text.slice(7).trim()
  if (!url) {
    await sock.sendMessage(from, {
      text: "❌ Format: .ytmp3 <link>\nContoh: .ytmp3 https://youtube.com/watch?v=..."
    }, { quoted: msg }).catch(() => {})
    return true
  }

  try {
    console.log(`[command] .ytmp3 matched for ${from}`)
    await sock.sendMessage(from, { text: "⏳ Searching..." }, { quoted: msg }).catch(() => {})
    console.log(`[command] .ytmp3 calling API: /ytmp3?url=${encodeURIComponent(url)}`)

    const result = await api.ytmp3(url)
    console.log(`[command] .ytmp3 API response: ${JSON.stringify(result)}`)

    if (!result || result.success === false) {
      throw new Error(result?.message || "Invalid response from API")
    }

    const payload = result?.data?.data || result?.data || {}
    const { title, thumbnail, download } = payload
    const caption = [
      `🎧 *Title:* ${title || "Unknown"}`,
      `🔗 *Source:* YouTube`
    ].join("\n")

    if (thumbnail) {
      try {
        const buffer = await api.fetchMedia(thumbnail)
        console.log(`[command] .ytmp3 sending image for ${from}`)
        await sock.sendMessage(from, { image: buffer, caption }, { quoted: msg }).catch(() => {})
        console.log(`[command] .ytmp3 image sent for ${from}`)
      } catch (_) {
        await sock.sendMessage(from, { text: caption }, { quoted: msg }).catch(() => {})
      }
    } else {
      await sock.sendMessage(from, { text: caption }, { quoted: msg }).catch(() => {})
    }

    if (!download) {
      await sock.sendMessage(from, { text: "❌ Audio download tidak tersedia dari API." }, { quoted: msg }).catch(() => {})
      return true
    }

    const audioBuffer = await api.fetchMedia(download)
    console.log(`[command] .ytmp3 sending audio for ${from}`)
    await sock.sendMessage(from, { audio: audioBuffer, mimetype: "audio/mpeg" }, { quoted: msg }).catch(() => {})
    console.log(`[command] .ytmp3 audio sent for ${from}`)
    return true
  } catch (error) {
    await sock.sendMessage(from, {
      text: `❌ Gagal memproses .ytmp3: ${error?.message || "Unknown error"}`
    }, { quoted: msg }).catch(() => {})
    return true
  }
}
