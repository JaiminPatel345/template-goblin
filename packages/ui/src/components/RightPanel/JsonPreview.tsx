import { useMemo, useCallback, useState } from 'react'
import type { FieldDefinition } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { projectFieldsToJson, projectionToText, collectFields } from '../../utils/jsonProjection.js'
import { diffJsonEdit, type JsonEditResult } from '../../utils/jsonApply.js'
import { buildImageDataUrlMap } from '../../utils/previewInputs.js'

/**
 * Right-panel JSON preview — a live PROJECTION of the fields, never a
 * separate copy.
 *
 * The textarea always shows `projectFieldsToJson(fields)`; editing a VALUE
 * writes through to the owning field's `source.placeholder` via the same
 * `updateField` action the sidebar uses. Canvas, sidebar, and this panel
 * therefore all render the one store state and cannot drift.
 *
 * While the textarea is focused, the user's literal text is kept as a
 * local draft (so typing isn't reformatted under the cursor); parseable
 * edits apply to the store on every keystroke, and blur snaps the
 * textarea back to the canonical projection. Keys that match no field,
 * read-only values (images / links), and wrong-shaped values surface as
 * an inline notice and are ignored.
 *
 * Pre-refactor this panel had a "pin" (`uiStore.previewJsonText`): the
 * first edit froze the JSON until a Reset click, so new fields silently
 * stopped appearing. The pin, Max Fill, Format, and Reset are gone —
 * there is nothing to reset anymore.
 */
export function JsonPreview() {
  const fields = useTemplateStore((s) => s.fields)
  const headerFields = useTemplateStore((s) => s.header?.fields)
  const footerFields = useTemplateStore((s) => s.footer?.fields)
  const placeholderBuffers = useTemplateStore((s) => s.placeholderBuffers)
  const staticImageDataUrls = useTemplateStore((s) => s.staticImageDataUrls)
  const updateField = useTemplateStore((s) => s.updateField)

  // #165: resolve every image-field placeholder filename to a data URL so
  // the projection can show truncated base64 instead of just the filename.
  const imageDataUrls = useMemo(
    () => buildImageDataUrlMap(staticImageDataUrls, placeholderBuffers),
    [staticImageDataUrls, placeholderBuffers],
  )

  const bands = useMemo(
    () => ({ header: headerFields, footer: footerFields }),
    [headerFields, footerFields],
  )
  const projectedText = useMemo(
    () => projectionToText(projectFieldsToJson(fields, bands, imageDataUrls)),
    [fields, bands, imageDataUrls],
  )

  // The user's literal keystrokes while the textarea is focused. `null`
  // means "not editing — show the canonical projection".
  const [draft, setDraft] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const value = draft ?? projectedText

  const handleChange = useCallback(
    (text: string) => {
      setDraft(text)
      const result = diffJsonEdit(text, fields, bands, imageDataUrls)
      if (!result.ok) {
        setNotice(`Invalid JSON — fix it to apply (your edit reverts if you click away)`)
        return
      }
      const all = collectFields(fields, bands)
      for (const patch of result.patches) {
        const field = all.find((f) => f.id === patch.fieldId)
        if (field?.source?.mode !== 'dynamic') continue
        updateField(field.id, {
          source: { ...field.source, placeholder: patch.placeholder },
        } as Partial<FieldDefinition>)
      }
      setNotice(buildNotice(result))
    },
    [fields, bands, imageDataUrls, updateField],
  )

  const handleBlur = useCallback(() => {
    setDraft(null)
    setNotice(null)
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).catch(() => {
      // Fallback: ignore clipboard errors
    })
  }, [value])

  const hasFields =
    fields.length > 0 || (headerFields?.length ?? 0) > 0 || (footerFields?.length ?? 0) > 0

  return (
    <div className="tg-panel-section">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div className="tg-panel-section-title" style={{ marginBottom: 0 }}>
          JSON Preview
          {/* UX-07: the values below are field placeholders, not runtime
              data. Editing a value here updates that field's placeholder —
              the same state the canvas and the properties panel show. */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 'normal',
              color: 'var(--text-muted)',
              marginLeft: 8,
              textTransform: 'none',
              letterSpacing: 0,
            }}
            data-testid="json-preview-placeholder-note"
          >
            (placeholder values — edits update the fields)
          </span>
        </div>
        <button
          className="tg-btn"
          style={{ fontSize: 10, padding: '2px 8px' }}
          onClick={handleCopy}
        >
          Copy
        </button>
      </div>

      {!hasFields ? (
        <div
          className="tg-json-preview"
          style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}
        >
          No fields defined yet
        </div>
      ) : (
        <>
          <textarea
            className="tg-json-preview"
            data-testid="json-preview-textarea"
            value={value}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            style={{
              minHeight: 120,
              width: '100%',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            spellCheck={false}
          />
          {notice && (
            <div
              role="alert"
              data-testid="json-preview-notice"
              style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              {notice}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** Compose the inline notice for ignored / read-only / invalid keys. */
function buildNotice(result: JsonEditResult): string | null {
  const parts: string[] = []
  if (result.unknownKeys.length > 0) {
    parts.push(
      `No field matches ${result.unknownKeys.join(', ')} — add a field with that JSON key first.`,
    )
  }
  if (result.readOnlyKeys.length > 0) {
    parts.push(
      `${result.readOnlyKeys.join(', ')} ${result.readOnlyKeys.length === 1 ? 'is' : 'are'} read-only here — change images via the field's placeholder upload.`,
    )
  }
  if (result.invalidKeys.length > 0) {
    parts.push(`Wrong value shape for ${result.invalidKeys.join(', ')} — edit ignored.`)
  }
  return parts.length > 0 ? parts.join(' ') : null
}
