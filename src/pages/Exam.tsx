import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { AnyQuestion, OptionKey } from '../types'
import { useT } from '../lib/i18n'
import { useSettings } from '../lib/settings'
import { navigate } from '../lib/router'
import { dbDel, dbGet, dbSet } from '../lib/db'
import { useAllQuestions, useProgress, type ExamMode, type ExamResult } from '../lib/progress'
import { EXAM_MS, MAX_WRONG, examDeadline, formatClock, newExam, type ExamState } from '../lib/exam'
import { QuestionView } from '../components/QuestionView'
import { BottomBar, ConfirmDialog, PrimaryButton, RuButton, SecondaryButton } from '../components/ui'
import { FavoriteButton } from '../components/FavoriteButton'

export function ExamPage({ mode }: { mode: ExamMode }) {
  const all = useAllQuestions()
  const [state, setState] = useState<ExamState | null>(null)
  const [result, setResult] = useState<ExamResult | null>(null)
  const byId = useMemo(() => new Map((all ?? []).map((q) => [q.id, q])), [all])

  const start = useCallback(async () => {
    if (!all) return
    const saved = await dbGet<ExamState>('currentExam')
    const resumable = saved && saved.mode === mode && examDeadline(saved) > Date.now() && saved.questionIds.every((id) => byId.has(id))
    const s = resumable ? saved : newExam(mode, all)
    if (!resumable) await dbSet('currentExam', s)
    setResult(null)
    setState(s)
  }, [all, byId, mode])

  useEffect(() => {
    void start()
  }, [start])

  if (!state) return null
  if (result) return <ExamResultView result={result} byId={byId} onRepeat={() => void dbDel('currentExam').then(start)} />
  return <ExamSession key={state.startedAt} initial={state} byId={byId} onFinish={setResult} />
}

function ExamSession({ initial, byId, onFinish }: { initial: ExamState; byId: Map<string, AnyQuestion>; onFinish: (r: ExamResult) => void }) {
  const t = useT()
  const { settings } = useSettings()
  const { recordAttempts, saveExam } = useProgress()
  const [state, setState] = useState(initial)
  const [now, setNow] = useState(Date.now())
  const [showGrid, setShowGrid] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const real = state.mode === 'real'
  const ruByDefault = !real && settings.translation === 'visible'
  const [showRu, setShowRu] = useState(ruByDefault)
  const finished = useRef(false)

  const id = state.questionIds[state.index]
  const q = byId.get(id)!
  const remaining = examDeadline(state) - now
  const answeredCount = state.questionIds.filter((qid) => state.answers[qid]).length

  useEffect(() => {
    void dbSet('currentExam', state)
  }, [state])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  // "Usó el ruso": si estaba visible (por ajuste o pulsando RU) mientras veía la pregunta.
  useEffect(() => {
    if (showRu && !state.usedRu[id]) setState((s) => ({ ...s, usedRu: { ...s.usedRu, [id]: true } }))
  }, [showRu, id, state.usedRu])

  const finish = useCallback(
    (timedOut: boolean) => {
      if (finished.current) return
      finished.current = true
      const now = Date.now()
      const items = state.questionIds.map((qid) => {
        const answer = state.answers[qid] ?? null
        return { questionId: qid, answer, correct: answer === byId.get(qid)!.correct, usedTranslation: Boolean(state.usedRu[qid]) }
      })
      const wrong = items.filter((i) => !i.correct).length
      const result: ExamResult = {
        id: `E-${now.toString(36)}`,
        mode: state.mode,
        startedAt: state.startedAt,
        finishedAt: now,
        total: items.length,
        wrong,
        unanswered: items.filter((i) => !i.answer).length,
        passed: wrong <= MAX_WRONG,
        timedOut,
        items,
      }
      recordAttempts(
        items
          .filter((i) => i.answer)
          .map((i) => ({
            questionId: i.questionId,
            answer: i.answer as OptionKey,
            correct: i.correct,
            usedTranslation: i.usedTranslation,
            usedGlossary: Boolean(state.usedGlossary[i.questionId]),
            mode: state.mode,
            timestamp: now,
          })),
      )
      saveExam(result)
      void dbDel('currentExam')
      onFinish(result)
    },
    [state, byId, recordAttempts, saveExam, onFinish],
  )

  useEffect(() => {
    if (remaining <= 0) finish(true)
  }, [remaining, finish])

  const goTo = (index: number) => {
    setState((s) => ({ ...s, index }))
    setShowRu(ruByDefault)
    setShowGrid(false)
    window.scrollTo(0, 0)
  }

  const isLast = state.index === state.questionIds.length - 1
  const markGlossary = useCallback(() => setState((s) => (s.usedGlossary[id] ? s : { ...s, usedGlossary: { ...s.usedGlossary, [id]: true } })), [id])

  return (
    <div className="mx-auto max-w-xl px-4 pb-32">
      <header className="sticky top-0 z-20 -mx-4 mb-3 bg-slate-50/95 px-4 pb-2 pt-2 backdrop-blur dark:bg-slate-950/95">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate('/')} aria-label={t('close')} className="flex h-11 w-11 items-center justify-center rounded-full text-2xl active:bg-slate-200 dark:active:bg-slate-800">
            ✕
          </button>
          <button type="button" onClick={() => setShowGrid((v) => !v)} className="flex-1 rounded-xl py-2 text-center font-semibold tabular-nums active:bg-slate-200 dark:active:bg-slate-800">
            {state.index + 1} / {state.questionIds.length} {showGrid ? '▴' : '▾'}
          </button>
          <span className={`min-w-16 rounded-xl px-2 py-1 text-center font-mono text-lg font-semibold tabular-nums ${remaining < 5 * 60 * 1000 ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : ''}`} aria-label={t('timeLeft')}>
            ⏱ {formatClock(remaining)}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${(answeredCount / state.questionIds.length) * 100}%` }} />
        </div>
        {showGrid && (
          <div className="mt-3 grid grid-cols-6 gap-2">
            {state.questionIds.map((qid, i) => (
              <button
                key={qid}
                type="button"
                onClick={() => goTo(i)}
                className={`h-10 rounded-lg text-sm font-semibold tabular-nums ${
                  state.answers[qid] ? 'bg-blue-600 text-white' : 'bg-white ring-1 ring-slate-300 dark:bg-slate-900 dark:ring-slate-700'
                } ${i === state.index ? 'outline-2 outline-offset-2 outline-amber-500' : ''}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </header>

      <QuestionView
        q={q}
        showRu={showRu}
        glossary={!real}
        selected={state.answers[id] ?? null}
        reveal={false}
        onSelect={(k) => setState((s) => ({ ...s, answers: { ...s.answers, [id]: k } }))}
        onGlossary={markGlossary}
      />
      <p className="mt-4 text-center text-sm text-slate-500">
        {answeredCount}/{state.questionIds.length} {t('answered')}
      </p>

      <BottomBar>
        {!real && <RuButton active={showRu} onClick={() => setShowRu((v) => !v)} />}
        <SecondaryButton disabled={state.index === 0} onClick={() => goTo(state.index - 1)} aria-label={t('prev')}>
          ‹
        </SecondaryButton>
        {isLast ? (
          <PrimaryButton onClick={() => setConfirming(true)}>{t('finish')}</PrimaryButton>
        ) : (
          <PrimaryButton onClick={() => goTo(state.index + 1)}>{t('next')} ›</PrimaryButton>
        )}
      </BottomBar>

      {confirming && (
        <ConfirmDialog
          message={`${t('finishConfirm')}${answeredCount < state.questionIds.length ? ` (${state.questionIds.length - answeredCount} ${t('unanswered')})` : ''}`}
          confirmLabel={t('finish')}
          onCancel={() => setConfirming(false)}
          onConfirm={() => finish(false)}
        />
      )}
    </div>
  )
}

function ExamResultView({ result, byId, onRepeat }: { result: ExamResult; byId: Map<string, AnyQuestion>; onRepeat: () => void }) {
  const t = useT()
  const [reviewing, setReviewing] = useState<'wrong' | 'all' | null>(null)
  const [index, setIndex] = useState(0)
  const [showRu, setShowRu] = useState(false)
  const items = reviewing === 'wrong' ? result.items.filter((i) => !i.correct) : result.items
  const ru = result.items.filter((i) => i.usedTranslation).length
  const minutes = Math.round(Math.min(result.finishedAt - result.startedAt, EXAM_MS) / 60000)

  if (reviewing && items.length) {
    const item = items[Math.min(index, items.length - 1)]
    const q = byId.get(item.questionId)!
    return (
      <div className="mx-auto max-w-xl px-4 pb-32">
        <header className="sticky top-0 z-20 -mx-4 mb-3 flex items-center gap-2 bg-slate-50/95 px-4 py-2 backdrop-blur dark:bg-slate-950/95">
          <button type="button" onClick={() => setReviewing(null)} aria-label={t('back')} className="flex h-11 w-11 items-center justify-center rounded-full text-2xl active:bg-slate-200 dark:active:bg-slate-800">
            ‹
          </button>
          <p className="flex-1 text-center font-semibold tabular-nums">
            {index + 1} / {items.length}
          </p>
          <FavoriteButton id={q.id} />
        </header>
        <QuestionView q={q} showRu={showRu} glossary selected={item.answer} reveal />
        <BottomBar>
          <RuButton active={showRu} onClick={() => setShowRu((v) => !v)} />
          <SecondaryButton disabled={index === 0} onClick={() => setIndex(index - 1)}>
            ‹
          </SecondaryButton>
          <PrimaryButton disabled={index >= items.length - 1} onClick={() => (setIndex(index + 1), window.scrollTo(0, 0))}>
            {t('next')} ›
          </PrimaryButton>
        </BottomBar>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">{result.mode === 'real' ? t('modeReal') : t('modeSimulado')}</h1>
      <div className={`rounded-2xl p-5 text-center ring-1 ${result.passed ? 'bg-emerald-50 ring-emerald-300 dark:bg-emerald-950/60 dark:ring-emerald-800' : 'bg-rose-50 ring-rose-300 dark:bg-rose-950/60 dark:ring-rose-800'}`}>
        {result.timedOut && <p className="mb-2 font-semibold text-amber-700 dark:text-amber-400">⏱ {t('timeUp')}</p>}
        <p className={`text-4xl font-black tracking-wide ${result.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
          {result.passed ? t('passed') : t('failed')}
        </p>
        <p className="mt-2 text-2xl font-semibold">
          {result.wrong} {t('mistakes')}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t('maxMistakes')}</p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          {result.total - result.wrong}/{result.total} · {minutes} min
          {result.unanswered > 0 && ` · ${result.unanswered} ${t('unanswered')}`}
        </p>
        {result.mode === 'simulado' && (
          <p className="mt-1 text-sm text-violet-700 dark:text-violet-300">
            {t('ruUsed')} {ru}/{result.total}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SecondaryButton disabled={result.wrong === 0} onClick={() => (setIndex(0), setReviewing('wrong'))}>
          {t('onlyWrong')}
        </SecondaryButton>
        <SecondaryButton onClick={() => (setIndex(0), setReviewing('all'))}>{t('all')}</SecondaryButton>
      </div>
      <div className="flex gap-3">
        <SecondaryButton className="flex-1" onClick={() => navigate('/')}>
          {t('home')}
        </SecondaryButton>
        <PrimaryButton onClick={onRepeat}>{t('repeat')}</PrimaryButton>
      </div>
    </main>
  )
}
