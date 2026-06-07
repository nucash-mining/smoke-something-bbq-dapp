// Builds square icon + splash source images from the (portrait) brand logo,
// then @capacitor/assets turns them into every Android/iOS size.
//
// Seamless trick: we sample the logo's own background color and use it as the
// icon background, so the rectangular logo blends in with no visible border.

import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const SRC = 'public/logo.jpg'
const OUT = 'assets'
mkdirSync(OUT, { recursive: true })

const toHex = (r, g, b) =>
  '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')

// Sample a few corner pixels to find the logo's background color.
async function bgColor() {
  const img = sharp(SRC)
  const { width, height } = await img.metadata()
  const raw = await img.clone().raw().toBuffer({ resolveWithObject: true })
  const { data, info } = raw
  const ch = info.channels
  const at = (x, y) => {
    const i = (y * info.width + x) * ch
    return [data[i], data[i + 1], data[i + 2]]
  }
  const pts = [
    at(2, 2), at(info.width - 3, 2),
    at(2, info.height - 3), at(info.width - 3, info.height - 3),
    at((info.width / 2) | 0, 2),
  ]
  const avg = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
    .map((s) => Math.round(s / pts.length))
  return { hex: toHex(avg[0], avg[1], avg[2]), rgb: avg, width, height }
}

async function squareWithLogo(size, scale, bg) {
  // Resize logo to `scale` of the square (contain), center on a solid bg.
  const inner = Math.round(size * scale)
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: bg })
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
}

async function logoOnTransparent(size, scale, bg) {
  // Foreground for Android adaptive icons: logo (its own bg == icon bg) centered
  // on transparent, sized within the adaptive safe zone (~62%).
  const inner = Math.round(size * scale)
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: 'contain', background: bg })
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
}

const { hex, rgb } = await bgColor()
const bg = { r: rgb[0], g: rgb[1], b: rgb[2], alpha: 1 }
console.log('Sampled logo background:', hex)

// iOS / generic full icon (no transparency)
await (await squareWithLogo(1024, 0.8, bg)).toFile(`${OUT}/icon-only.png`)
// Android adaptive: solid background + foreground in the safe zone
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: bg } })
  .png().toFile(`${OUT}/icon-background.png`)
await (await logoOnTransparent(1024, 0.62, bg)).toFile(`${OUT}/icon-foreground.png`)
// Splashes (logo smaller, lots of breathing room)
await (await squareWithLogo(2732, 0.28, bg)).toFile(`${OUT}/splash.png`)
await (await squareWithLogo(2732, 0.28, bg)).toFile(`${OUT}/splash-dark.png`)

console.log('Wrote assets/: icon-only, icon-background, icon-foreground, splash, splash-dark')
// Print the colors so the generate step can use them.
console.log('ICON_BG=' + hex)
