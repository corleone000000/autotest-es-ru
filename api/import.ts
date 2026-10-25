// Función serverless (Vercel): recibe una captura de un test, extrae las preguntas con Claude
// (visión + salida estructurada), las traduce al ruso con el glosario y las devuelve para revisar.
// La API key vive solo aquí, en la variable de entorno ANTHROPIC_API_KEY.
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { timingSafeEqual } from 'node:crypto'
import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import { z } from 'zod'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'
const MAX_IMAGE_BASE64 = 4_000_000 // Vercel limita el cuerpo a 4,5 MB; el cliente reduce la captura antes.

const Lang = z.object({ es: z.string(), ru: z.string() })

const RequestBody = z.object({
  image: z.string().min(100).max(MAX_IMAGE_BASE64),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  topics: z.array(z.object({ id: z.string().max(40), es: z.string().max(80) })).min(1).max(40),
})

const Extraction = z.object({
  questions: z.array(
    z.object({
      topic: z.string().describe('id del tema que mejor encaja, de la lista dada'),
      question: Lang,
      options: z.object({ a: Lang, b: Lang, c: Lang }),
      correct: z.enum(['a', 'b', 'c']),
      correctSource: z
        .enum(['captura', 'deducida'])
        .describe('"captura" si la captura indica la respuesta correcta; "deducida" si la has deducido tú'),
      explanation: Lang,
      imageBox: z
        .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
        .nullable()
        .describe('Recuadro de la imagen de la pregunta (señal o situación) en fracciones 0-1 del ancho y alto de la captura; null si no hay imagen'),
      notes: z.string().describe('Dudas o avisos para la revisión; cadena vacía si no hay'),
    }),
  ),
})

export type ImportResponse = z.infer<typeof Extraction>

interface GlossaryEntry {
  es: string
  ru: string
}

let systemPrompt: string | undefined

function buildSystemPrompt(): string {
  // includeFiles en vercel.json empaqueta el glosario junto a la función.
  const glossary: GlossaryEntry[] = JSON.parse(readFileSync(join(process.cwd(), 'src/data/glossary.json'), 'utf8'))
  const lines = glossary.map((g) => `${g.es} → ${g.ru}`).join('\n')
  return `Extraes preguntas del examen teórico del permiso B de la DGT (España) a partir de capturas de pantalla de tests de práctica que la usuaria hace con su propia cuenta de autoescuela, para su estudio personal.

Para cada pregunta visible en la captura:
1. Transcribe el enunciado y las tres opciones en español tal como aparecen, en el mismo orden (a, b, c), corrigiendo solo errores evidentes de lectura. Si una pregunta tiene más de tres opciones o está cortada, inclúyela igualmente y explícalo en "notes".
2. Respuesta correcta: si la captura la indica (marcada en verde, con un check, texto "correcta", etc.), úsala y pon correctSource "captura". Si solo se ve la respuesta marcada por la usuaria sin corrección, o no hay ninguna marca, decide tú la correcta según la normativa española vigente (Ley de Tráfico RDL 6/2015, Reglamento General de Circulación, de Vehículos y de Conductores) y pon correctSource "deducida". Si dudas, dilo en "notes".
3. Explicación en español: breve (1-3 frases), con tus propias palabras, diciendo por qué esa opción es la correcta y, si lo conoces con seguridad, el artículo de la norma. No inventes números de artículo.
4. Traduce al ruso el enunciado, las opciones y la explicación. Traducción natural y precisa, sin añadir información. Usa SIEMPRE estas traducciones para los términos de tráfico del glosario:
${lines}
5. imageBox: si la pregunta tiene una imagen asociada (señal, foto o esquema de una situación), da su recuadro en fracciones de 0 a 1 del ancho y alto totales de la captura (x, y = esquina superior izquierda). Si no hay imagen, null.
6. topic: el id del tema de la lista que mejor encaje.

Si la captura no contiene ninguna pregunta de examen, devuelve "questions": [].`
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

function send(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

async function readJson(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  // En Vercel el cuerpo ya viene parseado; en el servidor de desarrollo de Vite hay que leerlo.
  if (req.body !== undefined) return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > MAX_IMAGE_BASE64 + 100_000) throw new HttpError(413, 'Captura demasiado grande')
    chunks.push(chunk as Buffer)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw new HttpError(400, 'JSON no válido')
  }
}

function checkToken(req: IncomingMessage) {
  const expected = process.env.IMPORT_TOKEN
  if (!expected) return
  const given = String(req.headers['x-import-token'] ?? '')
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Clave de importación incorrecta (Ajustes → Clave de importación)')
}

export default async function handler(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Usa POST')
    checkToken(req)
    if (!process.env.ANTHROPIC_API_KEY) throw new HttpError(500, 'Falta ANTHROPIC_API_KEY en el servidor')

    const parsedBody = RequestBody.safeParse(await readJson(req))
    if (!parsedBody.success) throw new HttpError(400, 'Petición no válida')
    const { image, mediaType, topics } = parsedBody.data

    systemPrompt ??= buildSystemPrompt()
    const client = new Anthropic()
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      // Si el modelo rechazara la petición por política, el servidor reintenta con su fallback por defecto.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'high', format: betaZodOutputFormat(Extraction) },
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: `Temas disponibles (id: nombre):\n${topics.map((t) => `${t.id}: ${t.es}`).join('\n')}` },
          ],
        },
      ],
    })

    if (response.stop_reason === 'refusal') throw new HttpError(422, 'El modelo no ha podido procesar esta captura')
    if (response.stop_reason === 'max_tokens') throw new HttpError(502, 'Respuesta incompleta: prueba con una captura con menos preguntas')
    const result = response.parsed_output
    if (!result) throw new HttpError(502, 'No se pudo interpretar la respuesta del modelo')

    const topicIds = new Set(topics.map((t) => t.id))
    for (const q of result.questions) if (!topicIds.has(q.topic)) q.topic = topics[0].id
    send(res, 200, result)
  } catch (error) {
    if (error instanceof HttpError) return send(res, error.status, { error: error.message })
    if (error instanceof Anthropic.AuthenticationError) return send(res, 500, { error: 'ANTHROPIC_API_KEY no válida' })
    if (error instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'Demasiadas peticiones; espera un momento' })
    if (error instanceof Anthropic.APIError) return send(res, 502, { error: `Error de la API de Claude (${error.status ?? 'red'})` })
    console.error(error)
    send(res, 500, { error: 'Error inesperado' })
  }
}
