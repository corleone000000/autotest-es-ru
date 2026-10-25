import { useMemo, useState, type ReactNode } from 'react'
import { TOPICS } from '../data/topics'
import { useT, useUiLang } from '../lib/i18n'
import { useAllQuestions, useProgress } from '../lib/progress'
import { globalStats, ruByWeek, topicStats } from '../lib/stats'
import { Card, PageHeader } from '../components/ui'
import { ReadinessCard } from '../components/ReadinessCard'

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

function Tile({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </Card>
  )
}

/** Barras horizontales de % de acierto por tema: una serie, un solo tono, valor al final. */
function TopicBars() {
  const t = useT()
  const all = useAllQuestions()
  const { data } = useProgress()
  const stats = useMemo(() => (data && all ? topicStats(data.attempts, all) : null), [data, all])
  if (!stats) return null
  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t('byTopic')}</h2>
      <ul className="space-y-2.5">
        {TOPICS.map((tp, i) => {
          const s = stats.get(tp.id)
          const value = s ? pct(s.correct, s.total) : null
          return (
            <li key={tp.id} title={s ? `${s.correct}/${s.total}` : undefined}>
              <div className="flex justify-between gap-2 text-sm">
                <span className="truncate">
                  {i + 1}. {tp.es}
                </span>
                <span className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">{s ? `${value} % · ${s.total}` : '—'}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                {value !== null && <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${Math.max(value, 2)}%` }} />}
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** Uso del ruso por semana: debería bajar. Toque/hover en una barra para ver el detalle. */
function RuWeekly() {
  const t = useT()
  const lang = useUiLang()
  const { data } = useProgress()
  const weeks = useMemo(() => (data ? ruByWeek(data.attempts, 8) : []), [data])
  const [selected, setSelected] = useState(weeks.length - 1)
  if (!data) return null
  const fmt = (ts: number) => new Date(ts).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'es-ES', { day: 'numeric', month: 'numeric' })
  const sel = weeks[selected] ?? weeks[weeks.length - 1]
  const H = 120 // altura del área de dibujo en px

  return (
    <Card>
      <h2 className="font-semibold">{t('ruByWeek')}</h2>
      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{t('ruByWeekHint')}</p>
      <div className="relative" style={{ height: H }}>
        {/* Línea de objetivo (10 %) y rejilla recesiva */}
        <div className="absolute inset-x-0 border-t border-dashed border-slate-400/70" style={{ bottom: H * 0.1 }}>
          <span className="absolute -top-4 right-0 text-[10px] text-slate-500">10 %</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-300 dark:border-slate-700" />
        <div className="absolute inset-0 flex items-end gap-1.5">
          {weeks.map((w, i) => {
            const value = w.total ? w.ru / w.total : null
            return (
              <button
                key={w.week}
                type="button"
                onClick={() => setSelected(i)}
                onMouseEnter={() => setSelected(i)}
                aria-label={`${t('week')} ${fmt(w.week)}: ${value === null ? t('noData') : `${Math.round(value * 100)} %`}`}
                className="flex h-full flex-1 items-end justify-center"
              >
                {value === null ? (
                  <span className="mb-0.5 h-0.5 w-3/5 rounded bg-slate-300 dark:bg-slate-700" />
                ) : (
                  <span
                    className={`w-3/5 rounded-t-[4px] ${i === selected ? 'bg-violet-700 dark:bg-violet-400' : 'bg-violet-600 dark:bg-violet-500'}`}
                    style={{ height: Math.max(value * H, 3) }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
      <div className="mt-1 flex gap-1.5 text-center text-[10px] tabular-nums text-slate-500">
        {weeks.map((w, i) => (
          <span key={w.week} className={`flex-1 ${i === selected ? 'font-semibold text-slate-800 dark:text-slate-200' : ''}`}>
            {fmt(w.week)}
          </span>
        ))}
      </div>
      {sel && (
        <p className="mt-3 rounded-xl bg-slate-100 px-3 py-2 text-sm tabular-nums dark:bg-slate-800">
          {t('week')} {fmt(sel.week)}: {sel.total ? <strong>{pct(sel.ru, sel.total)} %</strong> : t('noData')}
          {sel.total > 0 && (
            <span className="text-slate-500">
              {' '}
              ({sel.ru}/{sel.total})
            </span>
          )}
        </p>
      )}
    </Card>
  )
}

function LastExams() {
  const t = useT()
  const lang = useUiLang()
  const { data } = useProgress()
  const exams = data?.exams.slice(-10).reverse() ?? []
  if (!exams.length) return null
  return (
    <Card>
      <h2 className="mb-2 font-semibold">{t('lastExams')}</h2>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {exams.map((e) => (
          <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
            <span className="w-20 shrink-0 tabular-nums text-slate-500">
              {new Date(e.finishedAt).toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'es-ES', { day: 'numeric', month: 'short' })}
            </span>
            <span className="flex-1">{e.mode === 'real' ? `🎓 ${t('modeReal')}` : t('modeSimulado')}</span>
            <span className="tabular-nums">
              {e.wrong} {t('mistakes')}
            </span>
            <span className={`w-24 text-right font-semibold ${e.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {e.passed ? `✓ ${t('passed')}` : `✗ ${t('failed')}`}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function StatsPage() {
  const t = useT()
  const { data } = useProgress()
  if (!data) return null
  const g = globalStats(data.attempts)
  const passed = data.exams.filter((e) => e.passed).length
  const failed = data.exams.length - passed

  return (
    <main className="mx-auto max-w-xl space-y-3 px-4 pb-10">
      <PageHeader title={t('stats')} />
      <ReadinessCard />
      <div className="grid grid-cols-3 gap-2">
        <Tile label={t('globalAccuracy')} value={g.total ? `${pct(g.correct, g.total)} %` : '—'} sub={`${g.correct}/${g.total}`} />
        <Tile label={t('answeredTotal')} value={g.total} />
        <Tile
          label={t('exams')}
          value={
            <>
              <span className="text-emerald-700 dark:text-emerald-400">{passed}</span>
              <span className="text-slate-400"> / </span>
              <span className="text-rose-700 dark:text-rose-400">{failed}</span>
            </>
          }
          sub={`✓ ${t('examsPassed')} / ✗ ${t('examsFailed')}`}
        />
      </div>
      <RuWeekly />
      <TopicBars />
      <LastExams />
    </main>
  )
}
