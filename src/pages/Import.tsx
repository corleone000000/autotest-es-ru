import { useState } from 'react'
import { TOPICS, TOPIC_IDS } from '../data/topics'
import { BANK } from '../data/bank'
import type { Lang, OptionKey, TopicId } from '../types'
import { useT } from '../lib/i18n'
import { useSettings } from '../lib/settings'
import { navigate } from '../lib/router'
import { cropImage, prepareScreenshot } from '../lib/image'
import { findDuplicate } from '../lib/text'
import { loadMyQuestions, newLocalId, saveMyQuestion } from '../lib/myQuestions'
import { QuestionEditor, draftToLocal, isDraftValid, type Draft } from '../components/QuestionEditor'
import { BottomBar, PageHeader, PrimaryButton } from '../components/ui'

/** Respuesta de /api/import (ver el esquema Extraction en api/import.ts). */
interface ImportResponse {
  questions: {
    topic: string
    question: Lang
    options: { a: Lang; b: Lang; c: Lang }
    correct: OptionKey
    correctSource: 'captura' | 'deducida'
    explanation: Lang
    imageBox: { x: number; y: number; width: number; height: number } | null
    notes: string
  }[]
}

interface Job {
  name: string
  status: 'processing' | 'done' | 'error'
  message?: string
}

export function ImportPage() {
  const t = useT()
  const { settings } = useSettings()
  const [jobs, setJobs] = useState<Job[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [saving, setSaving] = useState(false)
  const busy = jobs.some((j) => j.status === 'processing')

  const updateJob = (i: number, patch: Partial<Job>) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...patch } : j)))

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const list = Array.from(files)
    const offset = jobs.length
    setJobs((js) => [...js, ...list.map((f) => ({ name: f.name, status: 'processing' as const }))])
    const existing = [...BANK, ...(await loadMyQuestions())]
    const accepted: Draft[] = []

    for (const [i, file] of list.entries()) {
      try {
        const shot = await prepareScreenshot(file)
        const res = await fetch('/api/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-import-token': settings.importToken },
          body: JSON.stringify({ image: shot.base64, mediaType: 'image/jpeg', topics: TOPICS.map(({ id, es }) => ({ id, es })) }),
        })
        const data = (await res.json().catch(() => ({}))) as Partial<ImportResponse> & { error?: string }
        if (!res.ok || !data.questions) throw new Error(data.error ?? `HTTP ${res.status}`)
        if (!data.questions.length) {
          updateJob(offset + i, { status: 'done', message: t('noneFound') })
          continue
        }
        for (const [n, q] of data.questions.entries()) {
          const cropBlob = q.imageBox ? await cropImage(shot.blob, q.imageBox) : undefined
          const others = [...existing, ...accepted.map((d) => ({ id: `#${d.key}`, question: d.question }))]
          const duplicateOf = findDuplicate(q.question.es, others)
          accepted.push({
            key: `${offset + i}-${n}`,
            include: !duplicateOf,
            topic: (TOPIC_IDS.includes(q.topic as TopicId) ? q.topic : TOPIC_IDS[0]) as TopicId,
            question: q.question,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation,
            correctSource: q.correctSource,
            notes: q.notes || undefined,
            imageMode: cropBlob ? 'crop' : 'none',
            cropBlob,
            fullBlob: shot.blob,
            duplicateOf,
          })
        }
        setDrafts((ds) => [...ds, ...accepted.filter((a) => !ds.some((d) => d.key === a.key))])
        updateJob(offset + i, { status: 'done', message: `${data.questions.length} ✓` })
      } catch (error) {
        updateJob(offset + i, { status: 'error', message: `${t('importError')}: ${(error as Error).message}` })
      }
    }
  }

  const toSave = drafts.filter((d) => d.include && isDraftValid(d))

  const save = async () => {
    setSaving(true)
    for (const [i, d] of toSave.entries()) await saveMyQuestion(draftToLocal(d, newLocalId(i)))
    setSaving(false)
    navigate('/mis-preguntas')
  }

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-32">
      <PageHeader title={t('importTitle')} />
      <p className="text-slate-600 dark:text-slate-400">{t('importIntro')}</p>
      {!navigator.onLine && <p className="rounded-xl bg-amber-100 p-3 text-amber-900 dark:bg-amber-950 dark:text-amber-200">{t('offlineImport')}</p>}

      <label className={`flex h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-700 text-lg font-semibold text-white active:bg-blue-800 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
        📷 {t('chooseImages')}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
      </label>

      {jobs.length > 0 && (
        <ul className="space-y-1 text-sm">
          {jobs.map((j, i) => (
            <li key={i} className={j.status === 'error' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}>
              {j.status === 'processing' ? '⏳' : j.status === 'done' ? '✅' : '❌'} {j.name}
              {j.status === 'processing' ? ` · ${t('processing')}…` : j.message ? ` · ${j.message}` : ''}
            </li>
          ))}
        </ul>
      )}

      {drafts.map((d) => (
        <QuestionEditor key={d.key} draft={d} showInclude onChange={(nd) => setDrafts((ds) => ds.map((x) => (x.key === nd.key ? nd : x)))} />
      ))}

      {drafts.length > 0 && (
        <BottomBar>
          <PrimaryButton disabled={!toSave.length || saving || busy} onClick={save}>
            {t('saveSelected')} ({toSave.length})
          </PrimaryButton>
        </BottomBar>
      )}
    </main>
  )
}
