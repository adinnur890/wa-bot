import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, "..")

const fontBold    = path.join(ROOT, "assets", "fonts", "Poppins-Bold.ttf")
const fontRegular = path.join(ROOT, "assets", "fonts", "Poppins-Regular.ttf")

let F = "Arial"
if (fs.existsSync(fontRegular)) { GlobalFonts.registerFromPath(fontRegular, "Poppins"); F = "Poppins" }
if (fs.existsSync(fontBold))    { GlobalFonts.registerFromPath(fontBold,    "Poppins"); F = "Poppins" }

async function loadAvatar(buf) {
  if (buf) { try { return await loadImage(buf) } catch {} }
  // buat avatar default langsung tanpa file eksternal
  const fb = createCanvas(200, 200)
  const fc = fb.getContext("2d")
  const grad = fc.createRadialGradient(100, 100, 0, 100, 100, 100)
  grad.addColorStop(0, "#2a2a2a")
  grad.addColorStop(1, "#111111")
  fc.fillStyle = grad; fc.beginPath(); fc.arc(100, 100, 100, 0, Math.PI * 2); fc.fill()
  fc.font = `bold 80px ${F}`; fc.fillStyle = "#ffd700"
  fc.textAlign = "center"; fc.textBaseline = "middle"; fc.fillText("?", 100, 105)
  return await loadImage(await fb.encode("png"))
}

function drawCircleAvatar(ctx, img, cx, cy, r) {
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip()
  ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2)
  ctx.restore()
}

function drawParticles(ctx, W, H, color, count = 60) {
  const rng = (min, max) => min + Math.random() * (max - min)
  ctx.save()
  for (let i = 0; i < count; i++) {
    const x = rng(0, W), y = rng(0, H)
    const size = rng(0.5, 2.5)
    const alpha = rng(0.05, 0.25)
    ctx.globalAlpha = alpha
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function drawDiamondDeco(ctx, x, y, size, color, alpha = 0.2) {
  ctx.save()
  ctx.translate(x, y); ctx.rotate(Math.PI / 4)
  ctx.strokeStyle = color; ctx.globalAlpha = alpha
  ctx.lineWidth = 1; ctx.strokeRect(-size, -size, size * 2, size * 2)
  ctx.globalAlpha = alpha * 0.5
  ctx.strokeRect(-size * 1.5, -size * 1.5, size * 3, size * 3)
  ctx.restore()
}

function drawCorners(ctx, W, H, color) {
  const len = 50, g = 10
  ctx.save()
  ctx.strokeStyle = color; ctx.lineWidth = 3
  ctx.shadowColor = color; ctx.shadowBlur = 15
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.moveTo(g, g + len); ctx.lineTo(g, g); ctx.lineTo(g + len, g)
  ctx.moveTo(W-g-len, g); ctx.lineTo(W-g, g); ctx.lineTo(W-g, g+len)
  ctx.moveTo(g, H-g-len); ctx.lineTo(g, H-g); ctx.lineTo(g+len, H-g)
  ctx.moveTo(W-g-len, H-g); ctx.lineTo(W-g, H-g); ctx.lineTo(W-g, H-g-len)
  ctx.stroke(); ctx.restore()
}

function hline(ctx, x1, x2, y, color, blur = 8, alpha = 1) {
  ctx.save()
  ctx.strokeStyle = color; ctx.lineWidth = 1
  ctx.shadowColor = color; ctx.shadowBlur = blur
  ctx.globalAlpha = alpha
  ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke()
  ctx.restore()
}

function drawGlowRing(ctx, cx, cy, r, color) {
  // Outer glow rings
  for (let i = 4; i >= 1; i--) {
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, r + i * 5, 0, Math.PI * 2)
    ctx.strokeStyle = color; ctx.lineWidth = 2
    ctx.globalAlpha = 0.06 * i
    ctx.stroke(); ctx.restore()
  }
  // Main ring
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2)
  ctx.strokeStyle = color; ctx.lineWidth = 4
  ctx.shadowColor = color; ctx.shadowBlur = 25
  ctx.stroke(); ctx.restore()
  // Inner ring
  ctx.save()
  ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2)
  ctx.strokeStyle = color; ctx.lineWidth = 1
  ctx.globalAlpha = 0.4
  ctx.stroke(); ctx.restore()
}

// ─── WELCOME ───────────────────────────────────────────────
export async function generateWelcomeImage(avatarBuffer, nomor) {
  const W = 1000, H = 520
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  // ── Background berlapis ──
  ctx.fillStyle = "#060606"; ctx.fillRect(0, 0, W, H)

  // Panel kiri gelap
  const panelL = ctx.createLinearGradient(0, 0, 380, H)
  panelL.addColorStop(0, "#0c0c00")
  panelL.addColorStop(1, "#080800")
  ctx.fillStyle = panelL; ctx.fillRect(0, 0, 380, H)

  // Panel kanan lebih gelap
  const panelR = ctx.createLinearGradient(380, 0, W, H)
  panelR.addColorStop(0, "#050505")
  panelR.addColorStop(1, "#080603")
  ctx.fillStyle = panelR; ctx.fillRect(380, 0, W - 380, H)

  // Divider vertikal kiri-kanan
  const divGrad = ctx.createLinearGradient(378, 0, 382, H)
  divGrad.addColorStop(0, "rgba(255,215,0,0)")
  divGrad.addColorStop(0.3, "rgba(255,215,0,0.6)")
  divGrad.addColorStop(0.7, "rgba(255,215,0,0.6)")
  divGrad.addColorStop(1, "rgba(255,215,0,0)")
  ctx.fillStyle = divGrad; ctx.fillRect(378, 0, 3, H)

  // Glow kiri
  const glowL = ctx.createRadialGradient(190, H/2, 0, 190, H/2, 300)
  glowL.addColorStop(0, "rgba(255,215,0,0.07)")
  glowL.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = glowL; ctx.fillRect(0, 0, 380, H)

  // Glow kanan atas
  const glowR = ctx.createRadialGradient(W * 0.7, 80, 0, W * 0.7, 80, 350)
  glowR.addColorStop(0, "rgba(255,215,0,0.06)")
  glowR.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = glowR; ctx.fillRect(380, 0, W - 380, H)

  // Particles
  drawParticles(ctx, W, H, "#ffd700", 80)

  // Scanlines
  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = "#000"
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1)
  ctx.restore()

  // Border luar
  ctx.save()
  ctx.strokeStyle = "#ffd700"; ctx.lineWidth = 2
  ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 20
  ctx.strokeRect(6, 6, W - 12, H - 12); ctx.restore()

  ctx.save()
  ctx.strokeStyle = "rgba(184,134,11,0.4)"; ctx.lineWidth = 1
  ctx.strokeRect(12, 12, W - 24, H - 24); ctx.restore()

  drawCorners(ctx, W, H, "#ffd700")

  // Diamond deco sudut kanan bawah
  drawDiamondDeco(ctx, W - 60, H - 60, 25, "#ffd700", 0.15)
  drawDiamondDeco(ctx, 60, 60, 18, "#ffd700", 0.1)

  // ── KIRI: Avatar ──
  const avatarImg = await loadAvatar(avatarBuffer)
  const cx = 190, cy = 230, r = 115

  // Glow lingkaran
  const radAv = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.2)
  radAv.addColorStop(0, "rgba(255,215,0,0.14)")
  radAv.addColorStop(0.5, "rgba(255,215,0,0.04)")
  radAv.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = radAv; ctx.fillRect(cx - r*2.5, cy - r*2.5, r*5, r*5)

  drawGlowRing(ctx, cx, cy, r, "#ffd700")
  drawCircleAvatar(ctx, avatarImg, cx, cy, r)

  // Tag nomor WA
  const tagW = 220, tagH = 36, tagX = cx - tagW/2, tagY = cy + r + 18
  const tagBg = ctx.createLinearGradient(tagX, tagY, tagX + tagW, tagY)
  tagBg.addColorStop(0, "rgba(255,215,0,0.0)")
  tagBg.addColorStop(0.5, "rgba(255,215,0,0.15)")
  tagBg.addColorStop(1, "rgba(255,215,0,0.0)")
  ctx.fillStyle = tagBg
  ctx.beginPath()
  ctx.roundRect(tagX, tagY, tagW, tagH, 18)
  ctx.fill()
  hline(ctx, tagX + 10, tagX + tagW - 10, tagY, "rgba(255,215,0,0.3)", 4)
  hline(ctx, tagX + 10, tagX + tagW - 10, tagY + tagH, "rgba(255,215,0,0.3)", 4)

  ctx.save()
  ctx.font = `bold 17px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "#ffd700"; ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 12
  ctx.fillText(nomor, cx, tagY + 24); ctx.restore()

  // ── KANAN: Konten ──
  const rx = 690 // center kanan

  // "WELCOME TO"
  ctx.save()
  ctx.font = `13px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(201,168,76,0.7)"; ctx.letterSpacing = "4px"
  ctx.fillText("✦  W E L C O M E  T O  ✦", rx, 90); ctx.restore()

  hline(ctx, rx - 200, rx + 200, 100, "rgba(255,215,0,0.15)", 4)

  // "LEGACY"
  ctx.save()
  ctx.font = `bold 82px ${F}`; ctx.textAlign = "center"
  const lgGrad = ctx.createLinearGradient(rx - 200, 0, rx + 200, 0)
  lgGrad.addColorStop(0, "#7a5800")
  lgGrad.addColorStop(0.25, "#ffd700")
  lgGrad.addColorStop(0.5, "#fffacd")
  lgGrad.addColorStop(0.75, "#ffd700")
  lgGrad.addColorStop(1, "#7a5800")
  ctx.fillStyle = lgGrad
  ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 35
  ctx.fillText("LEGACY", rx, 195); ctx.restore()

  // Garis bawah LEGACY
  hline(ctx, rx - 210, rx + 210, 208, "#ffd700", 10, 0.5)
  hline(ctx, rx - 150, rx + 150, 213, "rgba(255,215,0,0.2)", 4)

  // "UNITED • LOYAL • RESPECT"
  ctx.save()
  ctx.font = `bold 13px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(201,168,76,0.9)"; ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 6
  ctx.fillText("U N I T E D   •   L O Y A L   •   R E S P E C T", rx, 238); ctx.restore()

  // Diamond ornament tengah
  drawDiamondDeco(ctx, rx, 280, 22, "#ffd700", 0.18)

  // ── BAWAH: Introduction ──
  hline(ctx, 20, W - 20, H - 130, "#ffd700", 8, 0.6)

  // Label
  ctx.save()
  ctx.font = `bold 12px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(201,168,76,0.9)"; ctx.shadowColor = "#ffd700"; ctx.shadowBlur = 6
  ctx.fillText("✦   I N T R O D U C T I O N   ✦", W / 2, H - 108); ctx.restore()

  const fields = ["Nama :", "Umur :", "Askot :", "Asal Guild :", "Tujuan :"]
  const colW = (W - 80) / fields.length
  fields.forEach((f, i) => {
    const fx = 40 + colW * i + colW / 2
    ctx.save()
    ctx.font = `11px ${F}`; ctx.textAlign = "center"
    ctx.fillStyle = "#666"; ctx.fillText(f, fx, H - 86)
    const lineGrad = ctx.createLinearGradient(fx - colW/2 + 10, 0, fx + colW/2 - 10, 0)
    lineGrad.addColorStop(0, "rgba(255,215,0,0)")
    lineGrad.addColorStop(0.5, "rgba(255,215,0,0.35)")
    lineGrad.addColorStop(1, "rgba(255,215,0,0)")
    ctx.strokeStyle = lineGrad; ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(fx - colW/2 + 10, H - 72)
    ctx.lineTo(fx + colW/2 - 10, H - 72)
    ctx.stroke(); ctx.restore()
  })

  hline(ctx, 20, W - 20, H - 58, "#ffd700", 6, 0.4)

  ctx.save()
  ctx.font = `11px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(201,168,76,0.5)"
  ctx.fillText("⚔  L E G A C Y   G U I L D  ⚔", W / 2, H - 38)
  ctx.fillText("U N I T E D  •  L O Y A L  •  R E S P E C T", W / 2, H - 20)
  ctx.restore()

  return await canvas.encode("png")
}

// ─── LEAVE ─────────────────────────────────────────────────
export async function generateLeaveImage(avatarBuffer, nomor) {
  const W = 1000, H = 480
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext("2d")

  // ── Background berlapis ──
  ctx.fillStyle = "#060606"; ctx.fillRect(0, 0, W, H)

  const panelL = ctx.createLinearGradient(0, 0, 380, H)
  panelL.addColorStop(0, "#0d0000")
  panelL.addColorStop(1, "#080000")
  ctx.fillStyle = panelL; ctx.fillRect(0, 0, 380, H)

  const panelR = ctx.createLinearGradient(380, 0, W, H)
  panelR.addColorStop(0, "#060000")
  panelR.addColorStop(1, "#050303")
  ctx.fillStyle = panelR; ctx.fillRect(380, 0, W - 380, H)

  // Divider vertikal
  const divGrad = ctx.createLinearGradient(378, 0, 382, H)
  divGrad.addColorStop(0, "rgba(204,51,0,0)")
  divGrad.addColorStop(0.3, "rgba(204,51,0,0.7)")
  divGrad.addColorStop(0.7, "rgba(204,51,0,0.7)")
  divGrad.addColorStop(1, "rgba(204,51,0,0)")
  ctx.fillStyle = divGrad; ctx.fillRect(378, 0, 3, H)

  // Glow kiri merah
  const glowL = ctx.createRadialGradient(190, H/2, 0, 190, H/2, 300)
  glowL.addColorStop(0, "rgba(255,68,0,0.1)")
  glowL.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = glowL; ctx.fillRect(0, 0, 380, H)

  // Glow kanan atas
  const glowR = ctx.createRadialGradient(W * 0.7, 80, 0, W * 0.7, 80, 350)
  glowR.addColorStop(0, "rgba(200,30,0,0.07)")
  glowR.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = glowR; ctx.fillRect(380, 0, W - 380, H)

  drawParticles(ctx, W, H, "#ff4400", 70)

  ctx.save(); ctx.globalAlpha = 0.035; ctx.fillStyle = "#000"
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1)
  ctx.restore()

  ctx.save()
  ctx.strokeStyle = "#cc3300"; ctx.lineWidth = 2
  ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 20
  ctx.strokeRect(6, 6, W - 12, H - 12); ctx.restore()

  ctx.save()
  ctx.strokeStyle = "rgba(139,0,0,0.4)"; ctx.lineWidth = 1
  ctx.strokeRect(12, 12, W - 24, H - 24); ctx.restore()

  drawCorners(ctx, W, H, "#cc3300")
  drawDiamondDeco(ctx, W - 60, H - 60, 25, "#cc3300", 0.15)
  drawDiamondDeco(ctx, 60, 60, 18, "#cc3300", 0.1)

  // ── KIRI: Avatar ──
  const avatarImg = await loadAvatar(avatarBuffer)
  const cx = 190, cy = 215, r = 110

  const radAv = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2.2)
  radAv.addColorStop(0, "rgba(255,68,0,0.15)")
  radAv.addColorStop(0.5, "rgba(255,68,0,0.04)")
  radAv.addColorStop(1, "rgba(0,0,0,0)")
  ctx.fillStyle = radAv; ctx.fillRect(cx - r*2.5, cy - r*2.5, r*5, r*5)

  drawGlowRing(ctx, cx, cy, r, "#cc3300")
  drawCircleAvatar(ctx, avatarImg, cx, cy, r)

  // Tag nomor WA
  const tagW = 220, tagH = 36, tagX = cx - tagW/2, tagY = cy + r + 18
  const tagBg = ctx.createLinearGradient(tagX, tagY, tagX + tagW, tagY)
  tagBg.addColorStop(0, "rgba(204,51,0,0.0)")
  tagBg.addColorStop(0.5, "rgba(204,51,0,0.18)")
  tagBg.addColorStop(1, "rgba(204,51,0,0.0)")
  ctx.fillStyle = tagBg
  ctx.beginPath(); ctx.roundRect(tagX, tagY, tagW, tagH, 18); ctx.fill()
  hline(ctx, tagX + 10, tagX + tagW - 10, tagY, "rgba(204,51,0,0.4)", 4)
  hline(ctx, tagX + 10, tagX + tagW - 10, tagY + tagH, "rgba(204,51,0,0.4)", 4)

  ctx.save()
  ctx.font = `bold 17px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "#ff6600"; ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 12
  ctx.fillText(nomor, cx, tagY + 24); ctx.restore()

  // ── KANAN: Konten ──
  const rx = 690

  // "LEGACY"
  ctx.save()
  ctx.font = `bold 66px ${F}`; ctx.textAlign = "center"
  const lgGrad = ctx.createLinearGradient(rx - 180, 0, rx + 180, 0)
  lgGrad.addColorStop(0, "#6b0000")
  lgGrad.addColorStop(0.3, "#ff4400")
  lgGrad.addColorStop(0.6, "#ff8800")
  lgGrad.addColorStop(1, "#6b0000")
  ctx.fillStyle = lgGrad
  ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 30
  ctx.fillText("LEGACY", rx, 100); ctx.restore()

  hline(ctx, rx - 200, rx + 200, 112, "#cc3300", 8, 0.5)

  ctx.save()
  ctx.font = `bold 12px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(200,80,0,0.8)"
  ctx.fillText("U N I T E D   •   L O Y A L   •   R E S P E C T", rx, 134); ctx.restore()

  hline(ctx, rx - 180, rx + 180, 148, "rgba(204,51,0,0.25)", 3)

  // "GOODBYE MEMBER"
  ctx.save()
  ctx.font = `bold 46px ${F}`; ctx.textAlign = "center"
  const gbGrad = ctx.createLinearGradient(rx - 200, 0, rx + 200, 0)
  gbGrad.addColorStop(0, "#6b0000")
  gbGrad.addColorStop(0.35, "#ff4400")
  gbGrad.addColorStop(0.65, "#ff8800")
  gbGrad.addColorStop(1, "#6b0000")
  ctx.fillStyle = gbGrad
  ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 25
  ctx.fillText("GOODBYE MEMBER", rx, 205); ctx.restore()

  hline(ctx, rx - 200, rx + 200, 218, "rgba(204,51,0,0.35)", 5)

  // Kata-kata
  ctx.save()
  ctx.font = `bold 17px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(255,120,0,0.95)"; ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 8
  ctx.fillText("💔 ANJING... SATU LAGI CABUT. ☺️", rx, 252); ctx.restore()

  hline(ctx, rx - 190, rx + 190, 266, "rgba(204,51,0,0.3)", 3)

  ctx.save()
  ctx.font = `13px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(200,80,0,0.9)"; ctx.shadowColor = "#ff4400"; ctx.shadowBlur = 6
  ctx.fillText("🤝 SEMOGA SUKSES DAN JANGAN LUPA", rx, 292)
  ctx.fillText("BAYAR UTANG KALAU ADA YA ANJING 🗿", rx, 315); ctx.restore()

  // Ikon pintu kecil
  ctx.save()
  ctx.translate(rx, 365)
  ctx.strokeStyle = "#cc3300"; ctx.shadowColor = "#ff4400"
  ctx.shadowBlur = 10; ctx.lineWidth = 2; ctx.globalAlpha = 0.4
  ctx.strokeRect(-14, -19, 28, 38)
  ctx.beginPath(); ctx.arc(7, 0, 3, 0, Math.PI * 2); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(32, 0); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(26, -6); ctx.lineTo(32, 0); ctx.lineTo(26, 6); ctx.stroke()
  ctx.restore()

  // Footer
  hline(ctx, 20, W - 20, H - 48, "#cc3300", 6, 0.4)

  ctx.save()
  ctx.font = `11px ${F}`; ctx.textAlign = "center"
  ctx.fillStyle = "rgba(200,80,0,0.5)"
  ctx.fillText("⚔  L E G A C Y   G U I L D  ⚔", W / 2, H - 28)
  ctx.fillText("U N I T E D  •  L O Y A L  •  R E S P E C T", W / 2, H - 12)
  ctx.restore()

  return await canvas.encode("png")
}
