import { useMemo, useCallback } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generateExampleJson } from '../../utils/jsonGenerator.js'
import type { JsonPreviewMode } from '../../store/uiStore.js'

const MODES: { key: JsonPreviewMode; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'max', label: 'Max' },
]

/**
 * Right-panel JSON preview. The textarea content lives in
 * `uiStore.previewJsonText` so an edit here flows straight into the
 * PreviewDialog (#78). When the store value is `null` the textarea shows
 * the auto-generated example for the current fields and mode; the moment
 * the user types, the store value goes non-null and pins the user's text
 * across mode/field changes. The Reset button clears it back to `null`.
 */
export function JsonPreview() {
  const fields = useTemplateStore((s) => s.fields)
  const jsonPreviewMode = useUiStore((s) => s.jsonPreviewMode)
  const setJsonPreviewMode = useUiStore((s) => s.setJsonPreviewMode)
  const maxModeRepeatCount = useUiStore((s) => s.maxModeRepeatCount)
  const previewJsonText = useUiStore((s) => s.previewJsonText)
  const setPreviewJsonText = useUiStore((s) => s.setPreviewJsonText)

  const generated = useMemo(
    () => generateExampleJson(fields, jsonPreviewMode, maxModeRepeatCount),
    [fields, jsonPreviewMode, maxModeRepeatCount],
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
            onClick={handleCopy}
          >
            Copy
          </button>
        </div>
      </div>

      <div className="tg-json-mode-toggle">
        {MODES.map((m) => (
          <button
            key={m.key}
            className={`tg-json-mode-btn ${jsonPreviewMode === m.key ? 'tg-json-mode-btn--active' : ''}`}
            onClick={() => setJsonPreviewMode(m.key)}
          >
            {m.label}
          </button>
        ))}
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
