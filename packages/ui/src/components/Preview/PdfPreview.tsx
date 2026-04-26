import { useEffect, useRef, useMemo } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generatePreviewHtml } from '../../utils/previewGenerator.js'
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
  const placeholderBuffers = useTemplateStore((s) => s.placeholderBuffers)
  const staticImageDataUrls = useTemplateStore((s) => s.staticImageDataUrls)
  const prevUrl = useRef<string | null>(null)

  // Resolve page-0 solid color (if chosen during onboarding) so the preview
  // honours it instead of falling back to white.
  const page0 = pages.find((p) => p.index === 0)
  const page0Color = page0?.backgroundType === 'color' ? (page0.backgroundColor ?? '#ffffff') : null

  // Generate the JSON data based on current mode
  const previewData = useMemo(
    () => generateExampleJson(fields, jsonMode, repeatCount),
    [fields, jsonMode, repeatCount],
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
          backgroundDataUrl,
          previewData,
          { backgroundColor: page0Color, imageDataUrls },
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
