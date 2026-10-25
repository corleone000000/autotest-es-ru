import { useEffect, useState } from 'react'
import type { AnyQuestion, LocalQuestion } from '../types'
import { useT } from '../lib/i18n'

function useObjectUrl(src: string | Blob): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (typeof src === 'string') {
      setUrl(src)
      return
    }
    const objectUrl = URL.createObjectURL(src)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [src])
  return url
}

/** Imagen (señal o situación) y/o vídeo de la pregunta, ocupando el ancho. */
export function QuestionMedia({ q }: { q: AnyQuestion }) {
  const local = q as Partial<LocalQuestion>
  const video = local.videoBlob ?? q.video
  const image = local.imageBlob ?? q.image
  if (!video && !image) return null
  return (
    <div className="space-y-2">
      {video && <VideoPlayer key={typeof video === 'string' ? video : q.id} src={video} />}
      {image && <QuestionImage src={image} />}
    </div>
  )
}

function QuestionImage({ src }: { src: string | Blob }) {
  const url = useObjectUrl(src)
  return (
    <div className="flex justify-center rounded-2xl bg-white p-2 ring-1 ring-slate-200 dark:ring-slate-700">
      {url && <img src={url} alt="" className="max-h-[38dvh] w-full object-contain" />}
    </div>
  )
}

/**
 * Pregunta de vídeo (la DGT la incorporó al examen en 2026).
 * Los vídeos del banco se descargan enteros como Blob: así salen de la caché del service
 * worker sin depender de peticiones Range, que iOS exige para <video src> y la precache no sirve.
 */
function VideoPlayer({ src }: { src: string | Blob }) {
  const t = useT()
  const [url, setUrl] = useState<string>()
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | undefined
    ;(async () => {
      try {
        let blob: Blob
        if (typeof src === 'string') {
          const res = await fetch(src)
          if (!res.ok) throw new Error(String(res.status))
          blob = await res.blob()
        } else {
          blob = src
        }
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      } catch {
        if (!cancelled) setError(true)
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src])

  if (error) {
    return <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-200 p-4 text-center text-sm dark:bg-slate-800">{t('videoUnavailable')}</div>
  }
  if (!url) return <div className="aspect-video animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
  return <video src={url} controls playsInline muted autoPlay preload="auto" className="aspect-video w-full rounded-2xl bg-black" />
}
