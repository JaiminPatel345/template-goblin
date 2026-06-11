import JSZip from 'jszip'
import type { PageBand, TemplateManifest } from '@template-goblin/types'
import { collectReferencedImageAssets } from 'template-goblin/assetRefs'
import type { TemplateStoreSnapshot } from './templateToLoaded.js'

/**
 * .tgbl archive assembly — extracted from `saveOpen.ts` so the ZIP
 * contents are buildable (and unit-testable) without the browser
 * download machinery, and so `saveOpen.ts` stays under the 300-line cap.
 */
export const MANIFEST_FILENAME = 'manifest.json'
export const BACKGROUND_FILENAME = 'background.png'

/**
 * Sanitize a filename for safe download.
 * Strips path separators, null bytes, and non-printable characters.
 */
export function sanitizeFilename(name: string): string {
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
export function isSafeZipPath(entryName: string): boolean {
  if (entryName.includes('..')) return false
  if (entryName.startsWith('/')) return false
  if (entryName.includes('\x00')) return false
  return true
}

export interface BuiltTemplateArchive {
  zip: JSZip
  manifest: TemplateManifest
  /** Fields silently dropped for missing `source` — surfaced to the user (QA BUG-09). */
  droppedFieldIds: string[]
}

/**
 * Assemble the .tgbl ZIP for the given store snapshot: manifest.json,
 * backgrounds, fonts, and the manifest-referenced image assets.
 *
 * Image pools are append-only during a session (eager deletion would
 * break undo and shared-filename fields), so they accumulate orphans
 * from deleted / replaced / mode-flipped fields. The sweep happens here
 * at the archive boundary — only entries the manifest references are
 * written, so the .tgbl never bloats with dead bytes.
 */
export function buildTemplateArchive(state: TemplateStoreSnapshot): BuiltTemplateArchive {
  const {
    meta,
    fields,
    fonts,
    groups,
    pages,
    backgroundBuffer,
    pageBackgroundBuffers,
    fontBuffers,
    placeholderBuffers,
    staticImageBuffers,
    // #61 — page-wide header / footer / page-number config. Optional; only
    // present in the saved manifest when the user has enabled them.
    header,
    footer,
    pageNumber,
  } = state

  // Defence in depth: filter out fields missing `source` before serialising.
  // These can only originate from a stale localStorage rehydration and would
  // make the saved `.tgbl` fail `validateManifest` on reload. We also record
  // the dropped ids so the caller can surface a UI warning instead of
  // relying on console output the user never sees (QA BUG-09).
  const droppedFieldIds: string[] = []
  const sanitizedFields = fields.filter((f) => {
    if (!f.source) {
      droppedFieldIds.push(f.id)
      console.warn('[saveTemplate] dropping field with missing source:', f.id)
      return false
    }
    return true
  })

  const sanitizeBand = (band: PageBand | undefined): PageBand | undefined =>
    band
      ? {
          ...band,
          fields: band.fields.filter((f) => {
            if (!f.source) {
              droppedFieldIds.push(f.id)
              console.warn('[saveTemplate] dropping band field with missing source:', f.id)
              return false
            }
            return true
          }),
        }
      : band

  const manifest: TemplateManifest = {
    version: '1.0',
    meta: { ...meta, updatedAt: new Date().toISOString() },
    fonts,
    groups,
    pages,
    fields: sanitizedFields,
    header: sanitizeBand(header),
    footer: sanitizeBand(footer),
    pageNumber,
  }

  const zip = new JSZip()

  zip.file(MANIFEST_FILENAME, JSON.stringify(manifest, null, 2))

  // Legacy page-0 background
  if (backgroundBuffer) {
    zip.file(BACKGROUND_FILENAME, backgroundBuffer)
  }

  // Per-page backgrounds under backgrounds/ folder
  for (const page of pages) {
    if (page.backgroundType === 'image' && page.backgroundFilename) {
      const buffer = pageBackgroundBuffers.get(page.id)
      if (buffer && isSafeZipPath(page.backgroundFilename)) {
        zip.file(page.backgroundFilename, buffer)
      }
    }
  }

  for (const font of fonts) {
    const buffer = fontBuffers.get(font.id)
    if (buffer && isSafeZipPath(font.filename)) {
      zip.file(font.filename, buffer)
    }
  }

  // The orphan sweep — persist only manifest-referenced image assets.
  const imageRefs = collectReferencedImageAssets(manifest)

  for (const [filename, buffer] of placeholderBuffers) {
    if (!imageRefs.placeholders.has(filename)) continue
    const path = filename.startsWith('placeholders/') ? filename : `placeholders/${filename}`
    if (isSafeZipPath(path)) {
      zip.file(path, buffer)
    }
  }

  // Static image files referenced by static-image fields (images/<filename>).
  for (const [filename, buffer] of staticImageBuffers) {
    if (!imageRefs.staticImages.has(filename)) continue
    const path = filename.startsWith('images/') ? filename : `images/${filename}`
    if (isSafeZipPath(path)) {
      zip.file(path, buffer)
    }
  }

  return { zip, manifest, droppedFieldIds }
}
