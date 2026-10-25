/** Minúsculas, sin tildes ni signos: para comparar enunciados. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Similitud de Jaccard entre los conjuntos de palabras de dos textos (0-1). */
export function similarity(a: string, b: string): number {
  const wa = new Set(normalizeText(a).split(' ').filter(Boolean))
  const wb = new Set(normalizeText(b).split(' ').filter(Boolean))
  if (!wa.size || !wb.size) return 0
  let common = 0
  for (const w of wa) if (wb.has(w)) common++
  return common / (wa.size + wb.size - common)
}

/** Devuelve el id de la primera pregunta con un enunciado igual o casi igual. */
export function findDuplicate(text: string, candidates: { id: string; question: { es: string } }[], threshold = 0.9): string | undefined {
  const norm = normalizeText(text)
  return candidates.find((c) => normalizeText(c.question.es) === norm || similarity(text, c.question.es) >= threshold)?.id
}
