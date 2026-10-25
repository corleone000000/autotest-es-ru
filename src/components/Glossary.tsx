import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { segmentText } from '../lib/glossary'
import type { GlossaryTerm } from '../types'

interface OpenTerm {
  term: GlossaryTerm
  rect: DOMRect
}

const GlossaryContext = createContext<{ enabled: boolean; open: (term: GlossaryTerm, rect: DOMRect) => void }>({
  enabled: false,
  open: () => {},
})

/** Activa los términos del glosario dentro de una pregunta y muestra su popup. */
export function GlossaryScope({ enabled, onOpen, children }: { enabled: boolean; onOpen?: () => void; children: ReactNode }) {
  const [current, setCurrent] = useState<OpenTerm | null>(null)

  const open = useCallback(
    (term: GlossaryTerm, rect: DOMRect) => {
      setCurrent({ term, rect })
      onOpen?.()
    },
    [onOpen],
  )

  useEffect(() => {
    if (!current) return
    const close = () => setCurrent(null)
    window.addEventListener('scroll', close, { passive: true })
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close)
      window.removeEventListener('resize', close)
    }
  }, [current])

  return (
    <GlossaryContext.Provider value={{ enabled, open }}>
      {children}
      {current && <TermPopup {...current} onClose={() => setCurrent(null)} />}
    </GlossaryContext.Provider>
  )
}

const POPUP_WIDTH = 288

function TermPopup({ term, rect, onClose }: OpenTerm & { onClose: () => void }) {
  const below = rect.bottom + 170 < window.innerHeight
  const left = Math.min(Math.max(rect.left + rect.width / 2 - POPUP_WIDTH / 2, 8), window.innerWidth - POPUP_WIDTH - 8)
  const position = below ? { top: rect.bottom + 8 } : { bottom: window.innerHeight - rect.top + 8 }
  return (
    <>
      {/* Se cierra con el siguiente toque en cualquier sitio (pointerdown, no click: el dedo aún está levantándose). */}
      <div className="fixed inset-0 z-40" onPointerDown={onClose} aria-hidden />
      <div
        role="dialog"
        className="fixed z-50 rounded-2xl bg-slate-900 p-4 text-white shadow-xl ring-1 ring-white/10 dark:bg-slate-800"
        style={{ ...position, left, width: POPUP_WIDTH }}
        onPointerDown={onClose}
      >
        <p className="text-sm text-slate-300">{term.es}</p>
        <p lang="ru" className="text-lg font-semibold text-violet-300">
          {term.ru}
        </p>
        {term.note && (
          <p lang="ru" className="mt-2 text-sm leading-snug text-slate-300">
            {term.note}
          </p>
        )}
      </div>
    </>
  )
}

const LONG_PRESS_MS = 450

function Term({ term, children }: { term: GlossaryTerm; children: ReactNode }) {
  const { open } = useContext(GlossaryContext)
  const timer = useRef<number | undefined>(undefined)
  const origin = useRef<[number, number] | null>(null)
  const fired = useRef(false)

  const cancel = () => {
    window.clearTimeout(timer.current)
    timer.current = undefined
  }

  return (
    <span
      className="term"
      onPointerDown={(e) => {
        fired.current = false
        origin.current = [e.clientX, e.clientY]
        const el = e.currentTarget
        cancel()
        timer.current = window.setTimeout(() => {
          fired.current = true
          navigator.vibrate?.(15)
          open(term, el.getBoundingClientRect())
        }, LONG_PRESS_MS)
      }}
      onPointerMove={(e) => {
        const o = origin.current
        if (o && Math.hypot(e.clientX - o[0], e.clientY - o[1]) > 10) cancel()
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => {
        // Android y escritorio (clic derecho) disparan contextmenu: lo usamos en vez del menú del sistema.
        e.preventDefault()
        if (!fired.current) {
          fired.current = true
          cancel()
          open(term, e.currentTarget.getBoundingClientRect())
        }
      }}
      onClick={(e) => {
        // Tras una pulsación larga, el "click" final no debe marcar la opción que contiene el término.
        if (fired.current) {
          e.preventDefault()
          e.stopPropagation()
          fired.current = false
        }
      }}
    >
      {children}
    </span>
  )
}

/** Texto en español con los términos del glosario subrayados. */
export function GlossaryText({ text }: { text: string }) {
  const { enabled } = useContext(GlossaryContext)
  const segments = useMemo(() => (enabled ? segmentText(text) : [text]), [text, enabled])
  return (
    <>
      {segments.map((s, i) =>
        typeof s === 'string' ? (
          s
        ) : (
          <Term key={i} term={s.term}>
            {s.text}
          </Term>
        ),
      )}
    </>
  )
}
