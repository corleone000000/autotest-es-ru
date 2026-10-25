// Convierte la referencia normativa compacta del JSON ("RGC art. 48.1") en texto legible.

const LAWS: Record<string, { es: string; ru: string }> = {
  LSV: { es: 'Ley de Tráfico (RDL 6/2015)', ru: 'Закон о дорожном движении (RDL 6/2015)' },
  RGC: { es: 'Reglamento General de Circulación', ru: 'Общий регламент дорожного движения (RGC)' },
  RGV: { es: 'Reglamento General de Vehículos', ru: 'Общий регламент о транспортных средствах (RGV)' },
  RGCond: { es: 'Reglamento General de Conductores', ru: 'Общий регламент о водителях (RGCond)' },
  CP: { es: 'Código Penal', ru: 'Уголовный кодекс' },
  RD: { es: 'Real Decreto', ru: 'Королевский декрет' },
}

const RU_WORDS: [RegExp, string][] = [
  [/\barts?\./g, 'ст.'],
  [/\banexo\b/gi, 'приложение'],
  [/\bapartado\b/gi, 'п.'],
  [/\bdisposición adicional\b/gi, 'доп. положение'],
  [/\bdisposición transitoria\b/gi, 'переходное положение'],
  [/\by\b/g, 'и'],
]

export function formatRef(ref: string, lang: 'es' | 'ru'): string {
  return ref
    .split(';')
    .map((part) => {
      const p = part.trim()
      const m = p.match(/^(LSV|RGC|RGV|RGCond|CP|RD)\b\s*(.*)$/)
      if (!m) return p
      let rest = m[2]
      if (lang === 'ru') for (const [re, word] of RU_WORDS) rest = rest.replace(re, word)
      return `${LAWS[m[1]][lang]}${rest ? ', ' + rest : ''}`
    })
    .join('; ')
}
