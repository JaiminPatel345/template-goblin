import { useState } from 'react'
import type { FieldDefinition, Hyperlink } from '@template-goblin/types'
import { isSafeKey, isValidHyperlinkUrl } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'

/**
 * Hyperlink editor (#87) — a self-contained Properties-panel section
 * shared by Text / Image / Table field props. Three modes:
 *
 *   - **None**:    `field.hyperlink === undefined`. No clickable region.
 *   - **Static**:  `{ mode: 'static', url }`. Literal URL pinned in the
 *                  manifest. Validated end-to-end (https / http / mailto
 *                  / tel only).
 *   - **Dynamic**: `{ mode: 'dynamic', jsonKey }`. URL pulled from
 *                  `InputJSON.links[jsonKey]` per render — a separate
 *                  top-level bucket from `texts` so URLs are visually
 *                  distinct in the JSON preview.
 *
 * Validation runs on blur (commits to the store on focus-out). The
 * inline-error UI only flags shape problems — empty strings revert the
 * field to None rather than persisting an invalid value.
 */
interface Props {
  field: FieldDefinition
}

type Mode = 'none' | 'static' | 'dynamic'

function modeOf(link: Hyperlink | undefined): Mode {
  if (!link) return 'none'
  return link.mode
}

export function HyperlinkSection({ field }: Props) {
  const updateField = useTemplateStore((s) => s.updateField)
  const link = field.hyperlink
  const mode = modeOf(link)

  const initialUrl = link?.mode === 'static' ? link.url : ''
  const initialKey = link?.mode === 'dynamic' ? link.jsonKey : ''
  const [urlDraft, setUrlDraft] = useState(initialUrl)
  const [keyDraft, setKeyDraft] = useState(initialKey)
  const [error, setError] = useState<string | null>(null)

  function setMode(next: Mode) {
    setError(null)
    if (next === 'none') {
      updateField(field.id, { hyperlink: undefined })
      setUrlDraft('')
      setKeyDraft('')
      return
    }
    if (next === 'static') {
      updateField(field.id, { hyperlink: { mode: 'static', url: '' } })
      setUrlDraft('')
      return
    }
    updateField(field.id, { hyperlink: { mode: 'dynamic', jsonKey: '' } })
    setKeyDraft('')
  }

  function commitStaticUrl() {
    const trimmed = urlDraft.trim()
    if (trimmed.length === 0) {
      // Empty → drop the link entirely. The pinned mode flips back to
      // 'static' with empty URL on the next focus, which is benign.
      updateField(field.id, { hyperlink: undefined })
      setError(null)
      return
    }
    if (!isValidHyperlinkUrl(trimmed)) {
      setError('Invalid URL — use https, http, mailto, or tel.')
      return
    }
    setError(null)
    updateField(field.id, { hyperlink: { mode: 'static', url: trimmed } })
  }

  function commitDynamicKey() {
    const trimmed = keyDraft.trim()
    if (trimmed.length === 0) {
      updateField(field.id, { hyperlink: undefined })
      setError(null)
      return
    }
    if (!isSafeKey(trimmed)) {
      setError('Key must match /^[A-Za-z_][A-Za-z0-9_]*$/.')
      return
    }
    setError(null)
    updateField(field.id, { hyperlink: { mode: 'dynamic', jsonKey: trimmed } })
  }

  return (
    <div className="tg-panel-section">
      <div className="tg-panel-section-title">Link</div>

      <div className="tg-form-row">
        <label htmlFor={`hyperlink-mode-${field.id}`}>Mode</label>
        <select
          id={`hyperlink-mode-${field.id}`}
          className="tg-select"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
          data-testid="hyperlink-mode"
        >
          <option value="none">None</option>
          <option value="static">Static URL</option>
          <option value="dynamic">Dynamic key</option>
        </select>
      </div>

      {mode === 'static' && (
        <div className="tg-form-row">
          <label htmlFor={`hyperlink-url-${field.id}`}>URL</label>
          <input
            id={`hyperlink-url-${field.id}`}
            className="tg-input"
            type="text"
            placeholder="https://example.com"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onBlur={commitStaticUrl}
            spellCheck={false}
            data-testid="hyperlink-static-url"
          />
        </div>
      )}

      {mode === 'dynamic' && (
        <div className="tg-form-row">
          <label htmlFor={`hyperlink-key-${field.id}`}>JSON key (under links.)</label>
          <input
            id={`hyperlink-key-${field.id}`}
            className="tg-input"
            type="text"
            placeholder="profile_url"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            onBlur={commitDynamicKey}
            spellCheck={false}
            data-testid="hyperlink-dynamic-key"
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          data-testid="hyperlink-error"
          style={{ marginTop: 4, fontSize: 11, color: 'var(--error)' }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
