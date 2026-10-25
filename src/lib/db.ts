import { createStore, get, set, update, del } from 'idb-keyval'

// Todo el progreso vive en IndexedDB (un único almacén clave-valor).
const store = createStore('autotest-es-ru', 'kv')

export const dbGet = <T>(key: string) => get<T>(key, store)
export const dbSet = <T>(key: string, value: T) => set(key, value, store)
export const dbUpdate = <T>(key: string, fn: (old: T | undefined) => T) => update<T>(key, fn, store)
export const dbDel = (key: string) => del(key, store)

/** Pide al navegador que no borre los datos (importante en iOS). */
export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist()
  } catch {
    /* sin soporte: no pasa nada */
  }
}
