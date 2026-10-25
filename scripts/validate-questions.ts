// Valida el banco de preguntas y el glosario. Se ejecuta antes de cada build.
// Uso: npm run validate
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TOPICS } from '../src/data/topics.ts'
import type { GlossaryTerm, Question } from '../src/types.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const qdir = join(root, 'src/data/questions')
const errors: string[] = []
const warnings: string[] = []

const topicCodes = new Map<string, string>(TOPICS.map((t) => [t.id, t.code]))
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const all: Question[] = []
for (const file of readdirSync(qdir).filter((f) => f.endsWith('.json'))) {
  let list: Question[]
  try {
    list = JSON.parse(readFileSync(join(qdir, file), 'utf8'))
  } catch (e) {
    errors.push(`${file}: JSON inválido (${(e as Error).message})`)
    continue
  }
  if (!Array.isArray(list)) {
    errors.push(`${file}: debe ser un array`)
    continue
  }
  for (const q of list) {
    const where = `${file} › ${q.id ?? '(sin id)'}`
    const code = topicCodes.get(q.topic)
    if (!code) errors.push(`${where}: tema desconocido "${q.topic}"`)
    if (file !== `${q.topic}.json`) errors.push(`${where}: el tema "${q.topic}" no coincide con el archivo`)
    if (!new RegExp(`^B-${code}-\\d{4}$`).test(q.id)) errors.push(`${where}: id con formato incorrecto (esperado B-${code}-NNNN)`)
    if (!q.question?.es?.trim()) errors.push(`${where}: falta el enunciado en español`)
    for (const k of ['a', 'b', 'c'] as const) {
      if (!q.options?.[k]?.es?.trim()) errors.push(`${where}: falta la opción ${k} en español`)
      if (typeof q.options?.[k]?.ru !== 'string') errors.push(`${where}: la opción ${k} no tiene campo ru`)
    }
    if (q.options && Object.keys(q.options).length !== 3) errors.push(`${where}: debe tener exactamente 3 opciones`)
    if (!['a', 'b', 'c'].includes(q.correct)) errors.push(`${where}: "correct" debe ser a, b o c`)
    if (!q.explanation?.es?.trim()) errors.push(`${where}: falta la explicación`)
    if (!['dgt-modelo', 'generada', 'foto'].includes(q.source)) errors.push(`${where}: "source" no válido`)
    if (q.source === 'generada' && !q.ref?.trim()) errors.push(`${where}: falta "ref" (artículo o anexo en que se basa)`)
    for (const media of [q.image, q.video]) {
      if (media && !existsSync(join(root, 'public', media))) errors.push(`${where}: no existe public${media}`)
    }
    const opts = q.options ? Object.values(q.options).map((o) => norm(o.es)) : []
    if (new Set(opts).size !== opts.length) errors.push(`${where}: opciones repetidas`)
    all.push(q)
  }
}

// Ids y enunciados únicos (mismo enunciado + mismas opciones = duplicado).
const ids = new Map<string, number>()
const texts = new Map<string, string>()
for (const q of all) {
  ids.set(q.id, (ids.get(q.id) ?? 0) + 1)
  const key = norm(q.question.es) + '|' + Object.values(q.options).map((o) => norm(o.es)).sort().join('|')
  const prev = texts.get(key)
  if (prev) errors.push(`${q.id}: duplicada de ${prev}`)
  else texts.set(key, q.id)
}
for (const [id, n] of ids) if (n > 1) errors.push(`${id}: id repetido ${n} veces`)

// Reparto de respuestas correctas por tema.
console.log('\nTema                         Preg.   a    b    c   sin RU')
for (const t of TOPICS) {
  const qs = all.filter((q) => q.topic === t.id)
  if (!qs.length) continue
  const count = { a: 0, b: 0, c: 0 }
  qs.forEach((q) => count[q.correct]++)
  const missingRu = qs.filter((q) => !q.question.ru || !q.explanation.ru || Object.values(q.options).some((o) => !o.ru)).length
  console.log(`${t.es.padEnd(28)} ${String(qs.length).padStart(5)} ${String(count.a).padStart(4)} ${String(count.b).padStart(4)} ${String(count.c).padStart(4)} ${String(missingRu).padStart(6)}`)
  if (qs.length >= 9) {
    for (const k of ['a', 'b', 'c'] as const) {
      const share = count[k] / qs.length
      if (share < 0.25 || share > 0.42) warnings.push(`${t.es}: la opción ${k} es la correcta en el ${Math.round(share * 100)} % de las preguntas`)
    }
  }
}
console.log(`${'TOTAL'.padEnd(28)} ${String(all.length).padStart(5)}`)

// Glosario.
const glossary: GlossaryTerm[] = JSON.parse(readFileSync(join(root, 'src/data/glossary.json'), 'utf8'))
const gids = new Set<string>()
for (const g of glossary) {
  if (gids.has(g.id)) errors.push(`glosario: id repetido "${g.id}"`)
  gids.add(g.id)
  if (!g.es?.trim() || !g.ru?.trim()) errors.push(`glosario: "${g.id}" sin es/ru`)
}
console.log(`Glosario: ${glossary.length} términos`)

const review = all.filter((q) => q.needsReview)
if (review.length) {
  console.log(`\nPendientes de revisión (needsReview): ${review.length}`)
  for (const q of review) console.log(`  · ${q.id}  ${q.question.es}`)
}
for (const w of warnings) console.warn(`⚠ ${w}`)
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`)
  console.error(`\n${errors.length} error(es) en el banco de preguntas.`)
  process.exit(1)
}
console.log('\n✓ Banco de preguntas válido')
