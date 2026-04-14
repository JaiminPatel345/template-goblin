import JSZip from 'jszip'
import type { TemplateManifest } from '@template-goblin/types'
import { useTemplateStore } from '../store/templateStore.js'

const MANIFEST_FILENAME = 'manifest.json'
const BACKGROUND_FILENAME = 'background.png'

/** Maximum file size accepted for opening (100 MB) */
const MAX_FILE_SIZE = 100 * 1024 * 1024

/** Maximum number of files inside a ZIP (prevents ZIP bomb) */
const MAX_ZIP_ENTRIES = 500

/**
 * Sanitize a filename for safe download.
 * Strips path separators, null bytes, and non-printable characters.
 */
function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/\.{2,}/g, '_')
      .slice(0, 200) || 'template'
  )
}

/**
 * Validate that a ZIP entry path is safe (no path traversal).
 */
function isSafeZipPath(entryName: string): boolean {
  if (entryName.includes('..')) return false
  if (entryName.startsWith('/')) return false
  if (entryName.includes('\x00')) return false
  return true
}

/**
 * Sanitize parsed JSON to prevent prototype pollution.
 */
function sanitizeJson(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeJson)

  const clean: Record<string, unknown> = {}
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
    clean[key] = sanitizeJson((obj as Record<string, unknown>)[key])
  }
  return clean
}

/**
 * Save the current template as a .tgbl file (ZIP archive).
 * Triggers a browser download.
 */
export async function saveTemplate(): Promise<void> {
  const state = useTemplateStore.getState()
  const { meta, fields, fonts, groups, backgroundBuffer, fontBuffers, placeholderBuffers } = state

  const manifest: TemplateManifest = {
    version: '1.0',
    meta: { ...meta, updatedAt: new Date().toISOString() },
    fonts,
    groups,
    fields,
  }

  const zip = new JSZip()

  zip.file(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2))

  if (backgroundBuffer) {
    zip.file(BACKGROUND_FILENAME, backgroundBuffer)
  }

  for (const font of fonts) {
    const buffer = fontBuffers.get(font.id)
    if (buffer && isSafeZipPath(font.filename)) {
      zip.file(font.filename, buffer)
    }
  }

  for (const [filename, buffer] of placeholderBuffers) {
    const path = filename.startsWith('placeholders/') ? filename : `placeholders/${filename}`
    if (isSafeZipPath(path)) {
      zip.file(path, buffer)
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(meta.name)}.tgbl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Open a .tgbl file and load it into the template store.
 * Validates file size, ZIP structure, manifest schema, and sanitizes all data.
 */
export async function openTemplate(file: File): Promise<void> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${Math.round(file.size / 1024 / 1024)}MB exceeds 100MB limit`)
  }

  // Validate file extension
  if (!file.name.toLowerCase().endsWith('.tgbl')) {
    throw new Error('Invalid file: expected .tgbl extension')
  }

  const store = useTemplateStore.getState()
  const arrayBuffer = await file.arrayBuffer()

  let zip: JSZip
  try {
    zip = await JSZip.loadAsync(arrayBuffer)
  } catch {
    throw new Error('Invalid .tgbl file: not a valid ZIP archive')
  }

  // ZIP bomb check: limit number of entries
  const entryCount = Object.keys(zip.files).length
  if (entryCount > MAX_ZIP_ENTRIES) {
    throw new Error(`Invalid .tgbl file: too many entries (${entryCount}, max ${MAX_ZIP_ENTRIES})`)
  }

  // Validate all ZIP paths are safe
  for (const name of Object.keys(zip.files)) {
    if (!isSafeZipPath(name)) {
      throw new Error(`Invalid .tgbl file: unsafe path "${name}"`)
    }
  }

  // Read and validate manifest
  const manifestFile = zip.file(MANIFEST_FILENAME)
  if (!manifestFile) {
    throw new Error('Invalid .tgbl file: missing manifest.json')
  }

  const manifestText = await manifestFile.async('text')

  let manifest: TemplateManifest
  try {
    const parsed = sanitizeJson(JSON.parse(manifestText)) as TemplateManifest

    // Validate structure
    if (!parsed.version || typeof parsed.version !== 'string') throw new Error('missing version')
    if (!parsed.meta || typeof parsed.meta !== 'object') throw new Error('missing meta')
    if (!Array.isArray(parsed.fields)) throw new Error('missing fields array')
    if (!Array.isArray(parsed.fonts)) throw new Error('missing fonts array')
    if (!Array.isArray(parsed.groups)) throw new Error('missing groups array')

    // Validate meta
    if (typeof parsed.meta.width !== 'number' || typeof parsed.meta.height !== 'number') {
      throw new Error('invalid meta dimensions')
    }
    if (
      parsed.meta.width <= 0 ||
      parsed.meta.height <= 0 ||
      parsed.meta.width > 10000 ||
      parsed.meta.height > 10000
    ) {
      throw new Error('page dimensions out of range')
    }

    manifest = parsed
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'manifest parse error'
    throw new Error(`Invalid .tgbl file: ${msg}`, { cause: err })
  }

  // Load background image
  let backgroundDataUrl: string | null = null
  let backgroundBuffer: ArrayBuffer | null = null
  const bgFile = zip.file(BACKGROUND_FILENAME)
  if (bgFile) {
    backgroundBuffer = await bgFile.async('arraybuffer')
    const blob = new Blob([backgroundBuffer], { type: 'image/png' })
    backgroundDataUrl = await blobToDataUrl(blob)
  }

  // Load fonts (validate paths)
  const fontBuffers = new Map<string, ArrayBuffer>()
  for (const font of manifest.fonts) {
    if (!font.filename || !isSafeZipPath(font.filename)) continue
    const fontFile = zip.file(font.filename)
    if (fontFile) {
      fontBuffers.set(font.id, await fontFile.async('arraybuffer'))
    }
  }

  // Load placeholder images (validate paths)
  const placeholderBuffers = new Map<string, ArrayBuffer>()
  for (const field of manifest.fields) {
    if (field.type === 'image') {
      const style = field.style as { placeholderFilename?: string | null }
      if (style.placeholderFilename && isSafeZipPath(style.placeholderFilename)) {
        const phFile = zip.file(style.placeholderFilename)
        if (phFile) {
          placeholderBuffers.set(style.placeholderFilename, await phFile.async('arraybuffer'))
        }
      }
    }
  }

  store.loadFromManifest(
    manifest.meta,
    manifest.fields,
    manifest.fonts,
    manifest.groups,
    backgroundDataUrl,
    backgroundBuffer,
    fontBuffers,
    placeholderBuffers,
  )
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
