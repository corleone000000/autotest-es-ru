// Utilidades comunes de los scripts que usan la API de Claude.
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { GlossaryTerm, Question } from '../../src/types.ts'

export const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const QUESTIONS_DIR = join(ROOT, 'src/data/questions')
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5-5'

/** Crea el cliente leyendo la key de .env; si no hay key, explica la alternativa y termina. */
export function createClient(): Anthropic {
  try {
    process.loadEnvFile(join(ROOT, '.env'))
  } catch {
    /* sin .env: puede venir del entorno */
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('Falta ANTHROPIC_API_KEY. Créala en .env (ver README) o edita los campos "ru" a mano en src/data/questions/*.json.')
    process.exit(1)
  }
  return new Anthropic()
}

export function loadGlossary(): GlossaryTerm[] {
  return JSON.parse(readFileSync(join(ROOT, 'src/data/glossary.json'), 'utf8'))
}

export const glossaryPrompt = (terms: GlossaryTerm[]) => terms.map((g) => `${g.es} → ${g.ru}`).join('\n')

export function readTopic(topic: string): Question[] {
  return JSON.parse(readFileSync(join(QUESTIONS_DIR, `${topic}.json`), 'utf8'))
}

export function writeTopic(topic: string, questions: Question[]) {
  writeFileSync(join(QUESTIONS_DIR, `${topic}.json`), JSON.stringify(questions, null, 2) + '\n')
}

/** Lee "--clave valor" y "--bandera" de la línea de comandos. */
export function parseArgs(argv = process.argv.slice(2)): Record<string, string | true> {
  const out: Record<string, string | true> = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue
    const key = argv[i].slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      out[key] = next
      i++
    } else out[key] = true
  }
  return out
}
