import { useEffect, useRef, useMemo } from 'react'
import type { PageDefinition } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generatePreviewHtml, type PagePreviewInput } from '../../utils/previewGenerator.js'
import { generateExampleJson } from '../../utils/jsonGenerator.js'

/**
 * When showPreview becomes true, generates a WYSIWYG PDF preview
 * with actual text/table values rendered at exact field positions,
 * and opens it in a new browser tab. User can print (Ctrl+P) to save as real PDF.
 */
export function PdfPreview() {
  const showPreview = useUiStore((s) => s.showPreview)
  const setShowPreview = useUiStore((s) => s.setShowPreview)
  const jsonMode = useUiStore((s) => s.jsonPreviewMode)
  const repeatCount = useUiStore((s) => s.maxModeRepeatCount)
  const fields = useTemplateStore((s) => s.fields)
  const meta = useTemplateStore((s) => s.meta)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const pages = useTemplateStore((s) => s.pages)
  const pageBackgroundDataUrls = useTemplateStore((s) => s.pageBackgroundDataUrls)
  const placeholderBuffers = useTemplateStore((s) => s.placeholderBuffers)
  const staticImageDataUrls = useTemplateStore((s) => s.staticImageDataUrls)
  const prevUrl = useRef<string | null>(null)

  // Generate the JSON data based on current mode
  const previewData = useMemo(
    () => generateExampleJson(fields, jsonMode, repeatCount),
    [fields, jsonMode, repeatCount],
  )

  // Resolve every page's background into a concrete (color | imageDataUrl)
  // pair the preview generator can render directly. Mirrors the canvas's
  // `useCurrentBackground` resolution so the printed sheet looks like the
  // canvas (#49 — multi-page preview).
  const pagePreviewInputs = useMemo<PagePreviewInput[]>(
    () => resolvePagePreviewInputs(pages, pageBackgroundDataUrls, backgroundDataUrl),
    [pages, pageBackgroundDataUrls, backgroundDataUrl],
  )

  // Build a `filename → dataUrl` map covering both static images (already
  // stored as data URLs) and dynamic-image placeholders (stored as raw
  // ArrayBuffers). The preview honours these so a static image renders
  // as a real bitmap instead of a `[filename]` placeholder rect (#44).
  // Use real `data:` URLs (not blob: URLs) — the preview opens in a new
  // tab via `window.open`, and blob: URLs are scoped to the issuing
  // window so the new tab can't resolve them.
  const imageDataUrls = useMemo(() => {
    const map = new Map<string, string>()
    for (const [filename, dataUrl] of staticImageDataUrls) map.set(filename, dataUrl)
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
        // Ignore corrupt buffers; they fall back to the placeholder rect.
      }
    }
    return map
  }, [staticImageDataUrls, placeholderBuffers])

  useEffect(() => {
    if (!showPreview) return

    let cancelled = false

    async function openPreview() {
      try {
        const blob = await generatePreviewHtml(
          fields,
          { name: meta.name, width: meta.width, height: meta.height },
          pagePreviewInputs,
          previewData,
          { imageDataUrls },
        )

        if (cancelled) return

        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
        const url = URL.createObjectURL(blob)
        prevUrl.current = url
        window.open(url, '_blank')
      } catch (err) {
        if (!cancelled) {
          alert(err instanceof Error ? err.message : 'Preview generation failed')
        }
      } finally {
        if (!cancelled) setShowPreview(false)
      }
    }

    openPreview()
    return () => {
      cancelled = true
    }
  }, [showPreview])

  useEffect(() => {
    return () => {
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
    }
  }, [])

  return null
}

/**
 * Resolve every page's background into the (id, color, dataUrl) triple
 * the preview generator consumes. Honours:
 *   - solid-color pages → `backgroundColor`
 *   - image pages → `pageBackgroundDataUrls.get(page.id)`
 *   - `inherit` → walk back through earlier pages until a concrete bg
 *   - legacy single-page templates with no `pages[]` entry → use
 *     `backgroundDataUrl` directly under a synthetic `id: null` page so
 *     orphaned fields still print on a sheet that has the right bg.
 *
 * Mirrors the resolution rules in `Canvas/CanvasArea.tsx::useCurrentBackground`.
 */
function resolvePagePreviewInputs(
  pages: PageDefinition[],
  pageBackgroundDataUrls: Map<string, string>,
  legacyBackgroundDataUrl: string | null,
): PagePreviewInput[] {
  const sorted = [...pages].sort((a, b) => a.index - b.index)

  // Legacy single-page templates that pre-date the explicit `pages[]`
  // schema only have `backgroundDataUrl`. Render that as a single-page
  // implicit sheet so orphaned fields still land somewhere. No per-page
  // size — preview generator falls back to `meta.width`/`meta.height`.
  if (sorted.length === 0) {
    return [{ id: null, backgroundDataUrl: legacyBackgroundDataUrl, backgroundColor: '#ffffff' }]
  }

  // GH #23 image-onboarding compat: a template can have no entry at
  // index 0 but a non-null `legacyBackgroundDataUrl`. Treat that legacy
  // background as Page 1 and shift the explicit pages after it.
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
  // Per-page width/height (#46/#47). `getPageSize` resolves `undefined` →
  // template meta, but the preview generator does the same fallback when
  // these stay undefined, so we pass through whatever the page declares.
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
  // 'inherit': walk back through earlier pages until we find a concrete bg.
  // INTENTIONALLY DIFFERS from `useCurrentBackground` in CanvasArea: the
  // canvas returns `null` when the inherit chain ends at a colour page
  // (the previous page's paint is already underneath in the same canvas).
  // The preview emits each page as an independent <section>, so the colour
  // MUST be carried forward — otherwise a Page-2 set to "inherit" from a
  // red Page-1 would print white. Don't "fix the drift".
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

/**
 * Sniff the image MIME type from the first few bytes of an uploaded buffer.
 * Falls through to `null` if nothing matches — caller then defaults to
 * `image/png`. Covers the formats the file picker accepts (PNG, JPEG, GIF,
 * WEBP) so the data URL we emit is correctly recognised by the preview.
 */
function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  // GIF: 47 49 46 38 ... (GIF87a / GIF89a)
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
