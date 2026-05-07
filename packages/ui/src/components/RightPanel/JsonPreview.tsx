import { useMemo, useCallback } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generateExampleJson } from '../../utils/jsonGenerator.js'

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
  const maxModeRepeatCount = useUiStore((s) => s.maxModeRepeatCount)
  const previewJsonText = useUiStore((s) => s.previewJsonText)
  const setPreviewJsonText = useUiStore((s) => s.setPreviewJsonText)

  const generated = useMemo(
    () => generateExampleJson(fields, 'default', maxModeRepeatCount),
    [fields, maxModeRepeatCount],
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
    const max = generateExampleJson(fields, 'max', maxModeRepeatCount)
    setPreviewJsonText(JSON.stringify(max, null, 2))
  }, [fields, maxModeRepeatCount, setPreviewJsonText])

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
            >
              Reset
            </button>
          )}
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
        <textarea
          className="tg-json-preview"
          value={value}
          onChange={(e) => setPreviewJsonText(e.target.value)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            background: 'var(--bg-primary)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: 10,
            minHeight: 120,
            maxHeight: 300,
            overflowY: 'auto',
            whiteSpace: 'pre',
            lineHeight: 1.4,
            color: 'var(--text-primary)',
            width: '100%',
            resize: 'vertical',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          spellCheck={false}
        />
      )}
    </div>
  )
}
