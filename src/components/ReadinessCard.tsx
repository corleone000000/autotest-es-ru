import { useMemo } from 'react'
import { useT } from '../lib/i18n'
import { navigate } from '../lib/router'
import { useProgress } from '../lib/progress'
import { readiness, type Readiness } from '../lib/stats'

const LIGHTS: Record<Readiness, { icon: string; key: 'readyGreen' | 'readyYellow' | 'readyRed'; tone: string }> = {
  green: { icon: '✅', key: 'readyGreen', tone: 'bg-emerald-50 ring-emerald-300 dark:bg-emerald-950/50 dark:ring-emerald-800' },
  yellow: { icon: '⚠️', key: 'readyYellow', tone: 'bg-amber-50 ring-amber-300 dark:bg-amber-950/50 dark:ring-amber-800' },
  red: { icon: '⛔', key: 'readyRed', tone: 'bg-rose-50 ring-rose-300 dark:bg-rose-950/50 dark:ring-rose-800' },
}

const LAMP: Record<Readiness, string> = { red: 'bg-rose-500', yellow: 'bg-amber-400', green: 'bg-emerald-500' }

function Meter({ label, value, target, good, display }: { label: string; value: number | null; target: string; good: boolean; display: string }) {
  return (
    <div>
      <div className="flex justify-between gap-2 text-sm">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="font-semibold tabular-nums">
          {display} <span className="font-normal text-slate-500">({target})</span> {value !== null && (good ? '✓' : '✗')}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-slate-500 dark:bg-slate-400" style={{ width: `${Math.round((value ?? 0) * 100)}%` }} />
      </div>
    </div>
  )
}

/** Semáforo "¿estoy lista?" (sección 5 del CLAUDE.md). */
export function ReadinessCard({ compact }: { compact?: boolean }) {
  const t = useT()
  const { data } = useProgress()
  const info = useMemo(() => (data ? readiness(data.attempts, data.exams) : null), [data])
  if (!info) return null
  const light = LIGHTS[info.level]

  return (
    <section className={`rounded-2xl p-4 ring-1 ${light.tone}`} aria-label={t('readyTitle')}>
      <div className="flex items-center gap-4">
        <div className="flex flex-col gap-1.5 rounded-full bg-slate-900 p-1.5" aria-hidden>
          {(['red', 'yellow', 'green'] as Readiness[]).map((l) => (
            <span key={l} className={`h-4 w-4 rounded-full ${l === info.level ? LAMP[l] : 'bg-slate-700'}`} />
          ))}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-400">{t('readyTitle')}</p>
          <p className="text-xl font-bold">
            {light.icon} {t(light.key)}
          </p>
        </div>
        {compact && (
          <button type="button" onClick={() => navigate('/estadisticas')} className="rounded-xl px-3 py-2 text-sm font-semibold text-blue-700 active:bg-white/50 dark:text-blue-400">
            📊 ›
          </button>
        )}
      </div>
      {!compact && (
        <div className="mt-4 space-y-3">
          <Meter
            label={t('examsPassedRecent')}
            value={info.passRate}
            target="≥85 %"
            good={info.recentExams >= 10 && (info.passRate ?? 0) >= 0.85}
            display={info.recentExams ? `${info.recentPassed}/${info.recentExams}` : '—'}
          />
          <Meter
            label={t('ruRecent')}
            value={info.ruRate}
            target="<10 %"
            good={(info.ruRate ?? 1) < 0.1}
            display={info.ruRate === null ? '—' : `${Math.round(info.ruRate * 100)} %`}
          />
          <p className="text-xs text-slate-500">{t('readyRule')}</p>
        </div>
      )}
    </section>
  )
}
