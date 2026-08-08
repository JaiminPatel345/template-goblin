import type { PageDefinition } from '@template-goblin/types'

/**
 * Compute SHA-256 hash (or FNV-1a fallback) of an ArrayBuffer as a hex string.
 * Used to deduplicate uploaded background images in store & IndexedDB.
 */
export async function computeBufferHash(buffer: ArrayBuffer): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    } catch {
      // Fall back to FNV-1a
    }
  }

  // FNV-1a hash fallback
  const view = new Uint8Array(buffer)
  let h1 = 0x811c9dc5
  let h2 = 0x9e3779b9
  for (let i = 0; i < view.length; i++) {
    const byte = view[i] ?? 0
    h1 = Math.imul(h1 ^ byte, 0x01000193)
    h2 = Math.imul(h2 ^ byte, 0x050c5d7f)
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}-${buffer.byteLength}`
}

/**
 * Check if an uploaded image buffer already exists in pageBackgroundBuffers.
 * If a matching hash is found, return the existing filename, dataUrl, and buffer.
 */
export async function findDuplicateBackground(
  buffer: ArrayBuffer,
  pages: PageDefinition[],
  pageBackgroundBuffers: Map<string, ArrayBuffer>,
  pageBackgroundDataUrls: Map<string, string>,
): Promise<{ filename: string; dataUrl: string; buffer: ArrayBuffer } | null> {
  const hash = await computeBufferHash(buffer)
  for (const [existingPageId, existingBuffer] of pageBackgroundBuffers.entries()) {
    const existingHash = await computeBufferHash(existingBuffer)
    if (existingHash === hash) {
      const existingPage = pages.find((p) => p.id === existingPageId)
      const existingDataUrl = pageBackgroundDataUrls.get(existingPageId)
      if (existingDataUrl) {
        const filename = existingPage?.backgroundFilename ?? `backgrounds/${existingPageId}.png`
        return { filename, dataUrl: existingDataUrl, buffer: existingBuffer }
      }
    }
  }
  return null
}

/**
 * Read a File as both dataUrl and ArrayBuffer concurrently.
 */
export function readFileAsDataUrlAndBuffer(
  file: File,
): Promise<{ dataUrl: string; buffer: ArrayBuffer }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const bufReader = new FileReader()
      bufReader.onload = () => {
        resolve({ dataUrl, buffer: bufReader.result as ArrayBuffer })
      }
      bufReader.onerror = reject
      bufReader.readAsArrayBuffer(file)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
