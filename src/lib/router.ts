import { useEffect, useState } from 'react'

// Router mínimo por hash (#/examen/simulado): funciona offline y sin configurar el servidor.
export function useRoute(): string[] {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
    .replace(/^#\/?/, '')
    .split('?')[0]
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent)
}

export function navigate(path: string) {
  window.location.hash = path.startsWith('/') ? path : `/${path}`
}
