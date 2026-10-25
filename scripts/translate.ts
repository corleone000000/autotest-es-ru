// Traduce al ruso los campos "ru" vacíos del banco usando el glosario ES→RU.
// Uso:
//   npm run translate                      todos los temas, solo campos vacíos
//   npm run translate -- --topic velocidad un tema
//   npm run translate -- --force           re-traduce también los ya traducidos (tras cambiar el glosario)
//   npm run translate -- --dry-run         muestra qué se traduciría, sin llamar a la API
// Genera un informe de términos nuevos en scripts/out/ para revisarlos y, si procede, añadirlos al glosario.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { Question } from '../src/types.ts'
import { MODEL, QUESTIONS_DIR, ROOT, createClient, glossaryPrompt, loadGlossary, parseArgs, readTopic, writeTopic } from './lib/claude.ts'

const BATCH = 8

const Translation = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      a: z.string(),
      b: z.string(),
      c: z.string(),
      explanation: z.string(),
    }),
  ),
  newTerms: z
    .array(z.object({ es: z.string(), ru: z.string(), id: z.string().describe('id de la pregunta donde aparece') }))
    .describe('Términos de tráfico que no están en el glosario y has tenido que traducir'),
})

const needsTranslation = (q: Question) =>
  !q.question.ru.trim() || !q.explanation.ru.trim() || (['a', 'b', 'c'] as const).some((k) => !q.options[k].ru.trim())

const args = parseArgs()
const topics = typeof args.topic === 'string' ? [args.topic] : readdirSync(QUESTIONS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
const force = args.force === true
const dryRun = args['dry-run'] === true

const pending = topics.map((topic) => ({ topic, questions: readTopic(topic).filter((q) => force || needsTranslation(q)) }))
const total = pending.reduce((n, p) => n + p.questions.length, 0)
console.log(`${total} preguntas por traducir en ${pending.filter((p) => p.questions.length).length} tema(s).`)
if (dryRun || total === 0) {
  for (const p of pending) for (const q of p.questions) console.log(`  · ${q.id}  ${q.question.es}`)
  process.exit(0)
}

const client = createClient()
const glossary = loadGlossary()
const system = `Traduces al ruso preguntas del examen teórico del permiso de conducir español (DGT) para una alumna rusohablante.
Reglas:
- Traducción natural, precisa y fiel: no añadas ni quites información, no expliques la respuesta en el enunciado.
- Usa SIEMPRE estas traducciones para los términos de tráfico (si un término español no tiene equivalente exacto, deja el término español entre paréntesis tras la traducción la primera vez):
${glossaryPrompt(glossary)}
- Si una opción continúa la frase del enunciado ("...es"), tradúcela de forma que se lea natural en ruso.
- Mantén números, unidades y códigos de señales (R-301, V-16...) tal cual.
- En newTerms incluye los términos de tráfico que hayas tenido que traducir y que no estén en la lista.`

const newTerms: { es: string; ru: string; id: string }[] = []

for (const { topic, questions } of pending) {
  if (!questions.length) continue
  const all = readTopic(topic)
  const byId = new Map(all.map((q) => [q.id, q]))
  for (let i = 0; i < questions.length; i += BATCH) {
    const batch = questions.slice(i, i + BATCH)
    const input = batch.map((q) => ({ id: q.id, question: q.question.es, a: q.options.a.es, b: q.options.b.es, c: q.options.c.es, explanation: q.explanation.es }))
    process.stdout.write(`${topic}: ${i + 1}-${i + batch.length}/${questions.length}… `)
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: betaZodOutputFormat(Translation) },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Traduce estas preguntas:\n${JSON.stringify(input, null, 2)}` }],
    })
    const result = response.parsed_output
    if (response.stop_reason !== 'end_turn' || !result) {
      console.log(`✗ (${response.stop_reason}); se omite este lote`)
      continue
    }
    for (const t of result.items) {
      const q = byId.get(t.id)
      if (!q) continue
      const set = (current: string, value: string) => (force || !current.trim() ? value.trim() : current)
      q.question.ru = set(q.question.ru, t.question)
      q.options.a.ru = set(q.options.a.ru, t.a)
      q.options.b.ru = set(q.options.b.ru, t.b)
      q.options.c.ru = set(q.options.c.ru, t.c)
      q.explanation.ru = set(q.explanation.ru, t.explanation)
    }
    newTerms.push(...result.newTerms)
    writeTopic(topic, all) // se guarda tras cada lote para no perder trabajo
    console.log('✓')
  }
}

if (newTerms.length) {
  const outDir = join(ROOT, 'scripts/out')
  mkdirSync(outDir, { recursive: true })
  const file = join(outDir, `translation-report-${new Date().toISOString().slice(0, 10)}.md`)
  const lines = newTerms.map((t) => `| ${t.es} | ${t.ru} | ${t.id} |`)
  writeFileSync(file, `# Términos nuevos (no están en glossary.json)\n\nRevísalos y, si son correctos, añádelos a src/data/glossary.json y vuelve a traducir con --force.\n\n| ES | RU usado | Pregunta |\n|---|---|---|\n${lines.join('\n')}\n`)
  console.log(`Informe de términos nuevos: ${file}`)
}
console.log('Hecho. Ejecuta "npm run validate" para comprobar el banco.')
