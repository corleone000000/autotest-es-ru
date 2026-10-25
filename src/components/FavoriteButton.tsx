import { useProgress } from '../lib/progress'
import { useT } from '../lib/i18n'

export function FavoriteButton({ id }: { id: string }) {
  const t = useT()
  const { data, toggleFavorite } = useProgress()
  const active = data?.favorites.includes(id) ?? false
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={t('favorite')}
      onClick={() => toggleFavorite(id)}
      className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl active:bg-slate-200 dark:active:bg-slate-800 ${active ? 'text-amber-500' : 'text-slate-400'}`}
    >
      {active ? '★' : '☆'}
    </button>
  )
}
