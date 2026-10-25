import type { TopicId } from './data/topics'

export type { TopicId }

export type Lang = { es: string; ru: string }

export type OptionKey = 'a' | 'b' | 'c'

export const OPTION_KEYS: readonly OptionKey[] = ['a', 'b', 'c']

export interface Question {
  id: string // "B-SEN-0042"
  topic: TopicId
  question: Lang
  options: { a: Lang; b: Lang; c: Lang }
  correct: OptionKey
  explanation: Lang // por qué es la correcta
  ref?: string // norma en la que se basa: "RGC art. 48.1", "LSV anexo I, 55"...
  image?: string // /images/senales/r-301.svg
  video?: string // /videos/situacion-01.mp4 (pregunta de vídeo, examen DGT 2026)
  terms?: string[] // ids del glosario presentes en la pregunta
  source: 'dgt-modelo' | 'generada' | 'foto'
  needsReview?: boolean // respuesta pendiente de verificar contra la norma
}

/** Pregunta importada por captura: vive en IndexedDB, no en el JSON. */
export interface LocalQuestion extends Question {
  source: 'foto'
  createdAt: number
  imageBlob?: Blob
  videoBlob?: Blob
}

export type AnyQuestion = Question | LocalQuestion

export interface GlossaryTerm {
  id: string // "arcen"
  es: string // "arcén"
  ru: string // "обочина"
  forms?: string[] // formas que se buscan en el texto (plurales, variantes)
  note?: string
  basic?: boolean // solo para traducir: no se subraya en la pantalla de pregunta
}

export type Mode = 'tema' | 'simulado' | 'real' | 'repaso' | 'favoritas'

export interface Attempt {
  questionId: string
  answer: OptionKey
  correct: boolean
  usedTranslation: boolean // ¿abrió el ruso en esta pregunta?
  usedGlossary?: boolean // ¿consultó algún término del glosario?
  mode?: Mode
  timestamp: number
}
