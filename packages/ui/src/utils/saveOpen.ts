import JSZip from 'jszip'
import type { TemplateManifest } from '@template-goblin/types'
import { useTemplateStore } from '../store/templateStore.js'

const MANIFEST_FILENAME = 'manifest.json'
const BACKGROUND_FILENAME = 'background.png'

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

  // Add manifest.json
  zip.file(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2))

  // Add background image
  if (backgroundBuffer) {
    zip.file(BACKGROUND_FILENAME, backgroundBuffer)
  }

  // Add fonts
  for (const font of fonts) {
    const buffer = fontBuffers.get(font.id)
    if (buffer) {
      zip.file(font.filename, buffer)
    }
  }

  // Add placeholder images
  for (const [filename, buffer] of placeholderBuffers) {
    const path = filename.startsWith('placeholders/') ? filename : `placeholders/${filename}`
    zip.file(path, buffer)
  }

  // Generate ZIP and trigger download
  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${meta.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.tgbl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Open a .tgbl file and load it into the template store.
 */
export async function openTemplate(file: File): Promise<void> {
  const store = useTemplateStore.getState()

  const arrayBuffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(arrayBuffer)

  // Read manifest
  const manifestFile = zip.file(MANIFEST_FILENAME)
  if (!manifestFile) {
    throw new Error('Invalid .tgbl file: missing manifest.json')
  }

  const manifestText = await manifestFile.async('text')
  const manifest = JSON.parse(manifestText) as TemplateManifest

  // Validate basic structure
  if (!manifest.version || !manifest.meta || !Array.isArray(manifest.fields)) {
    throw new Error('Invalid .tgbl file: manifest structure is invalid')
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

  // Load fonts
  const fontBuffers = new Map<string, ArrayBuffer>()
  for (const font of manifest.fonts) {
    const fontFile = zip.file(font.filename)
    if (fontFile) {
      fontBuffers.set(font.id, await fontFile.async('arraybuffer'))
    }
  }

  // Load placeholder images
  const placeholderBuffers = new Map<string, ArrayBuffer>()
  for (const field of manifest.fields) {
    if (field.type === 'image') {
      const style = field.style as { placeholderFilename?: string | null }
      if (style.placeholderFilename) {
        const phFile = zip.file(style.placeholderFilename)
        if (phFile) {
          placeholderBuffers.set(style.placeholderFilename, await phFile.async('arraybuffer'))
        }
      }
    }
  }

  // Load into store
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

/**
 * Convert a Blob to a data URL.
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
