import type { AnyQuestion, OptionKey } from '../types'
import { TOPIC_IDS } from '../data/topics'
import { shuffle } from './random'
import type { ExamMode } from './progress'

// Como el examen real del permiso B: 30 preguntas, 30 minutos, apto con 3 fallos como máximo.
export const EXAM_SIZE = 30
export const EXAM_MS = 30 * 60 * 1000
export const MAX_WRONG = 3

/** Examen en curso: se guarda en IndexedDB para poder seguir si el móvil cierra la app. */
export interface ExamState {
  mode: ExamMode
  questionIds: string[]
  answers: Partial<Record<string, OptionKey>>
  usedRu: Record<string, true>
  usedGlossary: Record<string, true>
  startedAt: number
  index: number
}

export const examDeadline = (s: ExamState) => s.startedAt + EXAM_MS

/** 2 preguntas por tema (si hay) y el resto al azar, barajadas. */
export function pickExamQuestions(pool: AnyQuestion[], size = EXAM_SIZE): AnyQuestion[] {
  const perTopic = Math.max(1, Math.floor(size / TOPIC_IDS.length))
  const picked: AnyQuestion[] = []
  for (const topic of TOPIC_IDS) picked.push(...shuffle(pool.filter((q) => q.topic === topic)).slice(0, perTopic))
  const chosen = new Set(picked.map((q) => q.id))
  picked.push(...shuffle(pool.filter((q) => !chosen.has(q.id))).slice(0, Math.max(0, size - picked.length)))
  return shuffle(picked).slice(0, size)
}

export function newExam(mode: ExamMode, pool: AnyQuestion[]): ExamState {
  return {
    mode,
    questionIds: pickExamQuestions(pool).map((q) => q.id),
    answers: {},
    usedRu: {},
    usedGlossary: {},
    startedAt: Date.now(),
    index: 0,
  }
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
