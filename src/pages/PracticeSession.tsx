import { useCallback, useRef, useState } from 'react'
import type { AnyQuestion, Attempt, Mode, OptionKey } from '../types'
import { useSettings } from '../lib/settings'
import { useT } from '../lib/i18n'
import { navigate } from '../lib/router'
import { QuestionView } from '../components/QuestionView'
import { BottomBar, Card, PrimaryButton, RuButton, SecondaryButton } from '../components/ui'
import { FavoriteButton } from '../components/FavoriteButton'

interface Props {
  questions: AnyQuestion[]
  mode: Mode
  onAnswer?: (attempt: Attempt) => void
  onRestart?: () => void
}

/** Práctica con corrección inmediata: temas, repaso de fallos y favoritas. */
export function PracticeSession({ questions, mode, onAnswer, onRestart }: Props) {
  const t = useT()
  const { settings } = useSettings()
  const ruByDefault = settings.translation === 'visible'

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<OptionKey | null>(null)
  const [showRu, setShowRu] = useState(ruByDefault)
  const [results, setResults] = useState<Attempt[]>([])
  const [done, setDone] = useState(false)
  const usedRu = useRef(ruByDefault)
  const usedGlossary = useRef(false)

  const q = questions[index]

  const toggleRu = () => {
    setShowRu((visible) => {
      // Solo cuenta como "usó el ruso" si lo abre antes de responder.
      if (!visible && selected === null) usedRu.current = true
      return !visible
    })
  }

  const markGlossary = useCallback(() => {
    usedGlossary.current = true
  }, [])

  const answer = (k: OptionKey) => {
    if (selected) return
    setSelected(k)
    const attempt: Attempt = {
      questionId: q.id,
      answer: k,
      correct: k === q.correct,
      usedTranslation: usedRu.current,
      usedGlossary: usedGlossary.current,
      mode,
      timestamp: Date.now(),
    }
    setResults((r) => [...r, attempt])
    onAnswer?.(attempt)
  }

  const next = () => {
    if (index + 1 >= questions.length) {
      setDone(true)
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setShowRu(ruByDefault)
    usedRu.current = ruByDefault
    usedGlossary.current = false
    window.scrollTo(0, 0)
  }

  if (!q) return <p className="p-6 text-center text-slate-500">{t('noQuestions')}</p>

  if (done) {
    const correct = results.filter((r) => r.correct).length
    const ru = results.filter((r) => r.usedTranslation).length
    return (
      <div className="mx-auto max-w-xl space-y-4 p-4">
        <h1 className="text-2xl font-bold">{t('sessionDone')}</h1>
        <Card className="text-center">
          <p className="text-5xl font-bold">
            {correct}/{results.length}
          </p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{t('score')}</p>
          <p className="mt-3 text-sm text-violet-700 dark:text-violet-300">
            {t('ruUsed')} {ru}/{results.length}
          </p>
        </Card>
        <div className="flex gap-3">
          <SecondaryButton className="flex-1" onClick={() => navigate('/')}>
            {t('home')}
          </SecondaryButton>
          {onRestart && <PrimaryButton onClick={onRestart}>{t('repeat')}</PrimaryButton>}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-32">
      <SessionHeader index={index} total={questions.length} right={<FavoriteButton id={q.id} />} />
      <QuestionView q={q} showRu={showRu} glossary selected={selected} reveal={selected !== null} onSelect={answer} onGlossary={markGlossary} />
      <BottomBar>
        <RuButton active={showRu} onClick={toggleRu} />
        <PrimaryButton disabled={selected === null} onClick={next}>
          {index + 1 >= questions.length ? t('finish') : t('next')} →
        </PrimaryButton>
      </BottomBar>
    </div>
  )
}

export function SessionHeader({ index, total, right }: { index: number; total: number; right?: React.ReactNode }) {
  const t = useT()
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-3 bg-slate-50/95 px-4 pb-2 pt-2 backdrop-blur dark:bg-slate-950/95">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => navigate('/')} aria-label={t('close')} className="flex h-11 w-11 items-center justify-center rounded-full text-2xl active:bg-slate-200 dark:active:bg-slate-800">
          ✕
        </button>
        <p className="flex-1 text-center font-semibold tabular-nums">
          {t('question')} {index + 1} {t('of')} {total}
        </p>
        <div className="flex min-w-11 justify-end">{right}</div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
    </header>
  )
}
