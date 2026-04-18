import { useEffect, useState, useCallback } from 'react'
import type { FieldType } from '@template-goblin/types'
import { isSafeKey } from '@template-goblin/types'
import { CloseIcon } from '../icons/index.js'

/**
 * Element Creation Popup (design 2026-04-18 §8.1, spec 024).
 *
 * Opens when the designer finishes drawing a rectangle with the text/image/
 * table tool. Captures the mode decision (static vs dynamic) and the
 * mode-specific fields up-front so the field commits to the store with a
 * meaningful `source` rather than a placeholder one that has to be filled in
 * later via the right panel.
 *
 * Keyboard:
 *   - Esc        → Cancel
 *   - Ctrl/Cmd+Enter → Create
 *
 * The popup is deliberately focused on the creation-time essentials. Ongoing
 * style tweaks (fonts, colours, advanced table settings) still happen in the
 * right panel via double-click, per design §8.2.
 */
export interface FieldCreationDraft {
  type: FieldType
  /** Geometry of the drawn rectangle (already in canvas pt). */
  x: number
  y: number
  width: number
  height: number
  /** Starting zIndex (caller derives from current fields.length). */
  zIndex: number
  /** The page the new field belongs to. */
  pageId: string | null
  /** Optional starting group assignment. */
  groupId: string | null
}

export type SourceInputs =
  | { mode: 'static'; value: string }
  | { mode: 'dynamic'; jsonKey: string; required: boolean; placeholder: string }

export interface FieldCreationPopupProps {
  draft: FieldCreationDraft
  /** `label` defaults to the field type name. */
  initialLabel?: string
  onCancel: () => void
  /** Caller merges the returned inputs with the draft + defaults. */
  onConfirm: (label: string, source: SourceInputs) => void
}

const FIELD_LABELS: Record<FieldType, string> = {
  text: 'Text',
  image: 'Image',
  table: 'Table',
}

const JSON_KEY_PREFIX: Record<FieldType, string> = {
  text: 'texts.',
  image: 'images.',
  table: 'tables.',
}

export function FieldCreationPopup({
  draft,
  initialLabel,
  onCancel,
  onConfirm,
}: FieldCreationPopupProps) {
  const [label, setLabel] = useState(initialLabel ?? FIELD_LABELS[draft.type])
  const [mode, setMode] = useState<'static' | 'dynamic'>('dynamic')
  const [jsonKey, setJsonKey] = useState('')
  const [required, setRequired] = useState(true)
  const [placeholder, setPlaceholder] = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const commit = useCallback(() => {
    if (!label.trim()) {
      setError('Label is required.')
      return
    }
    if (mode === 'dynamic') {
      if (!jsonKey.trim()) {
        setError('JSON key is required for dynamic fields.')
        return
      }
      if (!isSafeKey(jsonKey.trim())) {
        setError(
          'Invalid JSON key — use letters, digits, and underscores only (and not a reserved name).',
        )
        return
      }
      onConfirm(label.trim(), {
        mode: 'dynamic',
        jsonKey: jsonKey.trim(),
        required,
        placeholder: required ? '' : placeholder,
      })
    } else {
      onConfirm(label.trim(), { mode: 'static', value })
    }
  }, [label, mode, jsonKey, required, placeholder, value, onConfirm])

  // Keyboard shortcuts: Esc = cancel, Ctrl/Cmd+Enter = create
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        commit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [commit, onCancel])

  const prefix = JSON_KEY_PREFIX[draft.type]
  const typeLabel = FIELD_LABELS[draft.type]

  return (
    <div
      className="tg-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Create ${typeLabel} field`}
      onClick={(e) => {
        // Overlay-click to cancel — a standard modal convention. Content
        // clicks stop propagation to avoid accidental dismissal.
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="tg-dialog" style={{ width: 420, maxHeight: '90vh', overflow: 'auto' }}>
        <div className="tg-dialog-header">
          <h3 style={{ margin: 0, fontSize: 16 }}>Create {typeLabel} field</h3>
          <button
            className="tg-btn tg-btn--icon"
            aria-label="Close"
            title="Close (Esc)"
            onClick={onCancel}
          >
            <CloseIcon />
          </button>
        </div>

        <div
          className="tg-dialog-body"
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <label className="tg-field-row">
            <span className="tg-field-label">Label</span>
            <input
              type="text"
              className="tg-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
              data-testid="create-popup-label"
            />
          </label>

          <div className="tg-field-row">
            <span className="tg-field-label">Source</span>
            <div role="tablist" aria-label="Field source mode" style={{ display: 'flex', gap: 4 }}>
              <button
                role="tab"
                aria-selected={mode === 'dynamic'}
                className={`tg-btn ${mode === 'dynamic' ? 'tg-btn--primary' : ''}`}
                onClick={() => setMode('dynamic')}
                data-testid="create-popup-mode-dynamic"
              >
                Dynamic
              </button>
              <button
                role="tab"
                aria-selected={mode === 'static'}
                className={`tg-btn ${mode === 'static' ? 'tg-btn--primary' : ''}`}
                onClick={() => setMode('static')}
                data-testid="create-popup-mode-static"
              >
                Static
              </button>
            </div>
            <p className="tg-field-hint" style={{ marginTop: 4 }}>
              {mode === 'dynamic'
                ? 'Dynamic fields are supplied via InputJSON at PDF generation time.'
                : 'Static fields are baked into the template and appear on every PDF.'}
            </p>
          </div>

          {mode === 'dynamic' && (
            <>
              <label className="tg-field-row">
                <span className="tg-field-label">JSON key</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="tg-field-hint" style={{ fontFamily: 'monospace' }}>
                    {prefix}
                  </span>
                  <input
                    type="text"
                    className="tg-input"
                    value={jsonKey}
                    onChange={(e) => setJsonKey(e.target.value)}
                    placeholder={draft.type === 'text' ? 'student_name' : draft.type}
                    data-testid="create-popup-json-key"
                  />
                </div>
              </label>

              <label className="tg-field-row tg-field-row--inline">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  data-testid="create-popup-required"
                />
                <span>Required</span>
                <span className="tg-field-hint" style={{ marginLeft: 6 }}>
                  If unchecked, missing values at PDF generation are silently skipped.
                </span>
              </label>

              {!required && draft.type === 'text' && (
                <label className="tg-field-row">
                  <span className="tg-field-label">Placeholder (canvas preview)</span>
                  <input
                    type="text"
                    className="tg-input"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                    placeholder="e.g. Your name here"
                    data-testid="create-popup-placeholder"
                  />
                </label>
              )}
            </>
          )}

          {mode === 'static' && draft.type === 'text' && (
            <label className="tg-field-row">
              <span className="tg-field-label">Value</span>
              <textarea
                className="tg-input"
                rows={3}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Literal text rendered on every PDF"
                data-testid="create-popup-value"
              />
            </label>
          )}

          {mode === 'static' && draft.type !== 'text' && (
            <div className="tg-field-hint">
              {draft.type === 'image'
                ? 'Upload the image for this static field from the right panel after creation.'
                : 'Edit the baked-in rows from the right panel after creation.'}
            </div>
          )}

          {error && (
            <div className="tg-error" role="alert" data-testid="create-popup-error">
              {error}
            </div>
          )}
        </div>

        <div
          className="tg-dialog-actions"
          style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}
        >
          <button className="tg-btn" onClick={onCancel} data-testid="create-popup-cancel">
            Cancel
          </button>
          <button
            className="tg-btn tg-btn--primary"
            onClick={commit}
            data-testid="create-popup-confirm"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}
