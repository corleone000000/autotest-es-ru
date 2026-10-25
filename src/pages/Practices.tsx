import { useMemo, useState } from 'react'
import type { AnyQuestion, Mode, TopicId } from '../types'
import { TOPICS } from '../data/topics'
import { useT } from '../lib/i18n'
import { navigate } from '../lib/router'
import { shuffle } from '../lib/random'
import { useAllQuestions, useProgress } from '../lib/progress'
import { topicStats } from '../lib/stats'
import { PracticeSession } from './PracticeSession'
import { Card, PageHeader } from '../components/ui'

/** Sesión de práctica con corrección inmediata que guarda cada respuesta. */
function RecordedPractice({ pick, mode, empty }: { pick: (all: AnyQuestion[]) => AnyQuestion[]; mode: Mode; empty: string }) {
  const t = useT()
  const all = useAllQuestions()
  const { data, recordAttempts } = useProgress()
  const [run, setRun] = useState(0)
  // Se elige una vez por sesión: responder no debe cambiar la lista en curso.
  const questions = useMemo(() => (all && data ? pick(all) : null), [all, data !== null, run]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!questions) return null
  if (!questions.length) {
    return (
      <main className="mx-auto max-w-xl px-4">
        <PageHeader title={t('home')} />
        <p className="py-10 text-center text-lg">{empty}</p>
      </main>
    )
  }
  return <PracticeSession key={run} questions={questions} mode={mode} onAnswer={(a) => recordAttempts([a])} onRestart={() => setRun((r) => r + 1)} />
}

export function TopicPractice({ topic, count }: { topic: string; count: number }) {
  const t = useT()
  return (
    <RecordedPractice
      mode="tema"
      empty={t('noQuestions')}
      pick={(all) => shuffle(topic === 'todos' ? all : all.filter((q) => q.topic === topic)).slice(0, count)}
    />
  )
}

export function ReviewPractice() {
  const t = useT()
  const { data } = useProgress()
  return (
    <RecordedPractice
      mode="repaso"
      empty={t('emptyReview')}
      pick={(all) => {
        const review = data?.review ?? {}
        // Primero las que llevan menos aciertos seguidos y las que se fallaron hace más tiempo.
        return all
          .filter((q) => review[q.id])
          .sort((a, b) => review[a.id].streak - review[b.id].streak || review[a.id].since - review[b.id].since)
          .slice(0, 20)
      }}
    />
  )
}

export function FavoritesPractice() {
  const t = useT()
  const { data } = useProgress()
  return <RecordedPractice mode="favoritas" empty={t('emptyFavorites')} pick={(all) => shuffle(all.filter((q) => data?.favorites.includes(q.id)))} />
}

export function TopicsPage() {
  const t = useT()
  const all = useAllQuestions()
  const { data } = useProgress()
  const [count, setCount] = useState(10)
  const stats = useMemo(() => (data && all ? topicStats(data.attempts, all) : null), [data, all])

  const counts = useMemo(() => {
    const m = new Map<TopicId, number>()
    for (const q of all ?? []) m.set(q.topic, (m.get(q.topic) ?? 0) + 1)
    return m
  }, [all])

  const row = (id: string, title: string, subtitle: string | null, n: number) => {
    const s = stats?.get(id as TopicId)
    const pct = s && s.total ? Math.round((s.correct / s.total) * 100) : null
    return (
      <button key={id} type="button" disabled={!n} onClick={() => navigate(`/tema/${id}/${count}`)} className="block w-full text-left disabled:opacity-40">
        <Card className="flex items-center gap-3 active:bg-slate-100 dark:active:bg-slate-800">
          <div className="flex-1">
            <p className="font-semibold">{title}</p>
            {subtitle && (
              <p lang="ru" className="text-sm text-violet-700 dark:text-violet-300">
                {subtitle}
              </p>
            )}
            <p className="text-sm text-slate-500">
              {n} {t('questionsCount')}
            </p>
          </div>
          {pct !== null && (
            <span className={`rounded-full px-2 py-1 text-sm font-semibold tabular-nums ${pct >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : pct >= 70 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
              {pct}%
            </span>
          )}
        </Card>
      </button>
    )
  }

  return (
    <main className="mx-auto max-w-xl space-y-3 px-4 pb-8">
      <PageHeader title={t('chooseTopic')} />
      <div className="flex items-center gap-3">
        <span className="font-medium">{t('howMany')}</span>
        {[10, 20].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            className={`h-11 w-16 rounded-xl text-lg font-semibold ${count === n ? 'bg-blue-700 text-white' : 'bg-white ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-slate-700'}`}
          >
            {n}
          </button>
        ))}
      </div>
      {row('todos', t('allTopics'), null, all?.length ?? 0)}
      {TOPICS.map((tp, i) => row(tp.id, `${i + 1}. ${tp.es}`, tp.ru, counts.get(tp.id) ?? 0))}
    </main>
  )
}
