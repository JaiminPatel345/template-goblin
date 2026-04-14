import { useState, useEffect, useRef, useMemo } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generateExampleJson } from '../../utils/jsonGenerator.js'

/**
 * Inline PDF preview panel.
 *
 * Generates a real PDF using the core library's rendering logic bundled for browser,
 * or falls back to showing the JSON data structure if PDF generation isn't available.
 */
export function PdfPreview() {
  const showPreview = useUiStore((s) => s.showPreview)
  const setShowPreview = useUiStore((s) => s.setShowPreview)
  const jsonMode = useUiStore((s) => s.jsonPreviewMode)
  const repeatCount = useUiStore((s) => s.maxModeRepeatCount)
  const fields = useTemplateStore((s) => s.fields)
  const meta = useTemplateStore((s) => s.meta)

  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [panelWidth, setPanelWidth] = useState(400)
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null)

  const data = useMemo(
    () => generateExampleJson(fields, jsonMode, repeatCount),
    [fields, jsonMode, repeatCount],
  )

  // Generate PDF preview when data or visibility changes
  useEffect(() => {
    if (!showPreview) return

    let cancelled = false
    setLoading(true)
    setError(null)

    // Use a timeout to debounce rapid changes
    const timer = setTimeout(async () => {
      try {
        // For now, render a simple HTML representation since PDFKit browser bundling
        // requires additional Vite configuration. This will be replaced with actual
        // PDF generation once the browser PDFKit bundle is configured.
        const htmlContent = generatePreviewHtml(data, meta)
        const blob = new Blob([htmlContent], { type: 'text/html' })
        const url = URL.createObjectURL(blob)

        if (!cancelled) {
          setPdfUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev)
            return url
          })
          setLoading(false)
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
  }, [showPreview, data, meta])

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  // Resize handling
  function handleResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startWidth: panelWidth }

    function handleMouseMove(ev: MouseEvent) {
      if (!resizeRef.current) return
      const diff = resizeRef.current.startX - ev.clientX
      setPanelWidth(Math.max(250, Math.min(800, resizeRef.current.startWidth + diff)))
    }

    function handleMouseUp() {
      resizeRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  if (!showPreview) return null

  return (
    <div
      className="tg-preview-panel"
      style={{ width: panelWidth, flexShrink: 0, display: 'flex', flexDirection: 'column' }}
    >
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
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 12 }}>Preview</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {pdfUrl && (
            <button
              className="tg-btn"
              style={{ fontSize: 11, padding: '2px 8px' }}
              onClick={() => window.open(pdfUrl, '_blank')}
            >
              Open in Tab
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
            <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
              Generating preview...
            </div>
          </div>
        )}
        {error && (
          <div
            style={{
              padding: 16,
              color: 'var(--error)',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
        {pdfUrl && (
          <iframe
            src={pdfUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff',
            }}
            title="PDF Preview"
          />
        )}
      </div>
    </div>
  )
}

/**
 * Generate an HTML preview of the template data.
 * This is a temporary representation until PDFKit browser bundling is configured.
 */
function generatePreviewHtml(
  data: ReturnType<typeof generateExampleJson>,
  meta: { name: string; width: number; height: number },
): string {
  const textEntries = Object.entries(data.texts)
    .map(
      ([key, val]) =>
        `<div style="margin:4px 0"><strong>${key}:</strong> ${val || '<em>empty</em>'}</div>`,
    )
    .join('')

  const loopEntries = Object.entries(data.loops)
    .map(([key, rows]) => {
      if (rows.length === 0)
        return `<div style="margin:4px 0"><strong>${key}:</strong> <em>no data</em></div>`
      const cols = Object.keys(rows[0] ?? {})
      const header = cols
        .map(
          (c) => `<th style="padding:4px 8px;border:1px solid #ccc;background:#f5f5f5">${c}</th>`,
        )
        .join('')
      const body = rows
        .map(
          (row) =>
            '<tr>' +
            cols
              .map((c) => `<td style="padding:4px 8px;border:1px solid #ccc">${row[c] ?? ''}</td>`)
              .join('') +
            '</tr>',
        )
        .join('')
      return `<div style="margin:8px 0"><strong>${key}:</strong><table style="border-collapse:collapse;margin-top:4px;font-size:11px"><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: -apple-system, sans-serif; font-size: 13px; padding: 20px; color: #333; margin: 0; }
  h2 { font-size: 16px; color: #1a1a2e; margin: 0 0 8px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 16px; }
  .section { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
  .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; color: #888; margin-bottom: 6px; }
</style></head>
<body>
  <h2>${meta.name}</h2>
  <div class="meta">${meta.width}x${meta.height} pt</div>
  ${textEntries ? `<div class="section"><div class="section-title">Texts</div>${textEntries}</div>` : ''}
  ${loopEntries ? `<div class="section"><div class="section-title">Tables</div>${loopEntries}</div>` : ''}
  ${
    Object.keys(data.images).length > 0
      ? `<div class="section"><div class="section-title">Images</div>${Object.keys(data.images)
          .map((k) => `<div>${k}: [image data]</div>`)
          .join('')}</div>`
      : ''
  }
</body></html>`
}
