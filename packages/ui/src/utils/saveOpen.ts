import JSZip from 'jszip'
import type { TemplateManifest, PageDefinition, PageBand } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { validateManifest } from 'template-goblin/validateManifest'
import { useTemplateStore } from '../store/templateStore.js'
import { useUiStore } from '../store/uiStore.js'
import {
  MANIFEST_FILENAME,
  BACKGROUND_FILENAME,
  buildTemplateArchive,
  isSafeZipPath,
  sanitizeFilename,
} from './templateArchive.js'

/** Maximum file size accepted for opening (100 MB) */
const MAX_FILE_SIZE = 100 * 1024 * 1024

/** Maximum number of files inside a ZIP (prevents ZIP bomb) */
const MAX_ZIP_ENTRIES = 500

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

/** Outcome of a save — surfaces silently-dropped fields so callers can
 *  warn the user (QA BUG-09). */
export interface SaveResult {
  droppedFieldIds: string[]
}

/**
 * Save the current template as a .tgbl file (ZIP archive).
 * Archive assembly (manifest, assets, orphan sweep) lives in
 * `buildTemplateArchive`; this wrapper only adds the browser download.
 */
export async function saveTemplate(): Promise<SaveResult> {
  const state = useTemplateStore.getState()
  const { zip, droppedFieldIds } = buildTemplateArchive(state)

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${sanitizeFilename(state.meta.name)}.tgbl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  return { droppedFieldIds }
}

/**
 * Open a .tgbl file and load it into the template store.
 * Validates file size, ZIP structure, manifest schema, and sanitizes all data.
 * Backward compatible: old single-page templates (no pages array) still work.
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

    // Defensive layering: shape check — cheap, fast, narrows for the core
    // validator (which expects a roughly-shaped manifest). Detailed field
    // validation lives in `validateManifest` below.
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

    // Backward compat: if pages is missing, default to empty array
    if (!Array.isArray(parsed.pages)) {
      parsed.pages = []
    }

    // Route through core `validateManifest` — enforces deep schema validation
    // (including `isSafeKey` on every `source.jsonKey`) so hostile manifests
    // are rejected at open time rather than surfacing as silent runtime
    // failures at PDF generation time.
    try {
      validateManifest(parsed)
    } catch (err) {
      if (err instanceof TemplateGoblinError) {
        throw new Error(`${err.message} (${err.code})`, { cause: err })
      }
      throw err
    }

    manifest = parsed
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'manifest parse error'
    throw new Error(`Invalid .tgbl file: ${msg}`, { cause: err })
  }

  // Load legacy background image (page 0)
  let backgroundDataUrl: string | null = null
  let backgroundBuffer: ArrayBuffer | null = null
  const bgFile = zip.file(BACKGROUND_FILENAME)
  if (bgFile) {
    backgroundBuffer = await bgFile.async('arraybuffer')
    const blob = new Blob([backgroundBuffer], { type: 'image/png' })
    backgroundDataUrl = await blobToDataUrl(blob)
  }

  // Load per-page backgrounds
  const pages: PageDefinition[] = manifest.pages
  const pageBackgroundDataUrls = new Map<string, string>()
  const pageBackgroundBuffers = new Map<string, ArrayBuffer>()

  for (const page of pages) {
    if (page.backgroundType === 'image' && page.backgroundFilename) {
      if (!isSafeZipPath(page.backgroundFilename)) continue
      const pageFile = zip.file(page.backgroundFilename)
      if (pageFile) {
        const buf = await pageFile.async('arraybuffer')
        pageBackgroundBuffers.set(page.id, buf)
        const blob = new Blob([buf], { type: 'image/png' })
        pageBackgroundDataUrls.set(page.id, await blobToDataUrl(blob))
      }
    }
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

  // Load placeholder images (validate paths). Placeholder filename moved from
  // `style.placeholderFilename` to `source.placeholder.filename` per spec 023.
  //
  // Save writes placeholders under the `placeholders/` directory (see
  // `saveTemplate` + `core/file/constants.PLACEHOLDERS_DIR`), so we look there
  // first. Falling back to the bare filename keeps legacy/hand-patched
  // archives working — the manifest stores only the bare name, never the
  // directory prefix. GH #50: without the `placeholders/<name>` lookup,
  // a save→reopen round-trip in a clean browser session showed the
  // filename text instead of the bitmap and (worse) re-saved an
  // archive missing every placeholder under `placeholders/`.
  // #61 — header/footer band fields reference assets in the same archive
  // folders. Loading only `manifest.fields` lost every band image: it
  // rendered blank after open, and the next save's orphan sweep dropped
  // the bytes from the archive for good.
  const allFields = [
    ...manifest.fields,
    ...(manifest.header?.fields ?? []),
    ...(manifest.footer?.fields ?? []),
  ]

  const placeholderBuffers = new Map<string, ArrayBuffer>()
  for (const field of allFields) {
    if (field.type !== 'image') continue
    if (field.source.mode !== 'dynamic') continue
    const ph = field.source.placeholder
    // GH #81 — solid-colour placeholders carry no asset; skip.
    if (!ph || 'color' in ph) continue
    const filename = ph.filename
    if (!filename || !isSafeZipPath(filename)) continue
    const archivePath = filename.startsWith('placeholders/') ? filename : `placeholders/${filename}`
    const phFile = zip.file(archivePath) ?? zip.file(filename)
    if (phFile) {
      placeholderBuffers.set(filename, await phFile.async('arraybuffer'))
    }
  }

  // Load static images baked into the archive under `images/`. Field references
  // use the bare filename per spec 023; archive entries live at
  // `images/<filename>`.
  const staticImageBuffers = new Map<string, ArrayBuffer>()
  const staticImageDataUrls = new Map<string, string>()
  for (const field of allFields) {
    if (field.type !== 'image') continue
    if (field.source.mode !== 'static') continue
    // GH #81 — solid-colour static fields carry no asset; skip.
    if ('color' in field.source.value) continue
    const filename = field.source.value.filename
    if (!filename) continue
    const archivePath = filename.startsWith('images/') ? filename : `images/${filename}`
    if (!isSafeZipPath(archivePath)) continue
    const entry = zip.file(archivePath)
    if (!entry) continue
    const buffer = await entry.async('arraybuffer')
    const blob = new Blob([buffer])
    const dataUrl = await blobToDataUrl(blob)
    staticImageBuffers.set(filename, buffer)
    staticImageDataUrls.set(filename, dataUrl)
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
    pages,
    pageBackgroundDataUrls,
    pageBackgroundBuffers,
    staticImageBuffers,
    staticImageDataUrls,
    // #61 — restore bands + page-number config on open. Pre-#61 manifests
    // simply have these undefined; the store accepts that and leaves the
    // existing legacy behaviour untouched. Bands written before the
    // hide-preserves-config follow-up may lack the `enabled` flag — we
    // default missing values to `true` so opening an old archive shows
    // the band exactly as it was saved.
    backfillEnabledFlag(manifest.header),
    backfillEnabledFlag(manifest.footer),
    manifest.pageNumber,
  )

  // The PREVIOUS template's view state must not leak into the opened one:
  // `currentPageId` is persisted, and an id no new page has makes
  // `deriveCanvasFields` filter every body field — the template opened
  // "empty" until the user happened to click a page tab.
  useUiStore.getState().setCurrentPage(null)
  useUiStore.getState().clearSelection()
}

/**
 * Default the `enabled` flag to `true` on bands written before the
 * hide-preserves-config follow-up landed. Old archives serialised the
 * band without that key, so we'd otherwise treat them as hidden after
 * the schema change.
 */
function backfillEnabledFlag(band: PageBand | undefined): PageBand | undefined {
  if (!band) return band
  if (typeof band.enabled === 'boolean') return band
  return { ...band, enabled: true }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
