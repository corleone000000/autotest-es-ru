import raw from '../data/glossary.json'
import type { GlossaryTerm } from '../types'

export const GLOSSARY = raw as GlossaryTerm[]

const byForm = new Map<string, GlossaryTerm>()
const forms: string[] = []
for (const term of GLOSSARY) {
  if (term.basic) continue
  for (const form of term.forms ?? [term.es]) {
    const key = form.toLocaleLowerCase('es')
    if (!byForm.has(key)) {
      byForm.set(key, term)
      forms.push(form)
    }
  }
}
// Las formas más largas primero: "luz de cruce" gana a "cruce".
forms.sort((a, b) => b.length - a.length)

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// Sin lookbehind (no existe en Safari < 16.4): el borde izquierdo se captura en el grupo 1.
const TERM_RE = new RegExp(`(^|[^\\p{L}\\p{N}])(${forms.map(escape).join('|')})(?=[^\\p{L}\\p{N}]|$)`, 'giu')

export type Segment = string | { text: string; term: GlossaryTerm }

/** Divide un texto en trozos normales y términos del glosario. */
export function segmentText(text: string): Segment[] {
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(TERM_RE)) {
    const start = m.index! + m[1].length
    if (start > last) out.push(text.slice(last, start))
    out.push({ text: m[2], term: byForm.get(m[2].toLocaleLowerCase('es'))! })
    last = start + m[2].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
