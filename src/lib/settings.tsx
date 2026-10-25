import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { dbGet, dbSet } from './db'

export interface Settings {
  translation: 'hidden' | 'visible'
  uiLang: 'es' | 'ru'
  fontScale: number // 0.9 · 1 · 1.15 · 1.3
  importToken: string
}

export const DEFAULT_SETTINGS: Settings = { translation: 'hidden', uiLang: 'es', fontScale: 1, importToken: '' }

interface Ctx {
  settings: Settings
  ready: boolean
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, ready: false, update: () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    dbGet<Partial<Settings>>('settings')
      .then((saved) => saved && setSettings({ ...DEFAULT_SETTINGS, ...saved }))
      .finally(() => setReady(true))
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', `${settings.fontScale * 100}%`)
    document.documentElement.lang = settings.uiLang
  }, [settings.fontScale, settings.uiLang])

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      void dbSet('settings', next)
      return next
    })
  }, [])

  return <SettingsContext.Provider value={{ settings, ready, update }}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
