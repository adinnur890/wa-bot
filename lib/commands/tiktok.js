import pkg from "@tobyg74/tiktok-api-dl"
const { Downloader } = pkg

export async function handleTiktok(sock, msg) {
  const from = msg.key.remoteJid
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || ""
  const lowerText = text.toLowerCase().trim()

  if (!lowerText.startsWith(".tiktok ")) return false

  const url = text.slice(8).trim()
  if (!url) {
    await sock.sendMessage(from, { text: "❌ Format: .tiktok <link>\nContoh: .tiktok https://vm.tiktok.com/xxx" }, { quoted: msg }).catch(() => {})
    return true
  }

  if (!url.includes("tiktok.com")) {
    await sock.sendMessage(from, { text: "❌ Link tidak valid! Masukkan link TikTok yang benar." }, { quoted: msg }).catch(() => {})
    return true
  }

  try {
    await sock.sendMessage(from, { text: "⏳ Sedang download, tunggu sebentar..." }, { quoted: msg }).catch(() => {})

    // coba semua versi sampai dapat hasil
    let r = null
    for (const version of ["v3", "v2", "v1"]) {
      try {
        const result = await Downloader(url, { version })
        if (result?.status === "success" && result.result) {
          r = result.result
          console.log("[tiktok] berhasil dengan version:", version)
          break
        }
      } catch {}
    }

    if (!r) {
      await sock.sendMessage(from, { text: "❌ Gagal download, coba link lain." }, { quoted: msg }).catch(() => {})
      return true
    }

    // handle slideshow/gambar
    if (r.type === "image") {
      const imageList = Array.isArray(r.images) ? r.images : Array.isArray(r.image) ? r.image : []
      if (!imageList.length) {
        await sock.sendMessage(from, { text: "❌ Konten tidak ditemukan." }, { quoted: msg }).catch(() => {})
        return true
      }
      const caption = r.desc ? `🎵 *${r.desc}*\n\n_via Legacy Guild Bot_` : `🖼️ *TikTok Slideshow*\n\n_via Legacy Guild Bot_`
      for (const imgUrl of imageList.slice(0, 10)) {
        try {
          const imgRes = await fetch(imgUrl)
          if (!imgRes.ok) continue
          const imgBuf = Buffer.from(await imgRes.arrayBuffer())
          await sock.sendMessage(from, { image: imgBuf, caption }, { quoted: msg }).catch(() => {})
        } catch {}
      }
      console.log("[tiktok] Slideshow terkirim ke", from)
      return true
    }

    // ambil URL tanpa watermark saja
    const videoUrl = r.videoHD || r.videoSD

    if (!videoUrl) {
      await sock.sendMessage(from, { text: "❌ Video tanpa watermark tidak tersedia untuk konten ini." }, { quoted: msg }).catch(() => {})
      return true
    }

    const caption = r.desc
      ? `🎵 *${r.desc}*\n\n_via Legacy Guild Bot_`
      : `🎵 *TikTok Video*\n\n_via Legacy Guild Bot_`

    const res = await fetch(videoUrl)
    if (!res.ok) {
      await sock.sendMessage(from, { text: "❌ Gagal ambil video." }, { quoted: msg }).catch(() => {})
      return true
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    await sock.sendMessage(from, {
      video: buffer,
      caption,
      mimetype: "video/mp4"
    }, { quoted: msg })

    console.log("[tiktok] Video terkirim ke", from)
  } catch (e) {
    console.log("[tiktok] Error:", e.message)
    await sock.sendMessage(from, { text: "❌ Gagal download TikTok. Coba lagi atau coba link lain." }, { quoted: msg }).catch(() => {})
  }

  return true
}
