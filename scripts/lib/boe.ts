// Acceso al texto consolidado oficial del BOE (API de datos abiertos).
// https://www.boe.es/datosabiertos/documentos/APIconsolidada.pdf

export const NORMAS = {
  LSV: 'BOE-A-2015-11722', // RDL 6/2015, Ley sobre Tráfico y Seguridad Vial
  RGC: 'BOE-A-2003-23514', // RD 1428/2003, Reglamento General de Circulación
  RGV: 'BOE-A-1999-1826', // RD 2822/1998, Reglamento General de Vehículos
  RGCond: 'BOE-A-2009-9481', // RD 818/2009, Reglamento General de Conductores
} as const

export type Norma = keyof typeof NORMAS

const BASE = 'https://www.boe.es/datosabiertos/api/legislacion-consolidada/id'

function xmlToText(xml: string): string {
  return xml
    .replace(/<\/(p|titulo|bloque|version)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { Accept: 'application/xml' } })
  if (!res.ok) throw new Error(`BOE ${res.status}: ${url}`)
  return res.text()
}

/** Lista de bloques (artículos, anexos...) de una norma: [{ id, titulo }]. */
export async function indice(norma: Norma): Promise<{ id: string; titulo: string }[]> {
  const xml = await get(`${BASE}/${NORMAS[norma]}/texto/indice`)
  return [...xml.matchAll(/<bloque>\s*<id>([^<]+)<\/id>\s*<titulo>([^<]*)<\/titulo>|<bloque>\s*<id>([^<]+)<\/id>\s*<titulo\/>/g)].map((m) => ({
    id: m[1] ?? m[3],
    titulo: m[2] ?? '',
  }))
}

/** Texto vigente de un bloque, p. ej. bloque('RGC', 'a48'). Solo la última versión. */
export async function bloque(norma: Norma, id: string): Promise<string> {
  const xml = await get(`${BASE}/${NORMAS[norma]}/texto/bloque/${id}`)
  const versiones = xml.split('<version ')
  const ultima = versiones.length > 1 ? '<version ' + versiones[versiones.length - 1] : xml
  return xmlToText(ultima)
}

// CLI: npx tsx scripts/lib/boe.ts RGC a48 [a49 ...]   |   npx tsx scripts/lib/boe.ts RGC indice
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/lib/boe.ts')) {
  const [norma, ...ids] = process.argv.slice(2) as [Norma, ...string[]]
  for (const id of ids) {
    if (id === 'indice') {
      for (const b of await indice(norma)) console.log(b.id.padEnd(14), b.titulo)
    } else {
      console.log(`===== ${norma} ${id} =====\n${await bloque(norma, id)}\n`)
    }
  }
}
