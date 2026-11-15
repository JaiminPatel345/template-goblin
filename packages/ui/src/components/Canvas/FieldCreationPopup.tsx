import { useEffect, useState, useCallback } from 'react'
import type { TableHeightMode } from '@template-goblin/types'
import { isSafeKey } from '@template-goblin/types'
import { CloseIcon } from '../icons/index.js'
import { StaticImagePicker } from './StaticImagePicker.js'
import { TableHeightModePicker } from './TableHeightModePicker.js'
import { FieldCreationDynamicInputs } from './FieldCreationDynamicInputs.js'
import {
  type FieldCreationDraft,
  type PickedImage,
  type SourceInputs,
  type FieldCreationPopupProps,
  FIELD_LABELS,
  JSON_KEY_PREFIX,
} from './FieldCreationTypes.js'

export type { FieldCreationDraft, PickedImage, SourceInputs, FieldCreationPopupProps }

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
  const [trim, setTrim] = useState(true)
  const [value, setValue] = useState('')
  const [tableHeightMode, setTableHeightMode] = useState<TableHeightMode>(
    draft.type === 'table' ? 'single_page_dynamic' : 'fixed',
  )
  const [pickedImage, setPickedImage] = useState<PickedImage | null>(null)
  const [pickedColor, setPickedColor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const effectiveTableHeightMode: TableHeightMode = mode === 'static' ? 'fixed' : tableHeightMode

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
        trim: draft.type === 'text' ? trim : undefined,
        tableHeightMode: draft.type === 'table' ? effectiveTableHeightMode : undefined,
      })
    } else {
      if (draft.type === 'image' && !pickedImage && !pickedColor) {
        setError('Pick an image or a solid color for this static image field.')
        return
      }
      onConfirm(label.trim(), {
        mode: 'static',
        value,
        image: draft.type === 'image' && pickedImage ? pickedImage : undefined,
        color: draft.type === 'image' && pickedColor ? pickedColor : undefined,
        trim: draft.type === 'text' ? trim : undefined,
        tableHeightMode: draft.type === 'table' ? 'fixed' : undefined,
      })
    }
  }, [
    label,
    draft.type,
    mode,
    tableHeightMode,
    jsonKey,
    required,
    placeholder,
    trim,
    value,
    pickedImage,
    pickedColor,
    onConfirm,
  ])

  async function onPickFile(file: File) {
    const buffer = await file.arrayBuffer()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read image'))
      reader.readAsDataURL(file)
    })
    const ext = file.name.match(/\.[A-Za-z0-9]+$/)?.[0] ?? '.png'
    const filename = `static-${Date.now()}${ext}`
    setPickedImage({ filename, dataUrl, buffer })
    setPickedColor(null)
  }

  function onPickSolidColor(hex: string) {
    setPickedColor(hex)
    setPickedImage(null)
  }

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
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="tg-dialog" style={{ width: 440, maxHeight: '90vh', overflow: 'auto' }}>
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

          {draft.type === 'table' && (
            <TableHeightModePicker
              sourceMode={mode}
              selected={effectiveTableHeightMode}
              onChange={setTableHeightMode}
            />
          )}

          <FieldCreationDynamicInputs
            type={draft.type}
            mode={mode}
            prefix={prefix}
            jsonKey={jsonKey}
            onJsonKeyChange={setJsonKey}
            required={required}
            onRequiredChange={setRequired}
            placeholder={placeholder}
            onPlaceholderChange={setPlaceholder}
            value={value}
            onValueChange={setValue}
            trim={trim}
            onTrimChange={setTrim}
          />

          {mode === 'static' && draft.type === 'image' && (
            <div className="tg-field-row">
              <span className="tg-field-label">Image content</span>
              <StaticImagePicker
                pickedImage={pickedImage}
                pickedColor={pickedColor}
                onPickFile={onPickFile}
                onPickSolidColor={onPickSolidColor}
                onClear={() => {
                  setPickedImage(null)
                  setPickedColor(null)
                }}
              />
            </div>
          )}

          {mode === 'static' && draft.type === 'table' && (
            <div className="tg-field-hint">
              Edit the baked-in rows from the right panel after creation.
            </div>
          )}

          {error && (
            <div
              className="tg-validation-banner"
              role="alert"
              aria-live="polite"
              data-testid="create-popup-error"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 6,
                background: 'color-mix(in srgb, var(--error) 14%, transparent)',
                borderLeft: '3px solid var(--error)',
                color: 'var(--error)',
                fontSize: 13,
                lineHeight: 1.4,
              }}
            >
              <span>{error}</span>
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
