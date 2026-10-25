import { useEffect, useState, type ReactNode } from 'react'
import type { Lang, LocalQuestion, OptionKey, TopicId } from '../types'
import { OPTION_KEYS } from '../types'
import { TOPICS } from '../data/topics'
import { useT } from '../lib/i18n'
import { Card } from './ui'

/** Pregunta en revisión: viene de una captura o de "Mis preguntas". */
export interface Draft {
  key: string
  include: boolean
  topic: TopicId
  question: Lang
  options: { a: Lang; b: Lang; c: Lang }
  correct: OptionKey
  explanation: Lang
  correctSource: 'captura' | 'deducida' | 'verificada'
  notes?: string
  imageMode: 'crop' | 'full' | 'none'
  cropBlob?: Blob
  fullBlob?: Blob
  videoBlob?: Blob
  duplicateOf?: string
  existingId?: string
  createdAt?: number
}

const trim = (l: Lang): Lang => ({ es: l.es.trim(), ru: l.ru.trim() })

export function draftToLocal(d: Draft, id: string): LocalQuestion {
  return {
    id,
    topic: d.topic,
    source: 'foto',
    question: trim(d.question),
    options: { a: trim(d.options.a), b: trim(d.options.b), c: trim(d.options.c) },
    correct: d.correct,
    explanation: trim(d.explanation),
    imageBlob: d.imageMode === 'crop' ? d.cropBlob : d.imageMode === 'full' ? d.fullBlob : undefined,
    videoBlob: d.videoBlob,
    needsReview: d.correctSource === 'deducida' ? true : undefined,
    createdAt: d.createdAt ?? Date.now(),
  }
}

export function localToDraft(q: LocalQuestion): Draft {
  return {
    key: q.id,
    include: true,
    topic: q.topic,
    question: { ...q.question },
    options: { a: { ...q.options.a }, b: { ...q.options.b }, c: { ...q.options.c } },
    correct: q.correct,
    explanation: { ...q.explanation },
    correctSource: q.needsReview ? 'deducida' : 'verificada',
    imageMode: q.imageBlob ? 'full' : 'none',
    fullBlob: q.imageBlob,
    videoBlob: q.videoBlob,
    existingId: q.id,
    createdAt: q.createdAt,
  }
}

export function isDraftValid(d: Draft): boolean {
  return Boolean(d.question.es.trim() && OPTION_KEYS.every((k) => d.options[k].es.trim()))
}

function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return setUrl(undefined)
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-base [field-sizing:content] dark:border-slate-700 dark:bg-slate-950'

function LangInputs({ value, onChange, label }: { value: Lang; onChange: (v: Lang) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Field label={`${label} · ES`}>
        <textarea rows={2} className={inputCls} value={value.es} onChange={(e) => onChange({ ...value, es: e.target.value })} />
      </Field>
      <Field label={`${label} · RU`}>
        <textarea rows={2} lang="ru" className={`${inputCls} text-violet-800 dark:text-violet-300`} value={value.ru} onChange={(e) => onChange({ ...value, ru: e.target.value })} />
      </Field>
    </div>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg px-2 py-2 text-sm font-medium ${value === o.value ? 'bg-white shadow dark:bg-slate-950' : 'text-slate-600 dark:text-slate-400'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function QuestionEditor({ draft, onChange, showInclude }: { draft: Draft; onChange: (d: Draft) => void; showInclude?: boolean }) {
  const t = useT()
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch })
  const imageBlob = draft.imageMode === 'crop' ? draft.cropBlob : draft.imageMode === 'full' ? draft.fullBlob : undefined
  const imageUrl = useBlobUrl(imageBlob)
  const videoUrl = useBlobUrl(draft.videoBlob)

  const imageOptions: { value: Draft['imageMode']; label: string }[] = []
  if (draft.cropBlob) imageOptions.push({ value: 'crop', label: t('keepImage') })
  if (draft.fullBlob) imageOptions.push({ value: 'full', label: t('fullImage') })
  imageOptions.push({ value: 'none', label: t('noImage') })

  return (
    <Card className={`space-y-4 ${showInclude && !draft.include ? 'opacity-60' : ''}`}>
      {showInclude && (
        <label className="flex items-center gap-3 text-lg font-semibold">
          <input type="checkbox" className="h-6 w-6 accent-blue-700" checked={draft.include} onChange={(e) => set({ include: e.target.checked })} />
          {t('include')}
        </label>
      )}
      {draft.duplicateOf && (
        <p className="rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          ⚠ {t('duplicateOf')} {draft.duplicateOf}
        </p>
      )}
      {draft.correctSource === 'deducida' ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <span className="flex-1">⚠ {t('answerInferred')}</span>
          <button type="button" className="rounded-lg bg-white/70 px-2 py-1 font-medium dark:bg-black/30" onClick={() => set({ correctSource: 'verificada' })}>
            ✓ OK
          </button>
        </div>
      ) : draft.correctSource === 'captura' ? (
        <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">✓ {t('answerFromScreenshot')}</p>
      ) : null}
      {draft.notes && <p className="text-sm text-slate-600 dark:text-slate-400">📝 {draft.notes}</p>}

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('image')}</span>
        {imageOptions.length > 1 && <Segmented value={draft.imageMode} options={imageOptions} onChange={(imageMode) => set({ imageMode })} />}
        {imageUrl && (
          <div className="flex justify-center rounded-xl bg-white p-2 ring-1 ring-slate-200">
            <img src={imageUrl} alt="" className="max-h-56 object-contain" />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('video')}</span>
        {videoUrl ? (
          <>
            <video src={videoUrl} controls playsInline muted className="aspect-video w-full rounded-xl bg-black" />
            <button type="button" className="text-sm font-medium text-rose-700 dark:text-rose-400" onClick={() => set({ videoBlob: undefined })}>
              {t('removeVideo')}
            </button>
          </>
        ) : (
          <label className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-400">
            🎬 {t('addVideo')}
            <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && set({ videoBlob: e.target.files[0] })} />
          </label>
        )}
      </div>

      <Field label={t('topic')}>
        <select className={inputCls} value={draft.topic} onChange={(e) => set({ topic: e.target.value as TopicId })}>
          {TOPICS.map((tp) => (
            <option key={tp.id} value={tp.id}>
              {tp.es}
            </option>
          ))}
        </select>
      </Field>

      <LangInputs label={t('question')} value={draft.question} onChange={(question) => set({ question })} />

      {OPTION_KEYS.map((k) => (
        <div key={k} className={`space-y-2 rounded-xl p-3 ring-1 ${draft.correct === k ? 'bg-emerald-50 ring-emerald-500 dark:bg-emerald-950/40' : 'ring-slate-200 dark:ring-slate-800'}`}>
          <label className="flex items-center gap-2 font-semibold">
            <input type="radio" name={`correct-${draft.key}`} className="h-5 w-5 accent-emerald-600" checked={draft.correct === k} onChange={() => set({ correct: k, correctSource: 'verificada' })} />
            {k.toUpperCase()} {draft.correct === k && <span className="text-sm font-normal text-emerald-700 dark:text-emerald-400">· {t('correctOption')}</span>}
          </label>
          <LangInputs label={k.toUpperCase()} value={draft.options[k]} onChange={(v) => set({ options: { ...draft.options, [k]: v } })} />
        </div>
      ))}

      <LangInputs label={t('explanation')} value={draft.explanation} onChange={(explanation) => set({ explanation })} />
    </Card>
  )
}
