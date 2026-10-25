export interface PreparedImage {
  blob: Blob
  base64: string
  width: number
  height: number
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, quality))
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Reduce la captura (lado mayor ≤ 1568 px, lo que aprovecha Claude) y la pasa a JPEG. */
export async function prepareScreenshot(file: Blob, maxSide = 1568): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await canvasToBlob(canvas)
  return { blob, base64: await blobToBase64(blob), width, height }
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Recorta la imagen de la pregunta (recuadro en fracciones 0-1) con un pequeño margen. */
export async function cropImage(source: Blob, box: Box, pad = 0.01): Promise<Blob | undefined> {
  const bitmap = await createImageBitmap(source)
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const x0 = clamp(box.x - pad)
  const y0 = clamp(box.y - pad)
  const x1 = clamp(box.x + box.width + pad)
  const y1 = clamp(box.y + box.height + pad)
  const sw = Math.round((x1 - x0) * bitmap.width)
  const sh = Math.round((y1 - y0) * bitmap.height)
  if (sw < 16 || sh < 16) {
    bitmap.close()
    return undefined
  }
  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  canvas.getContext('2d')!.drawImage(bitmap, Math.round(x0 * bitmap.width), Math.round(y0 * bitmap.height), sw, sh, 0, 0, sw, sh)
  bitmap.close()
  return canvasToBlob(canvas)
}
