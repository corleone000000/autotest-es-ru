// Genera SVG propios de señales del Catálogo oficial (RGC anexo I) en public/images/senales/.
// Dibujos simplificados, no copias de las láminas oficiales. Uso: node scripts/make-signs.mjs
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const dir = fileURLToPath(new URL('../public/images/senales/', import.meta.url))
const RED = '#c8102e'
const BLUE = '#0051a5'
const FONT = 'font-family="Arial, Helvetica, sans-serif" font-weight="700" text-anchor="middle"'

const svg = (label, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="${label}">\n${body}\n</svg>\n`

const danger = (inner) =>
  `<path d="M100 14 L191 172 H9 Z" fill="#fff" stroke="${RED}" stroke-width="15" stroke-linejoin="round"/>\n${inner}`
const ring = (inner = '') => `<circle cx="100" cy="100" r="86" fill="#fff" stroke="${RED}" stroke-width="20"/>\n${inner}`
const blueDisc = (inner) => `<circle cx="100" cy="100" r="94" fill="${BLUE}" stroke="#fff" stroke-width="4"/>\n${inner}`
const car = (x, color) =>
  `<g fill="${color}"><path d="M${x} 112 q0-10 8-14 l8-20 q3-6 10-6 h20 q7 0 10 6 l8 20 q8 4 8 14 v18 h-72 z"/><rect x="${x + 4}" y="128" width="12" height="12" rx="2"/><rect x="${x + 56}" y="128" width="12" height="12" rx="2"/></g>`

const SIGNS = {
  'r-1': svg('Ceda el paso', `<path d="M10 28 H190 L100 186 Z" fill="#fff" stroke="${RED}" stroke-width="16" stroke-linejoin="round"/>`),
  'r-2': svg(
    'STOP',
    `<path d="M62 6 H138 L194 62 V138 L138 194 H62 L6 138 V62 Z" fill="${RED}" stroke="#fff" stroke-width="6"/>\n<text x="100" y="118" ${FONT} font-size="54" fill="#fff">STOP</text>`,
  ),
  'r-3': svg(
    'Calzada con prioridad',
    `<path d="M100 6 L194 100 L100 194 L6 100 Z" fill="#fff" stroke="#111" stroke-width="3"/>\n<path d="M100 40 L160 100 L100 160 L40 100 Z" fill="#f6c400"/>`,
  ),
  'r-100': svg('Circulación prohibida', ring()),
  'r-101': svg('Entrada prohibida', `<circle cx="100" cy="100" r="94" fill="${RED}"/>\n<rect x="34" y="84" width="132" height="32" fill="#fff"/>`),
  'r-301-60': svg('Velocidad máxima 60', ring(`<text x="100" y="128" ${FONT} font-size="80" fill="#111">60</text>`)),
  'r-411-30': svg('Velocidad mínima 30', blueDisc(`<text x="100" y="128" ${FONT} font-size="84" fill="#fff">30</text>`)),
  'r-305': svg('Adelantamiento prohibido', ring(`<g transform="translate(20 22) scale(0.8)">${car(28, RED)}\n${car(100, '#111')}</g>`)),
  'r-307': svg(
    'Parada y estacionamiento prohibido',
    `<circle cx="100" cy="100" r="86" fill="${BLUE}" stroke="${RED}" stroke-width="20"/>\n<path d="M42 42 L158 158 M158 42 L42 158" stroke="${RED}" stroke-width="18"/>`,
  ),
  'r-308': svg(
    'Estacionamiento prohibido',
    `<circle cx="100" cy="100" r="86" fill="${BLUE}" stroke="${RED}" stroke-width="20"/>\n<path d="M42 42 L158 158" stroke="${RED}" stroke-width="18"/>`,
  ),
  'r-402': svg(
    'Intersección de sentido giratorio obligatorio',
    blueDisc(
      [0, 120, 240]
        .map(
          (rot) =>
            `<g transform="rotate(${rot} 100 100)"><path d="M100 46 A54 54 0 0 0 54 73" fill="none" stroke="#fff" stroke-width="13"/><path d="M38 66 L64 60 L56 88 Z" fill="#fff"/></g>`,
        )
        .join('\n'),
    ),
  ),
  'p-50': svg('Otros peligros', danger(`<rect x="91" y="62" width="18" height="62" rx="4" fill="#111"/><circle cx="100" cy="143" r="10" fill="#111"/>`)),
  'p-25': svg(
    'Circulación en los dos sentidos',
    danger(
      `<path d="M78 72 V140" stroke="#111" stroke-width="11"/><path d="M64 128 L78 152 L92 128 Z" fill="#111"/>\n<path d="M122 84 V152" stroke="#111" stroke-width="11"/><path d="M108 96 L122 72 L136 96 Z" fill="#111"/>`,
    ),
  ),
}

await mkdir(dir, { recursive: true })
for (const [name, content] of Object.entries(SIGNS)) {
  await writeFile(join(dir, `${name}.svg`), content)
  console.log('✔', name)
}
