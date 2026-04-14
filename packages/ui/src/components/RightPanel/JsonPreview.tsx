import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generateExampleJson } from '../../utils/jsonGenerator.js'
import type { JsonPreviewMode } from '../../store/uiStore.js'

const MODES: { key: JsonPreviewMode; label: string }[] = [
  { key: 'default', label: 'Default' },
  { key: 'max', label: 'Max' },
  { key: 'min', label: 'Min' },
]

export function JsonPreview() {
  const fields = useTemplateStore((s) => s.fields)
  const jsonPreviewMode = useUiStore((s) => s.jsonPreviewMode)
  const setJsonPreviewMode = useUiStore((s) => s.setJsonPreviewMode)
  const maxModeRepeatCount = useUiStore((s) => s.maxModeRepeatCount)

  const generated = useMemo(
    () => generateExampleJson(fields, jsonPreviewMode, maxModeRepeatCount),
    [fields, jsonPreviewMode, maxModeRepeatCount],
  )

  const jsonString = useMemo(() => JSON.stringify(generated, null, 2), [generated])

  const [editedJson, setEditedJson] = useState(jsonString)

  // Re-sync when the generated JSON changes (mode switch, field changes)
  useEffect(() => {
    setEditedJson(jsonString)
  }, [jsonString])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editedJson).catch(() => {
      // Fallback: ignore clipboard errors
    })
  }, [editedJson])

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
        <button
          className="tg-btn"
          style={{ fontSize: 10, padding: '2px 8px' }}
          onClick={handleCopy}
        >
          Copy
        </button>
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
          value={editedJson}
          onChange={(e) => setEditedJson(e.target.value)}
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
