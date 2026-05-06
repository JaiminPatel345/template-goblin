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
import { PreviewDialogHeader } from './PreviewDialogHeader.js'

/** A single user-uploaded image, kept in memory until Render or Reset. */
interface UploadedImage {
  dataUrl: string
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
  const previewJsonText = useUiStore((s) => s.previewJsonText)
  const setPreviewJsonText = useUiStore((s) => s.setPreviewJsonText)

  const defaultJsonText = useMemo(
    () => JSON.stringify(generateExampleJson(fields, jsonMode, repeatCount), null, 2),
    [fields, jsonMode, repeatCount],
  )

  // Initial editor content prefers the user's pinned text from the right
  // panel (#78) so an edit there flows directly into the dialog without
  // round-tripping through Reset.
  const [jsonText, setJsonText] = useState(previewJsonText ?? defaultJsonText)
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

  // Deliberately NO unmount cleanup that revokes `prevUrlRef.current`.
  // After `window.open(url)`, calling `URL.revokeObjectURL(url)` while the
  // newly-opened tab is still loading the blob raced with Chrome (the
  // dialog unmounts as part of `onClose()` on the same tick the navigation
  // begins). We rely on the browser's automatic blob cleanup at editor-tab
  // unload instead — bounded leak, far smaller than the renderer output
  // itself. The previous-URL is still revoked at line 154 below before
  // a new render replaces it, so the in-session leak is at most one URL.

  function handleReset() {
    setJsonText(defaultJsonText)
    setImageOverrides(new Map())
    setUploadError(null)
    setRenderError(null)
    // Clear the right-panel pin too — Reset means "go back to fresh
    // defaults across both surfaces", not just the dialog.
    setPreviewJsonText(null)
  }

  /**
   * Mirror dialog edits into the right-panel store so the two surfaces stay
   * in sync (#78). `setPreviewJsonText` accepts `null` for "unpinned" but the
   * dialog never writes `null` from typing — only the explicit Reset does.
   */
  function handleJsonChange(text: string) {
    setJsonText(text)
    setPreviewJsonText(text)
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
    setImageOverrides((prev) => {
      const next = new Map(prev)
      next.set(jsonKey, { dataUrl })
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
      // The renderer resolves an image field's bitmap with
      //   filename = source.placeholder?.filename ?? jsonKey
      // (see `previewGenerator.ts` — image branch in `renderPageHtml`).
      // Mirror that same key derivation here so the override lands on the
      // exact key the renderer asks for, regardless of whether the field
      // has a placeholder or not.
      const merged = new Map(baseImageDataUrls)
      for (const [jsonKey, upload] of imageOverrides) {
        const field = dynamicImageFields.find(
          (f) => f.source.mode === 'dynamic' && f.source.jsonKey === jsonKey,
        )
        const placeholder = field ? getPlaceholderFilename(field.source) : null
        const lookupKey = placeholder ?? jsonKey
        merged.set(lookupKey, upload.dataUrl)
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
        <PreviewDialogHeader onClose={onClose} />
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
          onChange={(e) => handleJsonChange(e.target.value)}
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
