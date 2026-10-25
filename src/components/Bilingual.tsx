import type { Lang } from '../types'
import { GlossaryText } from './Glossary'

/** Español siempre; ruso debajo, en otro color y más pequeño, solo si está activado. */
export function Bi({ text, showRu, className = '' }: { text: Lang; showRu: boolean; className?: string }) {
  return (
    <div className={className}>
      <div>
        <GlossaryText text={text.es} />
      </div>
      {showRu && text.ru && (
        <div lang="ru" className="ru">
          {text.ru}
        </div>
      )}
    </div>
  )
}
