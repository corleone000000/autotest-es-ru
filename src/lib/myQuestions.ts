import { useCallback, useEffect, useState } from 'react'
import type { LocalQuestion } from '../types'
import { dbDel, dbGetMany, dbKeys, dbSet } from './db'

// Cada pregunta importada se guarda en su propia clave ("mq:<id>"), con sus Blobs de imagen/vídeo.
const PREFIX = 'mq:'

export async function loadMyQuestions(): Promise<LocalQuestion[]> {
  const ks = (await dbKeys()).filter((k) => k.startsWith(PREFIX))
  const list = await dbGetMany<LocalQuestion>(ks)
  return list.filter((q): q is LocalQuestion => Boolean(q)).sort((a, b) => b.createdAt - a.createdAt)
}

export const saveMyQuestion = (q: LocalQuestion) => dbSet(PREFIX + q.id, q)
export const deleteMyQuestion = (id: string) => dbDel(PREFIX + id)

export function newLocalId(index = 0): string {
  return `F-${Date.now().toString(36)}-${index}`
}

export function useMyQuestions() {
  const [list, setList] = useState<LocalQuestion[] | null>(null)
  const reload = useCallback(() => {
    loadMyQuestions().then(setList, () => setList([]))
  }, [])
  useEffect(reload, [reload])
  return { list, reload }
}
