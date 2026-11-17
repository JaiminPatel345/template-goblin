import type { FieldType } from '@template-goblin/types'

export interface FieldCreationDynamicInputsProps {
  type: FieldType
  mode: 'static' | 'dynamic'
  prefix: string
  jsonKey: string
  onJsonKeyChange: (val: string) => void
  required: boolean
  onRequiredChange: (val: boolean) => void
  placeholder: string
  onPlaceholderChange: (val: string) => void
  value: string
  onValueChange: (val: string) => void
  trim: boolean
  onTrimChange: (val: boolean) => void
}

/**
 * Source and value input controls for the field creation popup.
 */
export function FieldCreationDynamicInputs({
  type,
  mode,
  prefix,
  jsonKey,
  onJsonKeyChange,
  required,
  onRequiredChange,
  placeholder,
  onPlaceholderChange,
  value,
  onValueChange,
  trim,
  onTrimChange,
}: FieldCreationDynamicInputsProps) {
  return (
    <>
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
                style={{ flex: 1 }}
                value={jsonKey}
                onChange={(e) => onJsonKeyChange(e.target.value)}
                placeholder={type === 'text' ? 'student_name' : type}
                data-testid="create-popup-json-key"
              />
            </div>
          </label>

          <div className="tg-field-row">
            <label className="tg-field-row tg-field-row--inline" style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={required}
                onChange={(e) => onRequiredChange(e.target.checked)}
                data-testid="create-popup-required"
              />
              <span>Required</span>
            </label>
            <span className="tg-field-hint">
              If unchecked, missing values at PDF generation are silently skipped.
            </span>
          </div>

          {!required && type === 'text' && (
            <label className="tg-field-row">
              <span className="tg-field-label">Placeholder (canvas preview)</span>
              <input
                type="text"
                className="tg-input"
                value={placeholder}
                onChange={(e) => onPlaceholderChange(e.target.value)}
                placeholder="e.g. Your name here"
                data-testid="create-popup-placeholder"
              />
            </label>
          )}
        </>
      )}

      {mode === 'static' && type === 'text' && (
        <label className="tg-field-row">
          <span className="tg-field-label">Value</span>
          <textarea
            className="tg-input"
            rows={3}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="Literal text rendered on every PDF"
            data-testid="create-popup-value"
          />
        </label>
      )}

      {type === 'text' && (
        <div className="tg-field-row">
          <label className="tg-field-row tg-field-row--inline" style={{ cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => onTrimChange(e.target.checked)}
              data-testid="create-popup-trim"
            />
            <span>Trim whitespace</span>
          </label>
          <span className="tg-field-hint">
            Strips leading and trailing whitespace from the rendered text value.
          </span>
        </div>
      )}
    </>
  )
}
