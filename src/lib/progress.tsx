import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AnyQuestion, Attempt, OptionKey } from '../types'
import { BANK } from '../data/bank'
import { dbDelMany, dbGet, dbUpdate } from './db'
import { useMyQuestions } from './myQuestions'

/** Pregunta en "Repaso de fallos": sale al acertarla 3 veces seguidas. */
export interface ReviewEntry {
  streak: number
  since: number
}

export const REVIEW_STREAK_TO_CLEAR = 3

export type ExamMode = 'simulado' | 'real'

export interface ExamItem {
  questionId: string
  answer: OptionKey | null
  correct: boolean
  usedTranslation: boolean
}

export interface ExamResult {
  id: string
  mode: ExamMode
  startedAt: number
  finishedAt: number
  total: number
  wrong: number // incluye las no respondidas, como en el examen real
  unanswered: number
  passed: boolean
  timedOut: boolean
  items: ExamItem[]
}

interface ProgressData {
  attempts: Attempt[]
  favorites: string[]
  review: Record<string, ReviewEntry>
  exams: ExamResult[]
}

const EMPTY: ProgressData = { attempts: [], favorites: [], review: {}, exams: [] }

/** Aplica una tanda de respuestas al repaso de fallos (repetición espaciada simple). */
export function applyReview(review: Record<string, ReviewEntry>, attempts: Attempt[]): Record<string, ReviewEntry> {
  const next = { ...review }
  for (const a of attempts) {
    const entry = next[a.questionId]
    if (!a.correct) next[a.questionId] = { streak: 0, since: entry?.since ?? a.timestamp }
    else if (entry) {
      const streak = entry.streak + 1
      if (streak >= REVIEW_STREAK_TO_CLEAR) delete next[a.questionId]
      else next[a.questionId] = { ...entry, streak }
    }
  }
  return next
}

interface Ctx {
  data: ProgressData | null
  recordAttempts: (attempts: Attempt[]) => void
  toggleFavorite: (id: string) => void
  saveExam: (result: ExamResult) => void
  resetProgress: () => Promise<void>
}

const ProgressContext = createContext<Ctx>({
  data: null,
  recordAttempts: () => {},
  toggleFavorite: () => {},
  saveExam: () => {},
  resetProgress: async () => {},
})

export const PROGRESS_KEYS = ['attempts', 'favorites', 'review', 'exams', 'currentExam']

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProgressData | null>(null)

  useEffect(() => {
    Promise.all([
      dbGet<Attempt[]>('attempts'),
      dbGet<string[]>('favorites'),
      dbGet<Record<string, ReviewEntry>>('review'),
      dbGet<ExamResult[]>('exams'),
    ])
      .then(([attempts, favorites, review, exams]) =>
        setData({ attempts: attempts ?? [], favorites: favorites ?? [], review: review ?? {}, exams: exams ?? [] }),
      )
      .catch(() => setData(EMPTY))
  }, [])

  // El estado en memoria y IndexedDB se actualizan con la misma función pura.
  const recordAttempts = useCallback((list: Attempt[]) => {
    if (!list.length) return
    setData((d) => d && { ...d, attempts: [...d.attempts, ...list], review: applyReview(d.review, list) })
    void dbUpdate<Attempt[]>('attempts', (old) => [...(old ?? []), ...list])
    void dbUpdate<Record<string, ReviewEntry>>('review', (old) => applyReview(old ?? {}, list))
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    const toggle = (list: string[]) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
    setData((d) => d && { ...d, favorites: toggle(d.favorites) })
    void dbUpdate<string[]>('favorites', (old) => toggle(old ?? []))
  }, [])

  const saveExam = useCallback((result: ExamResult) => {
    setData((d) => d && { ...d, exams: [...d.exams, result] })
    void dbUpdate<ExamResult[]>('exams', (old) => [...(old ?? []), result])
  }, [])

  const resetProgress = useCallback(async () => {
    await dbDelMany(PROGRESS_KEYS)
    setData(EMPTY)
  }, [])

  return (
    <ProgressContext.Provider value={{ data, recordAttempts, toggleFavorite, saveExam, resetProgress }}>{children}</ProgressContext.Provider>
  )
}

export const useProgress = () => useContext(ProgressContext)

/** Banco + preguntas importadas (null mientras cargan las de IndexedDB). */
export function useAllQuestions(): AnyQuestion[] | null {
  const { list } = useMyQuestions()
  return useMemo(() => (list ? [...BANK, ...list] : null), [list])
}
