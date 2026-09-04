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
import { projectFieldsToJson } from '../../utils/jsonProjection.js'
import { surfaceError } from '../../utils/friendlyError.js'
import { runCorePreview, openPdfInNewTab } from '../../utils/runCorePreview.js'
import {
  parseInputJson,
  readAsDataUrl,
  validateUpload,
  findMissingRequiredFields,
  buildPreviewInputData,
  extractConditionalFields,
  buildConditionMap,
  updateConditionArray,
} from './previewDialogHelpers.js'
import { buildImageDataUrlMap } from '../../utils/previewInputs.js'
import { PreviewImageUploadSection, type UploadedImage } from './PreviewImageUploadSection.js'
import { PreviewConditionSelector } from './PreviewConditionSelector.js'
import { PreviewDialogHeader } from './PreviewDialogHeader.js'

export function PreviewDialog({ onClose }: { onClose: () => void }) {
  const fields = useTemplateStore((s) => s.fields)
  const headerFields = useTemplateStore((s) => s.header?.fields)
  const footerFields = useTemplateStore((s) => s.footer?.fields)

  // The editor seeds from the live field projection on every open, so it
  // can never show stale keys. Edits stay LOCAL to this render session —
  // test data for one render is not template state. (#61: band fields'
  // dynamic jsonKeys seed the editor too — the renderer reads them from
  // the same flat buckets.)
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
        projectFieldsToJson(
          fields,
          { header: headerFields, footer: footerFields },
          // #165: emit truncated base64 for each placeholder bitmap so
          // the dialog opens with a JSON shape that reads as 'real' data.
          baseImageDataUrls,
        ),
        null,
        2,
      ),
    [fields, headerFields, footerFields, baseImageDataUrls],
  )

  const [jsonText, setJsonText] = useState(defaultJsonText)
  const [imageOverrides, setImageOverrides] = useState<Map<string, UploadedImage>>(new Map())
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)

  const parseResult = useMemo(() => parseInputJson(jsonText), [jsonText])

  // Band fields render from the same flat data buckets as body fields
  // (#61) — the required-gate and the upload rows must cover them too,
  // or a required header logo silently slips past the gate and fails at
  // render time.
  const allFields = useMemo(
    () => [...fields, ...(headerFields ?? []), ...(footerFields ?? [])],
    [fields, headerFields, footerFields],
  )

  // UX-02: required dynamic fields that aren't supplied in the JSON or
  // (for images) via the upload widget block the Render button. Without
  // this gate the user clicked Render and got a runtime SDK error —
  // not an obvious failure mode.
  const missingRequired = useMemo(
    () =>
      !parseResult.ok ? [] : findMissingRequiredFields(allFields, parseResult.data, imageOverrides),
    [allFields, parseResult, imageOverrides],
  )

  const dynamicImageFields = useMemo(
    () =>
      allFields.filter(
        (f): f is ImageField => f.type === 'image' && !!f.source && f.source.mode === 'dynamic',
      ),
    [allFields],
  )

  const conditionalFields = useMemo(() => extractConditionalFields(allFields), [allFields])

  const currentConditionMap = useMemo(
    () => (!parseResult.ok ? {} : buildConditionMap(parseResult.data.condition, conditionalFields)),
    [parseResult, conditionalFields],
  )

  function handleChangeFieldCondition(keyName: string, newCond: string) {
    if (!parseResult.ok) return
    const data = { ...parseResult.data }
    const updated = updateConditionArray(currentConditionMap, keyName, newCond)
    if (updated) {
      data.condition = updated
    } else {
      delete data.condition
    }
    setJsonText(JSON.stringify(data, null, 2))
  }

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
      const state = useTemplateStore.getState()
      const data = buildPreviewInputData(
        parseResult.data,
        dynamicImageFields,
        baseImageDataUrls,
        imageOverrides,
      )
      const bytes = await runCorePreview(state, data as never)
      openPdfInNewTab(bytes)
      onClose()
    } catch (err) {
      setRenderError(surfaceError('preview render', err))
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

        <PreviewConditionSelector
          conditionalFields={conditionalFields}
          currentConditionMap={currentConditionMap}
          onChangeFieldCondition={handleChangeFieldCondition}
        />

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

        <PreviewImageUploadSection
          dynamicImageFields={dynamicImageFields}
          baseImageDataUrls={baseImageDataUrls}
          imageOverrides={imageOverrides}
          uploadError={uploadError}
          onUpload={handleUpload}
        />

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
