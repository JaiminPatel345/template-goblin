/**
 * PreviewDialog (#45) — interactive replacement for the old auto-open
 * preview flow.
 *
 * Pre-fills a JSON editor with `generateExampleJson(...)` (the same shape
 * the previous auto-trigger used) and lists every dynamic image field for
 * optional file replacement. The user edits, clicks Render, and the dialog
 * runs the existing `generatePreviewHtml` pipeline with the supplied data
 * + image overrides; the result opens in a new tab.
 *
 * Heavy lifting (parse/upload helpers, ImageUploadRow) lives in sibling
 * files to keep this one under the 300-line cap (Hard Rule #11).
 */
import { useState, useMemo, useEffect, useRef } from 'react'
import type { ImageField } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generatePreviewHtml } from '../../utils/previewGenerator.js'
import { generateExampleJson } from '../../utils/jsonGenerator.js'
import { buildImageDataUrlMap, resolvePagePreviewInputs } from '../../utils/previewInputs.js'
import {
  parseInputJson,
  readAsDataUrl,
  getPlaceholderFilename,
  validateUpload,
} from './previewDialogHelpers.js'
import { PreviewImageUploadRow } from './PreviewImageUploadRow.js'

interface UploadedImage {
  dataUrl: string
  /**
   * Filename to override in the renderer's `imageDataUrls` map. Defaults
   * to the field's placeholder filename so the renderer's existing
   * `data.images[jsonKey] = filename` lookup keeps working without a
   * second indirection. When the field has no placeholder we synthesise
   * `__upload_<jsonKey>` so different fields' uploads never collide.
   */
  filename: string
}

export function PreviewDialog({ onClose }: { onClose: () => void }) {
  const fields = useTemplateStore((s) => s.fields)
  const meta = useTemplateStore((s) => s.meta)
  const backgroundDataUrl = useTemplateStore((s) => s.backgroundDataUrl)
  const pages = useTemplateStore((s) => s.pages)
  const pageBackgroundDataUrls = useTemplateStore((s) => s.pageBackgroundDataUrls)
  const placeholderBuffers = useTemplateStore((s) => s.placeholderBuffers)
  const staticImageDataUrls = useTemplateStore((s) => s.staticImageDataUrls)
  const jsonMode = useUiStore((s) => s.jsonPreviewMode)
  const repeatCount = useUiStore((s) => s.maxModeRepeatCount)

  const defaultJsonText = useMemo(
    () => JSON.stringify(generateExampleJson(fields, jsonMode, repeatCount), null, 2),
    [fields, jsonMode, repeatCount],
  )

  const [jsonText, setJsonText] = useState(defaultJsonText)
  const [imageOverrides, setImageOverrides] = useState<Map<string, UploadedImage>>(new Map())
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const prevUrlRef = useRef<string | null>(null)

  const parseResult = useMemo(() => parseInputJson(jsonText), [jsonText])

  const baseImageDataUrls = useMemo(
    () => buildImageDataUrlMap(staticImageDataUrls, placeholderBuffers),
    [staticImageDataUrls, placeholderBuffers],
  )

  const dynamicImageFields = useMemo(
    () =>
      fields.filter(
        (f): f is ImageField => f.type === 'image' && !!f.source && f.source.mode === 'dynamic',
      ),
    [fields],
  )

  // ESC dismiss.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Cleanup blob URL on unmount.
  useEffect(
    () => () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    },
    [],
  )

  function handleReset() {
    setJsonText(defaultJsonText)
    setImageOverrides(new Map())
    setUploadError(null)
    setRenderError(null)
  }

  async function handleUpload(jsonKey: string, file: File) {
    setUploadError(null)
    const err = validateUpload(file)
    if (err) {
      setUploadError(err)
      return
    }
    let dataUrl: string
    try {
      dataUrl = await readAsDataUrl(file)
    } catch {
      setUploadError('Failed to read the file.')
      return
    }
    const field = dynamicImageFields.find(
      (f) => f.source.mode === 'dynamic' && f.source.jsonKey === jsonKey,
    )
    const placeholder = field ? getPlaceholderFilename(field.source) : null
    const filename = placeholder ?? `__upload_${jsonKey}`
    setImageOverrides((prev) => {
      const next = new Map(prev)
      next.set(jsonKey, { dataUrl, filename })
      return next
    })
  }

  async function handleRender() {
    if (!parseResult.ok || isRendering) return
    setRenderError(null)
    setIsRendering(true)
    try {
      const parsed = parseResult.data
      const data = {
        texts: (parsed.texts ?? {}) as Record<string, string>,
        tables: (parsed.tables ?? {}) as Record<string, Record<string, string>[]>,
        images: { ...((parsed.images ?? {}) as Record<string, string | null>) },
      }
      const merged = new Map(baseImageDataUrls)
      for (const [jsonKey, upload] of imageOverrides) {
        merged.set(upload.filename, upload.dataUrl)
        data.images[jsonKey] = upload.filename
      }
      const pagePreviewInputs = resolvePagePreviewInputs(
        pages,
        pageBackgroundDataUrls,
        backgroundDataUrl,
      )
      const blob = await generatePreviewHtml(
        fields,
        { name: meta.name, width: meta.width, height: meta.height },
        pagePreviewInputs,
        data,
        { imageDataUrls: merged },
      )
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
      const url = URL.createObjectURL(blob)
      prevUrlRef.current = url
      window.open(url, '_blank')
      onClose()
    } catch (err) {
      setRenderError(err instanceof Error ? err.message : 'Preview generation failed.')
    } finally {
      setIsRendering(false)
    }
  }

  return (
    <div className="tg-dialog-overlay" onClick={onClose} data-testid="preview-dialog-overlay">
      <div
        className="tg-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, width: '90vw', maxHeight: '90vh', overflowY: 'auto' }}
        data-testid="preview-dialog"
      >
        <h3 className="tg-dialog-title">Preview</h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
          Edit the JSON below and (optionally) upload images, then click Render.
        </p>

        <label
          htmlFor="preview-json-editor"
          style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}
        >
          Input JSON
        </label>
        <textarea
          id="preview-json-editor"
          data-testid="preview-json-editor"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            height: 240,
            fontFamily: 'monospace',
            fontSize: 12,
            padding: 8,
            border: '1px solid var(--border, #ccc)',
            borderRadius: 4,
            resize: 'vertical',
          }}
        />
        {!parseResult.ok && (
          <div
            data-testid="preview-json-error"
            style={{ color: '#d33', fontSize: 12, marginTop: 4 }}
          >
            {parseResult.error}
          </div>
        )}

        {dynamicImageFields.length > 0 && (
          <>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                marginTop: 16,
                marginBottom: 4,
                display: 'block',
              }}
            >
              Images
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dynamicImageFields.map((f) => {
                if (f.source.mode !== 'dynamic') return null
                const jsonKey = f.source.jsonKey
                const placeholder = getPlaceholderFilename(f.source)
                const placeholderThumb = placeholder
                  ? (baseImageDataUrls.get(placeholder) ?? null)
                  : null
                const override = imageOverrides.get(jsonKey)
                return (
                  <PreviewImageUploadRow
                    key={f.id}
                    jsonKey={jsonKey}
                    thumbnail={override?.dataUrl ?? placeholderThumb}
                    isOverride={!!override}
                    onUpload={(file) => handleUpload(jsonKey, file)}
                  />
                )
              })}
            </div>
            {uploadError && (
              <div
                data-testid="preview-upload-error"
                style={{ color: '#d33', fontSize: 12, marginTop: 6 }}
              >
                {uploadError}
              </div>
            )}
          </>
        )}

        {renderError && (
          <div
            data-testid="preview-render-error"
            style={{ color: '#d33', fontSize: 12, marginTop: 12 }}
          >
            {renderError}
          </div>
        )}

        <div className="tg-dialog-actions" style={{ marginTop: 16, gap: 8, display: 'flex' }}>
          <button className="tg-btn" onClick={handleReset} data-testid="preview-reset">
            Reset to defaults
          </button>
          <div style={{ flex: 1 }} />
          <button className="tg-btn" onClick={onClose} data-testid="preview-cancel">
            Cancel
          </button>
          <button
            className="tg-btn tg-btn--primary"
            onClick={handleRender}
            disabled={!parseResult.ok || isRendering}
            data-testid="preview-render"
          >
            {isRendering ? 'Rendering…' : 'Render'}
          </button>
        </div>
      </div>
    </div>
  )
}
