/**
 * PreviewDialog — interactive preview backed by the real `template-goblin`
 * `generatePDF` (#86). The dialog pre-fills a JSON editor, lets the user
 * upload replacement images, and on Render runs the SAME `generatePDF` an
 * SDK consumer would call. The resulting PDF Buffer opens in a new tab.
 *
 * Pre-#86 the preview was a parallel HTML pipeline that drifted from core's
 * renderer on every detail (header height, row fitting, font metrics, …).
 * Now there is exactly one renderer; the preview is byte-identical to a
 * library consumer's output.
 *
 * Heavy lifting (parse/upload helpers, ImageUploadRow) lives in sibling
 * files to keep this one under the 300-line cap (Hard Rule #11).
 */
import { useState, useMemo, useEffect } from 'react'
import type { ImageField } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generateExampleJson, isPlaceholderImageSentinel } from '../../utils/jsonGenerator.js'
import { runCorePreview, openPdfInNewTab } from '../../utils/runCorePreview.js'
import {
  parseInputJson,
  readAsDataUrl,
  getPlaceholderFilename,
  validateUpload,
} from './previewDialogHelpers.js'
import { buildImageDataUrlMap } from '../../utils/previewInputs.js'
import { PreviewImageUploadRow } from './PreviewImageUploadRow.js'
import { PreviewDialogHeader } from './PreviewDialogHeader.js'

/** A single user-uploaded image, kept in memory until Render or Reset. */
interface UploadedImage {
  dataUrl: string
}

export function PreviewDialog({ onClose }: { onClose: () => void }) {
  const fields = useTemplateStore((s) => s.fields)
  const headerFields = useTemplateStore((s) => s.header?.fields)
  const footerFields = useTemplateStore((s) => s.footer?.fields)
  const repeatCount = useUiStore((s) => s.maxModeRepeatCount)
  const previewJsonText = useUiStore((s) => s.previewJsonText)
  const setPreviewJsonText = useUiStore((s) => s.setPreviewJsonText)

  // GH #90: there's no longer a Default/Max mode toggle. The default seed
  // is always the Default-mode example; Max Fill (in `JsonPreview`) writes
  // a max snapshot directly into `previewJsonText` if the user wants it.
  // #61: include header/footer band fields so their dynamic jsonKeys seed
  // the editor too — the renderer reads them from the same flat buckets.
  // Thumbnail data-URL map for the image-upload rows. Drawn from the user's
  // already-loaded placeholder bitmaps + static images in the store; the
  // PDF render path still gets bytes from the store via `templateToLoaded`.
  const placeholderBuffers = useTemplateStore((s) => s.placeholderBuffers)
  const staticImageDataUrls = useTemplateStore((s) => s.staticImageDataUrls)
  const baseImageDataUrls = useMemo(
    () => buildImageDataUrlMap(staticImageDataUrls, placeholderBuffers),
    [staticImageDataUrls, placeholderBuffers],
  )

  const defaultJsonText = useMemo(
    () =>
      JSON.stringify(
        generateExampleJson(
          fields,
          'default',
          repeatCount,
          {
            header: headerFields,
            footer: footerFields,
          },
          // #165: emit truncated base64 for each placeholder bitmap so
          // the dialog opens with a JSON shape that reads as 'real' data.
          baseImageDataUrls,
        ),
        null,
        2,
      ),
    [fields, headerFields, footerFields, repeatCount, baseImageDataUrls],
  )

  // Initial editor content prefers the user's pinned text from the right
  // panel (#78) so an edit there flows directly into the dialog without
  // round-tripping through Reset.
  const [jsonText, setJsonText] = useState(previewJsonText ?? defaultJsonText)
  const [imageOverrides, setImageOverrides] = useState<Map<string, UploadedImage>>(new Map())
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)

  const parseResult = useMemo(() => parseInputJson(jsonText), [jsonText])

  // UX-02: required dynamic fields that aren't supplied in the JSON or
  // (for images) via the upload widget block the Render button. Without
  // this gate the user clicked Render and got a runtime SDK error —
  // not an obvious failure mode.
  const missingRequired = useMemo<string[]>(() => {
    if (!parseResult.ok) return []
    const parsed = parseResult.data
    const out: string[] = []
    for (const f of fields) {
      if (!f.source || f.source.mode !== 'dynamic') continue
      if (!f.source.required) continue
      const bucket =
        f.type === 'text'
          ? (parsed.texts as Record<string, unknown> | undefined)
          : f.type === 'image'
            ? (parsed.images as Record<string, unknown> | undefined)
            : (parsed.tables as Record<string, unknown> | undefined)
      const v = bucket?.[f.source.jsonKey]
      const hasJson = v !== undefined && v !== null && v !== ''
      const hasUpload = f.type === 'image' && imageOverrides.has(f.source.jsonKey)
      if (!hasJson && !hasUpload) out.push(f.source.jsonKey)
    }
    return out
  }, [fields, parseResult, imageOverrides])

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

  // No unmount cleanup that revokes the blob URL — `window.open(url)` hands
  // the URL to a new tab, and revoking while that tab is still loading
  // races against the navigation. Browsers reclaim the URL when the tab
  // unloads. The same tradeoff applied to the pre-#86 HTML preview.

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
      // Build the InputJSON the SDK expects. Dynamic images: start from the
      // template's placeholder bitmaps (so a fresh preview "just works"
      // without forcing the user to supply every image), then overlay
      // anything in the user-edited JSON, then overlay any explicit upload.
      const state = useTemplateStore.getState()
      const data = {
        texts: (parsed.texts ?? {}) as Record<string, string>,
        tables: (parsed.tables ?? {}) as Record<string, Record<string, string>[]>,
        images: {} as Record<string, string | ArrayBuffer>,
        // GH #87 — carry the hyperlink URL bucket through to generatePDF
        // so dynamic-link fields (mode: 'dynamic', jsonKey) actually
        // become clickable in the rendered preview. Pre-fix this was
        // silently dropped and the link annotations never made it into
        // the PDF byte stream.
        links: (parsed.links ?? {}) as Record<string, string>,
      }
      // Seed every dynamic image field with its placeholder as a
      // FULL data URL. Core's resolveImageInput accepts data URLs
      // directly (it does NOT consult template.placeholders for
      // dynamic fields — preflightImages reads bytes only from
      // data.images[jsonKey]), so a bare filename here would fail
      // the format sniff with 'not a valid PNG / JPEG'. The data URL
      // round-trips through Buffer.from(b64) cleanly when the
      // underlying bitmap is real (any genuine PNG / JPEG bytes
      // produced by the upload pipeline).
      for (const field of dynamicImageFields) {
        if (field.source.mode !== 'dynamic') continue
        const ph = field.source.placeholder
        if (ph && typeof ph === 'object' && 'filename' in ph) {
          const fullDataUrl = baseImageDataUrls.get(ph.filename as string)
          if (fullDataUrl) data.images[field.source.jsonKey] = fullDataUrl
        }
      }
      // User-edited JSON.images takes precedence over the placeholder
      // defaults; explicit uploads take precedence over both. Values
      // that came from the auto-generated example (truncated base64
      // ending in IMAGE_PLACEHOLDER_SENTINEL — see #165) are skipped
      // so the placeholder filename set above wins when the user
      // clicks Render without editing the JSON.
      const parsedImages = (parsed.images ?? {}) as Record<string, unknown>
      for (const [k, v] of Object.entries(parsedImages)) {
        if (isPlaceholderImageSentinel(v)) continue
        data.images[k] = v as string | ArrayBuffer
      }
      for (const [jsonKey, upload] of imageOverrides) {
        data.images[jsonKey] = upload.dataUrl
      }
      const bytes = await runCorePreview(state, data as never)
      openPdfInNewTab(bytes)
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
          Edit the JSON below and (optionally) upload images, then click Render.{' '}
          <span style={{ color: 'var(--text-muted)' }}>
            Images supplied as <code>data:</code> URLs inside the JSON are honoured — uploaded files
            take precedence over the JSON entries (#140).
          </span>
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
            disabled={!parseResult.ok || isRendering || missingRequired.length > 0}
            data-testid="preview-render"
            title={
              missingRequired.length > 0
                ? `Required field${missingRequired.length === 1 ? '' : 's'} not supplied: ${missingRequired.join(', ')}`
                : undefined
            }
          >
            {isRendering ? 'Rendering…' : 'Render'}
          </button>
        </div>
      </div>
    </div>
  )
}
