import { useState, type ReactNode } from 'react'
import { useT } from '../lib/i18n'
import { useSettings, type Settings } from '../lib/settings'
import { useProgress } from '../lib/progress'
import { downloadBlob, exportBackup, importBackup } from '../lib/backup'
import { BANK } from '../data/bank'
import { Card, ConfirmDialog, PageHeader } from '../components/ui'

function Choice<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 flex-1 rounded-xl px-3 py-2 font-medium ${value === o.value ? 'bg-blue-700 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </Card>
  )
}

export function SettingsPage() {
  const t = useT()
  const { settings, update } = useSettings()
  const { resetProgress } = useProgress()
  const [confirmReset, setConfirmReset] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  return (
    <main className="mx-auto max-w-xl space-y-3 px-4 pb-10">
      <PageHeader title={t('settings')} />

      <Section title={t('translation')}>
        <Choice<Settings['translation']>
          value={settings.translation}
          onChange={(translation) => update({ translation })}
          options={[
            { value: 'hidden', label: t('translationHidden') },
            { value: 'visible', label: t('translationVisible') },
          ]}
        />
      </Section>

      <Section title={t('uiLanguage')}>
        <Choice<Settings['uiLang']>
          value={settings.uiLang}
          onChange={(uiLang) => update({ uiLang })}
          options={[
            { value: 'es', label: 'Español' },
            { value: 'ru', label: 'Русский' },
          ]}
        />
      </Section>

      <Section title={t('fontSize')}>
        <Choice<number>
          value={settings.fontScale}
          onChange={(fontScale) => update({ fontScale })}
          options={[0.9, 1, 1.15, 1.3].map((v) => ({ value: v, label: <span style={{ fontSize: `${v}rem` }}>Aa</span> }))}
        />
      </Section>

      <Section title={t('importToken')}>
        <input
          type="password"
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
          value={settings.importToken}
          onChange={(e) => update({ importToken: e.target.value })}
        />
        <p className="text-sm text-slate-500">{t('importTokenHint')}</p>
      </Section>

      <Section title={t('backup')}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-xl bg-slate-100 px-3 font-medium dark:bg-slate-800"
            onClick={async () => downloadBlob(await exportBackup(), `autotest-${new Date().toISOString().slice(0, 10)}.json`)}
          >
            ⬇ {t('exportData')}
          </button>
          <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl bg-slate-100 px-3 font-medium dark:bg-slate-800">
            ⬆ {t('importData')}
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  await importBackup(file)
                  window.location.reload()
                } catch (error) {
                  setMessage((error as Error).message)
                }
              }}
            />
          </label>
        </div>
        {message && <p className="text-sm text-rose-700 dark:text-rose-400">{message}</p>}
      </Section>

      <Section title={t('resetProgress')}>
        <button type="button" className="min-h-11 w-full rounded-xl bg-rose-600 px-3 font-semibold text-white active:bg-rose-700" onClick={() => setConfirmReset(true)}>
          {t('resetProgress')}
        </button>
      </Section>

      <p className="pt-2 text-center text-sm text-slate-500">
        {t('bankInfo')}: {BANK.length} · v{__APP_VERSION__}
      </p>

      {confirmReset && (
        <ConfirmDialog
          message={t('resetConfirm')}
          confirmLabel={t('resetProgress')}
          onCancel={() => setConfirmReset(false)}
          onConfirm={async () => {
            await resetProgress()
            setConfirmReset(false)
            setMessage(t('resetDone'))
          }}
        />
      )}
    </main>
  )
}
