import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../lib/i18n'
import { navigate } from '../lib/router'
import { dbDel, dbGet } from '../lib/db'
import { useAllQuestions, useProgress } from '../lib/progress'
import { examDeadline, formatClock, type ExamState } from '../lib/exam'
import { useMyQuestions } from '../lib/myQuestions'

function ModeCard({ title, desc, badge, onClick, primary }: { title: string; desc: string; badge?: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors ${
        primary ? 'bg-blue-700 text-white active:bg-blue-800' : 'bg-white ring-1 ring-slate-200 active:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:active:bg-slate-800'
      }`}
    >
      <span className="flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span className={`block text-sm ${primary ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>{desc}</span>
      </span>
      {badge}
      <span className={`text-2xl ${primary ? 'text-blue-200' : 'text-slate-400'}`}>›</span>
    </button>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold tabular-nums text-amber-800 dark:bg-amber-950 dark:text-amber-300">{children}</span>
}

function ContinueExam() {
  const t = useT()
  const [exam, setExam] = useState<ExamState | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    dbGet<ExamState>('currentExam').then((e) => setExam(e && examDeadline(e) > Date.now() ? e : null))
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  if (!exam || examDeadline(exam) <= now) return null
  return (
    <div className="rounded-2xl bg-amber-100 p-4 text-amber-950 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-semibold">
        {t('continueExam')} · {exam.mode === 'real' ? t('modeReal') : t('modeSimulado')}
      </p>
      <p className="text-sm tabular-nums">⏱ {formatClock(examDeadline(exam) - now)}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="h-11 flex-1 rounded-xl bg-amber-600 font-semibold text-white" onClick={() => navigate(`/examen/${exam.mode}`)}>
          {t('continueExam')}
        </button>
        <button type="button" className="h-11 rounded-xl px-4 font-medium" onClick={() => void dbDel('currentExam').then(() => setExam(null))}>
          {t('discard')}
        </button>
      </div>
    </div>
  )
}

export function Home() {
  const t = useT()
  const all = useAllQuestions()
  const { data } = useProgress()
  const { list: mine } = useMyQuestions()
  const reviewCount = all && data ? all.filter((q) => data.review[q.id]).length : 0
  const favCount = all && data ? all.filter((q) => data.favorites.includes(q.id)).length : 0

  return (
    <main className="mx-auto max-w-xl space-y-3 px-4 pb-10">
      <header className="flex items-start justify-between pb-1 pt-5">
        <div>
          <h1 className="text-3xl font-bold">{t('appName')}</h1>
          <p className="text-slate-600 dark:text-slate-400">{t('tagline')}</p>
        </div>
        <button type="button" onClick={() => navigate('/ajustes')} aria-label={t('settings')} className="flex h-12 w-12 items-center justify-center rounded-full text-2xl active:bg-slate-200 dark:active:bg-slate-800">
          ⚙️
        </button>
      </header>

      <ContinueExam />

      <ModeCard primary title={t('modeSimulado')} desc={t('modeSimuladoDesc')} onClick={() => navigate('/examen/simulado')} />
      <ModeCard title={t('modeTema')} desc={t('modeTemaDesc')} onClick={() => navigate('/temas')} />
      <ModeCard title={t('modeRepaso')} desc={t('modeRepasoDesc')} badge={reviewCount > 0 && <Badge>{reviewCount}</Badge>} onClick={() => navigate('/repaso')} />
      <ModeCard title={`⭐ ${t('modeFavoritas')}`} desc={t('modeFavoritasDesc')} badge={favCount > 0 && <Badge>{favCount}</Badge>} onClick={() => navigate('/favoritas')} />
      <ModeCard title={`🎓 ${t('modeReal')}`} desc={t('modeRealDesc')} onClick={() => navigate('/examen/real')} />

      <div className="grid grid-cols-2 gap-3 pt-2">
        <ModeCard title={`📷 ${t('modeMias')}`} desc={`${mine?.length ?? 0} ${t('questionsCount')}`} onClick={() => navigate(mine?.length ? '/mis-preguntas' : '/importar')} />
        <ModeCard title={`📊 ${t('stats')}`} desc={`${data?.attempts.length ?? 0} ${t('answered')}`} onClick={() => navigate('/estadisticas')} />
      </div>
    </main>
  )
}
