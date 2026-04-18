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
          { backgroundColor: page0Color },
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
