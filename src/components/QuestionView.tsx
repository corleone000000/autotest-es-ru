import type { AnyQuestion, Lang, OptionKey } from '../types'
import { OPTION_KEYS } from '../types'
import { formatRef } from '../lib/refs'
import { useT } from '../lib/i18n'
import { GlossaryScope } from './Glossary'
import { Bi } from './Bilingual'
import { QuestionMedia } from './Media'

type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'dim'

const OPTION_STYLES: Record<OptionState, string> = {
  idle: 'bg-white ring-1 ring-slate-200 active:bg-slate-100 dark:bg-slate-900 dark:ring-slate-700 dark:active:bg-slate-800',
  selected: 'bg-blue-50 ring-2 ring-blue-600 dark:bg-blue-950 dark:ring-blue-400',
  correct: 'bg-emerald-50 ring-2 ring-emerald-600 dark:bg-emerald-950 dark:ring-emerald-400',
  wrong: 'bg-rose-50 ring-2 ring-rose-600 dark:bg-rose-950 dark:ring-rose-400',
  dim: 'bg-white ring-1 ring-slate-200 opacity-60 dark:bg-slate-900 dark:ring-slate-700',
}

const BADGE_STYLES: Record<OptionState, string> = {
  idle: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  selected: 'bg-blue-600 text-white',
  correct: 'bg-emerald-600 text-white',
  wrong: 'bg-rose-600 text-white',
  dim: 'bg-slate-100 text-slate-500 dark:bg-slate-800',
}

function optionState(k: OptionKey, q: AnyQuestion, selected: OptionKey | null, reveal: boolean): OptionState {
  if (!reveal) return selected === k ? 'selected' : 'idle'
  if (k === q.correct) return 'correct'
  if (k === selected) return 'wrong'
  return 'dim'
}

interface Props {
  q: AnyQuestion
  showRu: boolean
  glossary: boolean
  selected: OptionKey | null
  reveal: boolean // corrección visible (verde/rojo + explicación)
  onSelect?: (k: OptionKey) => void
  onGlossary?: () => void
}

export function QuestionView({ q, showRu, glossary, selected, reveal, onSelect, onGlossary }: Props) {
  return (
    <GlossaryScope enabled={glossary} onOpen={onGlossary}>
      <article className="space-y-4">
        <QuestionMedia q={q} />
        <Bi text={q.question} showRu={showRu} className="text-lg font-semibold leading-snug" />
        <div className="space-y-3">
          {OPTION_KEYS.map((k) => (
            <OptionButton
              key={k}
              letter={k}
              text={q.options[k]}
              showRu={showRu}
              state={optionState(k, q, selected, reveal)}
              onClick={onSelect && !reveal ? () => onSelect(k) : undefined}
            />
          ))}
        </div>
        {reveal && <Explanation q={q} selected={selected} showRu={showRu} />}
      </article>
    </GlossaryScope>
  )
}

function OptionButton({ letter, text, showRu, state, onClick }: { letter: OptionKey; text: Lang; showRu: boolean; state: OptionState; onClick?: () => void }) {
  // Sin "disabled": así se pueden seguir consultando los términos del glosario tras corregir.
  return (
    <button
      type="button"
      aria-disabled={!onClick}
      onClick={onClick}
      className={`flex min-h-14 w-full items-start gap-3 rounded-2xl p-4 text-left transition-colors ${OPTION_STYLES[state]}`}
    >
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold uppercase ${BADGE_STYLES[state]}`}>{letter}</span>
      <Bi text={text} showRu={showRu} className="pt-0.5" />
    </button>
  )
}

function Explanation({ q, selected, showRu }: { q: AnyQuestion; selected: OptionKey | null; showRu: boolean }) {
  const t = useT()
  const ok = selected === q.correct
  const verdict = ok ? `✓ ${t('correctMsg')}` : `✗ ${selected ? t('wrongMsg') : t('notAnswered')}. ${t('correctAnswerIs')} ${q.correct.toUpperCase()}.`
  return (
    <section className={`rounded-2xl p-4 ${ok ? 'bg-emerald-50 dark:bg-emerald-950/50' : 'bg-rose-50 dark:bg-rose-950/50'}`}>
      <p className={`font-bold ${ok ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>{verdict}</p>
      <Bi text={q.explanation} showRu={showRu} className="mt-2 leading-relaxed" />
      {q.ref && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          📖 {t('source')}: {formatRef(q.ref, 'es')}
          {showRu && (
            <span lang="ru" className="ru block">
              {formatRef(q.ref, 'ru')}
            </span>
          )}
        </p>
      )}
      {q.needsReview && <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">⚠ {t('needsReview')}</p>}
    </section>
  )
}
