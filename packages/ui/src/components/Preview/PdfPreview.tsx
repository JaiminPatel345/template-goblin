import { useEffect, useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generatePreviewHtml } from '../../utils/previewGenerator.js'

/**
 * Preview component — when showPreview becomes true,
 * generates a WYSIWYG HTML preview and opens it in a new browser tab.
 */
export function PdfPreview() {
  const showPreview = useUiStore((s) => s.showPreview)
  const setShowPreview = useUiStore((s) => s.setShowPreview)
  const jsonMode = useUiStore((s) => s.jsonPreviewMode)
  const repeatCount = useUiStore((s) => s.maxModeRepeatCount)
  const fields = useTemplateStore((s) => s.fields)
  const meta = useTemplateStore((s) => s.meta)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const prevUrl = useRef<string | null>(null)

  useEffect(() => {
    if (!showPreview) return

    let cancelled = false

    async function openPreview() {
      try {
        const blob = await generatePreviewHtml(
          fields,
          { name: meta.name, width: meta.width, height: meta.height },
          backgroundDataUrl,
          jsonMode,
          repeatCount,
        )

        if (cancelled) return

        // Revoke previous URL
        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)

        const url = URL.createObjectURL(blob)
        prevUrl.current = url

        // Open in new tab
        window.open(url, '_blank')
      } catch (err) {
        if (!cancelled) {
          alert(err instanceof Error ? err.message : 'Preview generation failed')
        }
      } finally {
        if (!cancelled) {
          // Reset the toggle so user can click again
          setShowPreview(false)
        }
      }
    }

    openPreview()

    return () => {
      cancelled = true
    }
  }, [showPreview])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
    }
  }, [])

  // This component doesn't render anything visible —
  // it just handles the preview generation and new-tab opening
  return null
}
