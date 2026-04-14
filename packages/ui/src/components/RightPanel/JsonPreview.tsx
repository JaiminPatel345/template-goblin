import { useMemo, useCallback } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { generateExampleJson, highlightJson } from '../../utils/jsonGenerator.js'
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

  const highlighted = useMemo(() => highlightJson(jsonString), [jsonString])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonString).catch(() => {
      // Fallback: ignore clipboard errors
    })
  }, [jsonString])

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
        <div className="tg-json-preview" dangerouslySetInnerHTML={{ __html: highlighted }} />
      )}
    </div>
  )
}
