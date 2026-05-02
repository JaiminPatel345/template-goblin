/**
 * Shared helpers for building the inputs `generatePreviewHtml` consumes.
 *
 * Extracted from `PdfPreview.tsx` so the new interactive `PreviewDialog`
 * (#45) can build the same `imageDataUrls` map and `PagePreviewInput[]`
 * the auto-trigger flow uses. Pure — no React, no store.
 */
import type { PageDefinition } from '@template-goblin/types'
import type { PagePreviewInput } from './previewGenerator.js'

/**
 * Sniff the image MIME type from the first few bytes of an uploaded buffer.
 * Falls through to `null` if nothing matches — caller defaults to
 * `image/png`. Covers PNG/JPEG/GIF/WEBP.
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  // GIF: 47 49 46 38 ...
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return 'image/gif'
  // WEBP: "RIFF" .... "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

/**
 * Build a `filename → dataUrl` map covering both static images (already
 * stored as data URLs) and dynamic-image placeholders (stored as raw
 * `ArrayBuffer`s). Static URLs win on key collision.
 *
 * Real `data:` URLs (not `blob:`) — the preview opens in a new tab via
 * `window.open`, and `blob:` URLs are scoped to the issuing window.
 */
export function buildImageDataUrlMap(
  staticImageDataUrls: ReadonlyArray<readonly [string, string]> | Map<string, string>,
  placeholderBuffers: Map<string, ArrayBuffer>,
): Map<string, string> {
  const map = new Map<string, string>()
  const staticEntries =
    staticImageDataUrls instanceof Map
      ? Array.from(staticImageDataUrls.entries())
      : staticImageDataUrls
  for (const [filename, dataUrl] of staticEntries) map.set(filename, dataUrl)
  for (const [filename, buffer] of placeholderBuffers) {
    if (map.has(filename)) continue
    try {
      const bytes = new Uint8Array(buffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i] ?? 0)
      const base64 = btoa(binary)
      const mime = sniffImageMime(bytes) ?? 'image/png'
      map.set(filename, `data:${mime};base64,${base64}`)
    } catch {
      // Corrupt buffer — skip; renderer falls back to placeholder rect.
    }
  }
  return map
}

/**
 * Resolve every page's background into the (id, color, dataUrl) triple the
 * preview generator consumes. Mirrors `useCurrentBackground` in CanvasArea
 * with one deliberate divergence: `inherit` walks the chain to a concrete
 * background and carries the colour forward (the canvas can leave it null
 * because earlier pages share the same surface; preview emits each page as
 * an independent `<section>`, so an inherited colour MUST be propagated or
 * the page prints white).
 */
export function resolvePagePreviewInputs(
  pages: PageDefinition[],
  pageBackgroundDataUrls: Map<string, string>,
  legacyBackgroundDataUrl: string | null,
): PagePreviewInput[] {
  const sorted = [...pages].sort((a, b) => a.index - b.index)

  // Legacy single-page templates (pre-`pages[]` schema): render the legacy
  // bg as an implicit Page 1 so orphaned fields still land somewhere.
  if (sorted.length === 0) {
    return [{ id: null, backgroundDataUrl: legacyBackgroundDataUrl, backgroundColor: '#ffffff' }]
  }

  // Image-onboarding compat (#23): no entry at index 0 but a non-null
  // legacy bg — treat it as Page 1 and shift the explicit pages after it.
  const hasIndex0 = sorted.some((p) => p.index === 0)
  if (!hasIndex0 && legacyBackgroundDataUrl) {
    return [
      { id: null, backgroundDataUrl: legacyBackgroundDataUrl, backgroundColor: '#ffffff' },
      ...sorted.map((p) => resolveOnePage(p, sorted, pageBackgroundDataUrls)),
    ]
  }

  return sorted.map((p) => resolveOnePage(p, sorted, pageBackgroundDataUrls))
}

function withSize(input: PagePreviewInput, page: PageDefinition): PagePreviewInput {
  if (typeof page.width === 'number' && typeof page.height === 'number') {
    return { ...input, width: page.width, height: page.height }
  }
  return input
}

function resolveOnePage(
  page: PageDefinition,
  sorted: PageDefinition[],
  pageBackgroundDataUrls: Map<string, string>,
): PagePreviewInput {
  if (page.backgroundType === 'image') {
    return withSize(
      {
        id: page.id,
        backgroundDataUrl: pageBackgroundDataUrls.get(page.id) ?? null,
        backgroundColor: '#ffffff',
      },
      page,
    )
  }
  if (page.backgroundType === 'color') {
    return withSize({ id: page.id, backgroundColor: page.backgroundColor ?? '#ffffff' }, page)
  }
  // 'inherit': walk back to the nearest concrete bg.
  for (let i = page.index - 1; i >= 0; i--) {
    const prev = sorted.find((p) => p.index === i)
    if (!prev) continue
    if (prev.backgroundType === 'image') {
      return withSize(
        {
          id: page.id,
          backgroundDataUrl: pageBackgroundDataUrls.get(prev.id) ?? null,
          backgroundColor: '#ffffff',
        },
        page,
      )
    }
    if (prev.backgroundType === 'color') {
      return withSize({ id: page.id, backgroundColor: prev.backgroundColor ?? '#ffffff' }, page)
    }
  }
  return withSize({ id: page.id, backgroundColor: '#ffffff' }, page)
}
