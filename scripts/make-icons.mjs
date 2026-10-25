// Genera los iconos PNG de la PWA a partir de public/icon.svg.
// Uso: npm run icons
import sharp from 'sharp'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const pub = fileURLToPath(new URL('../public/', import.meta.url))
const svg = await readFile(join(pub, 'icon.svg'))

const targets = [
  { file: 'pwa-192x192.png', size: 192 },
  { file: 'pwa-512x512.png', size: 512 },
  { file: 'apple-touch-icon-180x180.png', size: 180 },
]

for (const { file, size } of targets) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(join(pub, file))
  console.log('✔', file)
}

// Maskable: el dibujo ocupa el 70 % central para respetar la zona segura.
const inner = await sharp(svg, { density: 300 }).resize(358, 358).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#1d4ed8' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(join(pub, 'maskable-icon-512x512.png'))
console.log('✔ maskable-icon-512x512.png')
