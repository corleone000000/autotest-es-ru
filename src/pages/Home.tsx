import { useT } from '../lib/i18n'
import { navigate } from '../lib/router'
import { BANK } from '../data/bank'

export function Home() {
  const t = useT()
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <header className="pt-4">
        <h1 className="text-3xl font-bold">{t('appName')}</h1>
        <p className="text-slate-600 dark:text-slate-400">{t('tagline')}</p>
      </header>
      <button
        type="button"
        onClick={() => navigate('/practica')}
        className="w-full rounded-2xl bg-blue-700 p-5 text-left text-white active:bg-blue-800"
      >
        <span className="block text-xl font-semibold">{t('modeTema')}</span>
        <span className="text-blue-100">
          {BANK.length} {t('questionsCount')}
        </span>
      </button>
      <button type="button" onClick={() => navigate('/importar')} className="w-full rounded-2xl bg-white p-5 text-left ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <span className="block text-lg font-semibold">📷 {t('importTitle')}</span>
      </button>
      <button type="button" onClick={() => navigate('/mis-preguntas')} className="w-full rounded-2xl bg-white p-5 text-left ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <span className="block text-lg font-semibold">{t('modeMias')}</span>
      </button>
    </main>
  )
}
