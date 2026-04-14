import { useState, useEffect, useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generatePreviewHtml } from '../../utils/previewGenerator.js'

/**
 * Inline PDF preview panel.
 * Generates a real PDF using PDFKit and renders it in an iframe.
 */
export function PdfPreview() {
  const showPreview = useUiStore((s) => s.showPreview)
  const setShowPreview = useUiStore((s) => s.setShowPreview)
  const jsonMode = useUiStore((s) => s.jsonPreviewMode)
  const repeatCount = useUiStore((s) => s.maxModeRepeatCount)
  const fields = useTemplateStore((s) => s.fields)
  const meta = useTemplateStore((s) => s.meta)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(400)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  // Generate PDF when data or visibility changes
  useEffect(() => {
    if (!showPreview) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const timer = setTimeout(async () => {
      try {
        const blob = await generatePreviewHtml(
          fields,
          { name: meta.name, width: meta.width, height: meta.height },
          backgroundDataUrl,
          jsonMode,
          repeatCount,
        )
        const url = URL.createObjectURL(blob)

        if (!cancelled) {
          setPdfUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
          setLoading(false)
        } else {
          URL.revokeObjectURL(url)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Preview generation failed')
          setLoading(false)
        }
      }
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [showPreview, fields, meta, backgroundDataUrl, jsonMode, repeatCount])

  // Cleanup
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  // Resize
  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startWidth: panelWidth }

    function onMove(ev: MouseEvent) {
      if (!resizeRef.current) return
      const diff = resizeRef.current.startX - ev.clientX
      setPanelWidth(Math.max(250, Math.min(800, resizeRef.current.startWidth + diff)))
    }
    function onUp() {
      resizeRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  if (!showPreview) return null

  return (
    <div className="tg-preview-panel" style={{ width: panelWidth }}>
      {/* Resize handle */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          cursor: 'col-resize',
          zIndex: 10,
        }}
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 12 }}>PDF Preview</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {pdfUrl && (
            <button
              className="tg-btn"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => window.open(pdfUrl, '_blank')}
            >
              New Tab
            </button>
          )}
          <button
            className="tg-btn"
            style={{ fontSize: 11, padding: '2px 8px' }}
            onClick={() => setShowPreview(false)}
          >
            Close
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.3)',
              zIndex: 5,
            }}
          >
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Generating PDF...</div>
          </div>
        )}
        {error && (
          <div style={{ padding: 16, color: 'var(--error)', fontSize: 12, textAlign: 'center' }}>
            <p>{error}</p>
          </div>
        )}
        {pdfUrl && !error && (
          <iframe
            src={pdfUrl}
            sandbox=""
            style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  )
}
