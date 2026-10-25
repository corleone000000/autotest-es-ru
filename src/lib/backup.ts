import type { LocalQuestion } from '../types'
import { dbGet, dbSet } from './db'
import { loadMyQuestions, saveMyQuestion } from './myQuestions'

// Copia de seguridad en un JSON: el progreso solo vive en este navegador.
const KEYS = ['attempts', 'favorites', 'review', 'exams', 'settings'] as const

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

const dataUrlToBlob = async (url: string) => (await fetch(url)).blob()

export async function exportBackup(): Promise<Blob> {
  const values = await Promise.all(KEYS.map((k) => dbGet(k)))
  const mine = await loadMyQuestions()
  const myQuestions = await Promise.all(
    mine.map(async (q) => ({
      ...q,
      imageBlob: q.imageBlob ? await blobToDataUrl(q.imageBlob) : undefined,
      videoBlob: q.videoBlob ? await blobToDataUrl(q.videoBlob) : undefined,
    })),
  )
  const data = { app: 'autotest-es-ru', version: 1, exportedAt: new Date().toISOString(), ...Object.fromEntries(KEYS.map((k, i) => [k, values[i]])), myQuestions }
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

export async function importBackup(file: Blob): Promise<void> {
  const data = JSON.parse(await file.text())
  if (data?.app !== 'autotest-es-ru') throw new Error('No es una copia de AutoTest ES/RU')
  for (const k of KEYS) if (data[k] !== undefined && data[k] !== null) await dbSet(k, data[k])
  for (const q of (data.myQuestions ?? []) as (Omit<LocalQuestion, 'imageBlob' | 'videoBlob'> & { imageBlob?: string; videoBlob?: string })[]) {
    await saveMyQuestion({
      ...q,
      imageBlob: q.imageBlob ? await dataUrlToBlob(q.imageBlob) : undefined,
      videoBlob: q.videoBlob ? await dataUrlToBlob(q.videoBlob) : undefined,
    })
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
