import type { AnyQuestion, Attempt, TopicId } from '../types'
import type { ExamResult } from './progress'

export interface Tally {
  total: number
  correct: number
}

/** Aciertos por tema. Las respuestas a preguntas que ya no existen se ignoran. */
export function topicStats(attempts: Attempt[], questions: AnyQuestion[]): Map<TopicId, Tally> {
  const topicOf = new Map(questions.map((q) => [q.id, q.topic]))
  const out = new Map<TopicId, Tally>()
  for (const a of attempts) {
    const topic = topicOf.get(a.questionId)
    if (!topic) continue
    const s = out.get(topic) ?? { total: 0, correct: 0 }
    s.total++
    if (a.correct) s.correct++
    out.set(topic, s)
  }
  return out
}

export function globalStats(attempts: Attempt[]): Tally {
  return { total: attempts.length, correct: attempts.filter((a) => a.correct).length }
}

const DAY = 24 * 60 * 60 * 1000

/** Lunes 00:00 (hora local) de la semana de una fecha. */
export function weekStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

export interface WeekRu {
  week: number // timestamp del lunes
  total: number
  ru: number
}

/** % de preguntas en las que abrió el ruso, por semana (las últimas `weeks`, incluida la actual). */
export function ruByWeek(attempts: Attempt[], weeks = 8, now = Date.now()): WeekRu[] {
  const current = weekStart(now)
  const out: WeekRu[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(current)
    d.setDate(d.getDate() - 7 * i)
    out.push({ week: d.getTime(), total: 0, ru: 0 })
  }
  const index = new Map(out.map((w, i) => [w.week, i]))
  for (const a of attempts) {
    const i = index.get(weekStart(a.timestamp))
    if (i === undefined) continue
    out[i].total++
    if (a.usedTranslation) out[i].ru++
  }
  return out
}

export type Readiness = 'green' | 'yellow' | 'red'

export interface ReadinessInfo {
  level: Readiness
  recentExams: number // cuántos de los últimos 10 simulacros hay
  recentPassed: number
  passRate: number | null // 0-1
  ruRate: number | null // 0-1, últimos 14 días
  ruSample: number
}

/**
 * Semáforo "¿estoy lista?": verde si aprueba ≥85 % de los últimos 10 simulacros
 * (hacen falta los 10) y usa el ruso en <10 % de las preguntas de los últimos 14 días.
 */
export function readiness(attempts: Attempt[], exams: ExamResult[], now = Date.now()): ReadinessInfo {
  const last = exams.slice(-10)
  const recentPassed = last.filter((e) => e.passed).length
  const passRate = last.length ? recentPassed / last.length : null
  const recent = attempts.filter((a) => a.timestamp >= now - 14 * DAY)
  const ruRate = recent.length ? recent.filter((a) => a.usedTranslation).length / recent.length : null

  let level: Readiness = 'red'
  if (last.length >= 10 && passRate !== null && passRate >= 0.85 && ruRate !== null && ruRate < 0.1) level = 'green'
  else if (passRate !== null && passRate >= 0.6 && (ruRate === null || ruRate < 0.25)) level = 'yellow'
  return { level, recentExams: last.length, recentPassed, passRate, ruRate, ruSample: recent.length }
}
