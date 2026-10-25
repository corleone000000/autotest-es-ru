import type { Question } from '../types'
import { TOPIC_IDS } from './topics'

// Cada tema vive en su propio archivo: src/data/questions/<tema>.json
const modules = import.meta.glob<Question[]>('./questions/*.json', { eager: true, import: 'default' })

export const BANK: Question[] = Object.values(modules)
  .flat()
  .sort((a, b) => TOPIC_IDS.indexOf(a.topic) - TOPIC_IDS.indexOf(b.topic) || a.id.localeCompare(b.id))

export const BANK_BY_ID = new Map(BANK.map((q) => [q.id, q]))
