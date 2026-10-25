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
  [/Conocimiento técnico \(no regulado en norma\)/g, 'Технические знания (нормативными актами не регулируется)'],
  [/Conocimiento sanitario \(no regulado en norma\)/g, 'Медицинские знания (нормативными актами не регулируется)'],
  [/información sanitaria DGT/g, 'медицинская информация DGT'],
  [/derogado por la Ley 18\/2021/g, 'отменена законом 18/2021'],
  [/apartado 3 suprimido por el RD 518\/2026/g, 'п. 3 исключён RD 518/2026'],
]

const toRu = (s: string) => RU_WORDS.reduce((acc, [re, word]) => acc.replace(re, word), s)

export function formatRef(ref: string, lang: 'es' | 'ru'): string {
  return ref
    .split(';')
    .map((part) => {
      const p = part.trim()
      const m = p.match(/^(LSV|RGC|RGV|RGCond|CP|RD)\b\s*(.*)$/)
      if (!m) return lang === 'ru' ? toRu(p) : p
      const rest = lang === 'ru' ? toRu(m[2]) : m[2]
      // "RD 920/2017, art. 6" → "Real Decreto 920/2017, art. 6" (sin coma tras el nombre)
      return `${LAWS[m[1]][lang]}${rest ? (m[1] === 'RD' ? ' ' : ', ') + rest : ''}`
    })
    .join('; ')
}
