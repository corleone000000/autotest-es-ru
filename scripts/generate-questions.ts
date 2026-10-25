// Genera borradores de preguntas ORIGINALES de un tema a partir del texto vigente de la normativa (BOE).
// Uso:
//   npm run generate -- --topic velocidad --count 10
//   npm run generate -- --topic senales --count 5 --blocks RGC:a133,RGC:A4
// Las preguntas se añaden al final de src/data/questions/<tema>.json con "needsReview": true y los campos
// "ru" vacíos: revísalas contra la norma, quita needsReview y tradúcelas con "npm run translate".
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'
import type { Question, TopicId } from '../src/types.ts'
import { TOPICS } from '../src/data/topics.ts'
import { bloque, type Norma } from './lib/boe.ts'
import { MODEL, createClient, parseArgs, readTopic, writeTopic } from './lib/claude.ts'

// Artículos del texto consolidado que sirven de base a cada tema (norma:bloque).
const SOURCES: Record<TopicId, string[]> = {
  definiciones: ['LSV:ani'],
  senales: ['RGC:a133', 'RGC:a144', 'RGC:a145', 'RGC:a167', 'RGC:a171', 'RGC:A1', 'RGC:A4'],
  velocidad: ['RGC:a45', 'RGC:a46', 'RGC:a48', 'RGC:a49', 'RGC:a50', 'RGC:a52', 'RGC:a53', 'RGC:a54'],
  prioridad: ['RGC:a56', 'RGC:a57', 'RGC:a58', 'RGC:a59', 'RGC:a60', 'RGC:a61', 'RGC:a62', 'RGC:a63', 'RGC:a64', 'RGC:a65', 'RGC:a67', 'RGC:a68', 'RGC:a69'],
  adelantamientos: ['RGC:a82', 'RGC:a83', 'RGC:a84', 'RGC:a85', 'RGC:a86', 'RGC:a87', 'RGC:a88'],
  parada: ['RGC:a90', 'RGC:a91', 'RGC:a92', 'RGC:a94'],
  alumbrado: ['RGC:a98', 'RGC:a99', 'RGC:a100', 'RGC:a101', 'RGC:a102', 'RGC:a104', 'RGC:a105', 'RGC:a106', 'RGC:a107'],
  alcohol: ['RGC:a20', 'RGC:a21', 'RGC:a22', 'RGC:a23', 'RGC:a27', 'RGC:a28', 'LSV:a14'],
  documentacion: ['RGCond:a3', 'RGCond:a4', 'RGCond:a12', 'LSV:a63', 'LSV:a64', 'LSV:a65'],
  seguridad: ['RGC:a116', 'RGC:a117', 'RGC:a118', 'RGC:a119'],
  mecanica: ['RGV:a10', 'RGV:anvii', 'RGV:anxii'],
  auxilios: ['RGC:a129', 'RGC:a130', 'LSV:a51'],
  eficiente: ['RGC:a7', 'RGC:a157'],
  autopistas: ['RGC:a31', 'RGC:a32', 'RGC:a36', 'RGC:a38', 'RGC:a72', 'RGC:a79', 'RGC:a80'],
  carga: ['RGC:a9', 'RGC:a10', 'RGC:a12', 'RGC:a14', 'RGC:a15', 'RGC:a154'],
}

const Draft = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      a: z.string(),
      b: z.string(),
      c: z.string(),
      correct: z.enum(['a', 'b', 'c']),
      explanation: z.string(),
      ref: z.string().describe('Norma y artículo exactos del texto dado, p. ej. "RGC art. 48.1"'),
    }),
  ),
})

const args = parseArgs()
const topic = TOPICS.find((t) => t.id === args.topic)
if (!topic) {
  console.error(`Indica --topic con uno de: ${TOPICS.map((t) => t.id).join(', ')}`)
  process.exit(1)
}
const count = Math.min(Number(args.count) || 10, 30)
const blocks = typeof args.blocks === 'string' ? args.blocks.split(',') : SOURCES[topic.id]
const client = createClient()

console.log(`Descargando del BOE: ${blocks.join(', ')}`)
const texts: string[] = []
for (const b of blocks) {
  const [norma, id] = b.split(':') as [Norma, string]
  texts.push(`### ${norma} ${id}\n${await bloque(norma, id)}`)
}

const existing = readTopic(topic.id)
console.log(`Generando ${count} preguntas de "${topic.es}" con ${MODEL}…`)

const response = await client.beta.messages.parse({
  model: MODEL,
  max_tokens: 32000,
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
  output_config: { effort: 'high', format: betaZodOutputFormat(Draft) },
  system: `Redactas preguntas ORIGINALES para practicar el examen teórico del permiso B de la DGT (España).
Reglas:
- Basa cada pregunta exclusivamente en el texto normativo vigente que se te da; no uses datos que no estén en él.
- Formato DGT: enunciado + tres opciones (a, b, c), solo una correcta. Distractores plausibles, nunca absurdos ni de broma.
- No copies preguntas de bancos comerciales (Todotest, PracticaTest...). Redacta con tus propias palabras.
- Reparte la respuesta correcta entre a, b y c de forma equilibrada.
- La explicación (1-3 frases) dice por qué es correcta. En "ref" pon la norma y el artículo exactos ("RGC art. 48.1", "LSV anexo I, 61").
- No repitas preguntas que ya existen en el banco.`,
  messages: [
    {
      role: 'user',
      content: `Tema: ${topic.es}\n\nTexto normativo vigente (BOE):\n${texts.join('\n\n').slice(0, 120_000)}\n\nPreguntas que ya existen (no las repitas):\n${existing
        .map((q) => `- ${q.question.es}`)
        .join('\n')}\n\nRedacta ${count} preguntas nuevas.`,
    },
  ],
})

const result = response.parsed_output
if (response.stop_reason !== 'end_turn' || !result) {
  console.error(`No se pudo generar (${response.stop_reason}).`)
  process.exit(1)
}

let next = Math.max(0, ...existing.map((q) => Number(q.id.split('-')[2]) || 0))
const added: Question[] = result.questions.map((d) => ({
  id: `B-${topic.code}-${String(++next).padStart(4, '0')}`,
  topic: topic.id,
  source: 'generada',
  ref: d.ref,
  question: { es: d.question, ru: '' },
  options: { a: { es: d.a, ru: '' }, b: { es: d.b, ru: '' }, c: { es: d.c, ru: '' } },
  correct: d.correct,
  explanation: { es: d.explanation, ru: '' },
  needsReview: true, // generadas por IA: una persona debe comprobarlas contra la norma
}))

writeTopic(topic.id, [...existing, ...added])
console.log(`✓ ${added.length} preguntas añadidas a src/data/questions/${topic.id}.json (needsReview: true).`)
console.log(`Siguiente paso: revisarlas, y después "npm run translate -- --topic ${topic.id}" y "npm run validate".`)
