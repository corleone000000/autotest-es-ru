import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { navigate } from '../lib/router'
import { useT } from '../lib/i18n'

/** Barra fija inferior: botones grandes al alcance del pulgar. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-xl gap-3 px-4 pt-3">{children}</div>
    </div>
  )
}

/** Bandera en SVG: el emoji 🇷🇺 se ve como "RU" en Windows. */
function RuFlag() {
  return (
    <svg viewBox="0 0 9 6" className="h-4 w-6 rounded-sm ring-1 ring-black/15" aria-hidden>
      <rect width="9" height="2" fill="#fff" />
      <rect y="2" width="9" height="2" fill="#0039a6" />
      <rect y="4" width="9" height="2" fill="#d52b1e" />
    </svg>
  )
}

export function RuButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label="Mostrar u ocultar ruso"
      onClick={onClick}
      className={`flex h-14 min-w-24 shrink-0 items-center justify-center gap-2 rounded-2xl px-4 text-lg font-bold ring-2 transition-colors ${
        active ? 'bg-violet-600 text-white ring-violet-600' : 'bg-white text-violet-700 ring-violet-300 dark:bg-slate-800 dark:text-violet-300 dark:ring-violet-700'
      }`}
    >
      <RuFlag /> RU
    </button>
  )
}

export function PrimaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`h-14 flex-1 rounded-2xl bg-blue-700 px-4 text-lg font-semibold text-white transition-opacity active:bg-blue-800 disabled:opacity-40 ${className}`}
    />
  )
}

export function SecondaryButton({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`h-14 rounded-2xl bg-slate-100 px-4 text-lg font-semibold text-slate-800 active:bg-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-100 ${className}`}
    />
  )
}

/** Cabecera de página normal (no de pregunta). */
export function PageHeader({ title, back = '/', onBack }: { title: string; back?: string; onBack?: () => void }) {
  const t = useT()
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center gap-2 bg-slate-50/95 px-2 py-2 backdrop-blur dark:bg-slate-950/95">
      <button type="button" onClick={onBack ?? (() => navigate(back))} aria-label={t('back')} className="flex h-11 w-11 items-center justify-center rounded-full text-2xl active:bg-slate-200 dark:active:bg-slate-800">
        ‹
      </button>
      <h1 className="text-xl font-bold">{title}</h1>
    </header>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800 ${className}`}>{children}</div>
}

/** Diálogo de confirmación propio (sin window.confirm, que bloquea la PWA en algunos móviles). */
export function ConfirmDialog({ message, onConfirm, onCancel, confirmLabel }: { message: string; onConfirm: () => void; onCancel: () => void; confirmLabel?: string }) {
  const t = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onCancel}>
      <div role="alertdialog" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
        <p className="text-lg">{message}</p>
        <div className="mt-5 flex gap-3">
          <SecondaryButton className="flex-1" onClick={onCancel}>
            {t('cancel')}
          </SecondaryButton>
          <PrimaryButton onClick={onConfirm}>{confirmLabel ?? t('confirm')}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}
