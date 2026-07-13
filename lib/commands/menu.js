export async function handleMenu(sock, msg) {
  const from = msg.key.remoteJid
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    ""

  if (!text) return
  const lowerText = text.toLowerCase().trim()
  if (lowerText !== ".menu" && lowerText !== ".help") return

  try {
    await sock.sendMessage(from, {
      text: `╔══════════════════╗
      🔥 *LEGACY GUILD BOT* 🔥
╚══════════════════╝

━━━━━━━━━━━━━━━━━━
📋 *ABSEN*
━━━━━━━━━━━━━━━━━━
• *.addabsen* vlr/nova/rise
• *.absen* vlr/nova/rise
• *.resetabsen*
• *.info*

━━━━━━━━━━━━━━━━━━
🎯 *EVENT & JADWAL*
━━━━━━━━━━━━━━━━━━
• *.addevent* Nama|Tgl|Jam|Lokasi|Desk
• *.editevent* no|Nama|Tgl|Jam|Lokasi|Desk
• *.delevent* nomor
• *.event*
• *.setjadwal* Nama|Hari|Tgl|Jam|Lokasi|Desk
• *.editjadwal* no|Nama|Hari|Tgl|Jam|Lokasi|Desk
• *.deljadwal* nomor
• *.jadwal*

━━━━━━━━━━━━━━━━━━
🎨 *STIKER*
━━━━━━━━━━━━━━━━━━
• *.stiker* — reply foto → stiker
• *.brat* teks — stiker teks brat
• *.smeme* teks atas|teks bawah — reply foto → meme stiker

━━━━━━━━━━━━━━━━━━
📥 *DOWNLOAD*
━━━━━━━━━━━━━━━━━━
• *.tiktok* link — download video TikTok
• *.play* judul lagu — search and deliver audio
• *.ytmp3* link — download YouTube audio

━━━━━━━━━━━━━━━━━━
💎 *PREMIUM*
━━━━━━━━━━━━━━━━━━
• *.premium* — cek status premium
• *.listprem* — lihat semua premium
• *.addprem* jumlah_hari
• *.renew* jumlah_hari
• *.delprem*

━━━━━━━━━━━━━━━━━━
⚠️ *MODERASI*
━━━━━━━━━━━━━━━━━━
• *.kick* @tag
• *.warn* @tag alasan — 3x warn = kick
• *.unwarn* @tag
• *.checkwarn* @tag
• *.warnlist*
• *.clearwarn*
• *.afk* alasan
• *.h* — reply pesan → kirim ulang

━━━━━━━━━━━━━━━━━━
⚙️ *GRUP*
━━━━━━━━━━━━━━━━━━
• *.cn* — kirim CN guild
• *.setcn* nama — set CN guild
• *.ping* — cek bot aktif
• *.tutup* — kunci grup
• *.buka* — buka grup
• *.antispam* on/off — anti spam stiker
• *.antikata* on/off — anti kata kasar
• *.tagall* pesan — tag semua member

━━━━━━━━━━━━━━━━━━
🔑 *LISENSI*
━━━━━━━━━━━━━━━━━━
• *.aktif* <key> — aktivasi bot
• *.ceklisensi* — cek status lisensi

━━━━━━━━━━━━━━━━━━
👑 *OWNER* _(chat pribadi ke bot)_
━━━━━━━━━━━━━━━━━━
• *.owner* — panel owner
• *.owner add* 628xxx
• *.unowner* 628xxx
• *.botinfo*
• *.broadcast* pesan
• *.license buat* nama hari
• *.license list*
• *.license cabut* KEY
• *.whitelist* add/del/list _(di grup)_
• *.backupdb*
• *.restoredb*
• *.selftest*

━━━━━━━━━━━━━━━━━━
_Semua command khusus admin grup_ 🔥`
    })
  } catch (e) { console.log("Gagal .menu:", e.message) }
}
