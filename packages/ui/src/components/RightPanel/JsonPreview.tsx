import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generateExampleJson } from '../../utils/jsonGenerator.js'
import { formatJsonString } from './formatJson.js'

/**
 * Right-panel JSON preview (#90).
 *
 * One textarea, one source of truth. The displayed JSON is either:
 *   - `uiStore.previewJsonText` (user-pinned edit), or
 *   - the auto-generated default-mode JSON for the current fields.
 *
 * Pre-#90 there was a Default / Max toggle. That created a UX trap: a
 * user staring at Max-mode JSON would add a field on canvas, the field
 * would land in the (hidden) Default JSON, and the user would think
 * the field "didn't appear in JSON" until they switched modes. The
 * toggle is gone; **Max Fill** replaces it as a one-shot button that
 * generates the max-mode JSON and pins it via `setPreviewJsonText` —
 * exactly as if the user typed it. Adding a new field after Max-Fill
 * leaves the pin alone (so the user's bulk-test data isn't lost), and
 * **Reset** still clears the pin → reverts to auto-Default.
 */
export function JsonPreview() {
  const fields = useTemplateStore((s) => s.fields)
  const headerFields = useTemplateStore((s) => s.header?.fields)
  const footerFields = useTemplateStore((s) => s.footer?.fields)
  const maxModeRepeatCount = useUiStore((s) => s.maxModeRepeatCount)
  const previewJsonText = useUiStore((s) => s.previewJsonText)
  const setPreviewJsonText = useUiStore((s) => s.setPreviewJsonText)

  const generated = useMemo(
    () =>
      generateExampleJson(fields, 'default', maxModeRepeatCount, {
        header: headerFields,
        footer: footerFields,
      }),
    [fields, headerFields, footerFields, maxModeRepeatCount],
  )
  const generatedText = useMemo(() => JSON.stringify(generated, null, 2), [generated])

  // The textarea always shows the user's pinned text when it exists — that
  // pin is the contract that links this surface to PreviewDialog. Without
  // a pin we fall back to the freshly-regenerated baseline.
  const value = previewJsonText ?? generatedText
  const isPinned = previewJsonText !== null

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).catch(() => {
      // Fallback: ignore clipboard errors
    })
  }, [value])

  const handleMaxFill = useCallback(() => {
    const max = generateExampleJson(fields, 'max', maxModeRepeatCount, {
      header: headerFields,
      footer: footerFields,
    })
    setPreviewJsonText(JSON.stringify(max, null, 2))
  }, [fields, headerFields, footerFields, maxModeRepeatCount, setPreviewJsonText])

  // GH #85 — Format button. Inline error message lives below the textarea
  // and self-clears after 3s. We intentionally don't disable the button on
  // unparseable input (per issue: "always enabled, fail gracefully").
  const [formatError, setFormatError] = useState<string | null>(null)
  const formatErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (formatErrorTimerRef.current) clearTimeout(formatErrorTimerRef.current)
    }
  }, [])

  const handleFormat = useCallback(() => {
    // When the textarea is showing the auto-generated baseline (not
    // pinned), the text is already 2-space formatted via the
    // `JSON.stringify(_, null, 2)` in `generatedText`. Re-pinning a
    // formatted copy here would lock the preview to that snapshot and
    // stop tracking field-add / field-edit events on the canvas — the
    // user would have to hit Reset to see new columns appear. So
    // Format is a no-op in the unpinned state; the user only needs it
    // after they've edited the textarea (which already pinned it).
    if (!isPinned) return
    const result = formatJsonString(value)
    if (result.ok) {
      setPreviewJsonText(result.text)
      setFormatError(null)
      if (formatErrorTimerRef.current) clearTimeout(formatErrorTimerRef.current)
      return
    }
    setFormatError(result.error)
    if (formatErrorTimerRef.current) clearTimeout(formatErrorTimerRef.current)
    formatErrorTimerRef.current = setTimeout(() => setFormatError(null), 3000)
  }, [isPinned, value, setPreviewJsonText])

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Cmd/Ctrl+Shift+F triggers Format from inside the textarea (#85).
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault()
        handleFormat()
      }
    },
    [handleFormat],
  )

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
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {isPinned && (
            <button
              className="tg-btn"
              style={{ fontSize: 10, padding: '2px 8px' }}
              onClick={() => setPreviewJsonText(null)}
              title="Discard your edits and show the auto-generated example"
              data-testid="json-preview-reset"
            >
              Reset
            </button>
          )}
          <button
            className="tg-btn"
            style={{ fontSize: 10, padding: '2px 8px' }}
            onClick={handleFormat}
            title="Pretty-print the JSON with 2-space indentation (Cmd/Ctrl+Shift+F)"
            data-testid="json-preview-format"
          >
            Format
          </button>
          <button
            className="tg-btn"
            style={{ fontSize: 10, padding: '2px 8px' }}
            onClick={handleMaxFill}
            title="Pin a max-fill snapshot — every text repeated, every table at maxRows"
          >
            Max Fill
          </button>
          <button
            className="tg-btn"
            style={{ fontSize: 10, padding: '2px 8px' }}
            onClick={handleCopy}
          >
            Copy
          </button>
        </div>
      </div>

      {fields.length === 0 ? (
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
            onChange={(e) => setPreviewJsonText(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            style={{
              minHeight: 120,
              width: '100%',
              resize: 'vertical',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            spellCheck={false}
          />
          {formatError && (
            <div
              role="alert"
              data-testid="json-preview-format-error"
              style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--error)',
              }}
            >
              {formatError}
            </div>
          )}
        </>
      )}
    </div>
  )
}
