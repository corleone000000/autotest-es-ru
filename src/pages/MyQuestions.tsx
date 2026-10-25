import { useState } from 'react'
import { topicById } from '../data/topics'
import { useT } from '../lib/i18n'
import { navigate } from '../lib/router'
import { deleteMyQuestion, saveMyQuestion, useMyQuestions } from '../lib/myQuestions'
import { QuestionEditor, draftToLocal, isDraftValid, localToDraft, type Draft } from '../components/QuestionEditor'
import { BottomBar, Card, ConfirmDialog, PageHeader, PrimaryButton, SecondaryButton } from '../components/ui'

export function MyQuestionsPage() {
  const t = useT()
  const { list, reload } = useMyQuestions()
  const [editing, setEditing] = useState<Draft | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (editing) {
    return (
      <main className="mx-auto max-w-xl space-y-4 px-4 pb-32">
        <PageHeader title={t('edit')} onBack={() => setEditing(null)} />
        <QuestionEditor draft={editing} onChange={setEditing} />
        <BottomBar>
          <SecondaryButton onClick={() => setEditing(null)}>{t('cancel')}</SecondaryButton>
          <PrimaryButton
            disabled={!isDraftValid(editing)}
            onClick={async () => {
              await saveMyQuestion(draftToLocal(editing, editing.existingId!))
              setEditing(null)
              reload()
            }}
          >
            {t('save')}
          </PrimaryButton>
        </BottomBar>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-xl space-y-3 px-4 pb-32">
      <PageHeader title={t('modeMias')} />
      {list?.length === 0 && <p className="py-8 text-center text-slate-500">{t('myQuestionsEmpty')}</p>}
      {list?.map((q) => (
        <Card key={q.id} className="space-y-2">
          <p className="text-xs text-slate-500">
            {topicById(q.topic)?.es} · {new Date(q.createdAt).toLocaleDateString('es-ES')}
            {q.imageBlob && ' · 🖼'}
            {q.videoBlob && ' · 🎬'}
          </p>
          <p className="font-medium">{q.question.es}</p>
          {q.needsReview && <p className="text-sm text-amber-700 dark:text-amber-400">⚠ {t('answerInferred')}</p>}
          <div className="flex gap-4 pt-1 text-sm font-semibold">
            <button type="button" className="text-blue-700 dark:text-blue-400" onClick={() => setEditing(localToDraft(q))}>
              {t('edit')}
            </button>
            <button type="button" className="text-rose-700 dark:text-rose-400" onClick={() => setDeleting(q.id)}>
              {t('delete')}
            </button>
          </div>
        </Card>
      ))}
      <BottomBar>
        <SecondaryButton onClick={() => navigate('/importar')}>📷 {t('importMore')}</SecondaryButton>
        <PrimaryButton disabled={!list?.length} onClick={() => navigate('/practicar/mias')}>
          {t('practiceMine')}
        </PrimaryButton>
      </BottomBar>
      {deleting && (
        <ConfirmDialog
          message={`${t('delete')}?`}
          confirmLabel={t('delete')}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            await deleteMyQuestion(deleting)
            setDeleting(null)
            reload()
          }}
        />
      )}
    </main>
  )
}
