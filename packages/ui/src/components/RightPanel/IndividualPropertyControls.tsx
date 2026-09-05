/**
 * Individual property override controls for condition-based styling (#43).
 *
 * Renders dedicated component controls only for properties selected by the author.
 */
import type { FieldDefinition, TableFieldStyle } from '@template-goblin/types'
import { renderTablePropertyInput } from './TablePropertyInputs.js'
import { renderTextPropertyInput } from './TextPropertyInputs.js'

interface Props {
  field: FieldDefinition
  propId: string
  label: string
  style: Record<string, unknown>
  allFontFamilies: string[]
  onChange: (patch: Record<string, unknown>) => void
  onRemove: () => void
}

/**
 * Wraps an individual style property control with a label and remove button.
 */
export function IndividualPropertyControl({
  field,
  propId,
  label,
  style,
  allFontFamilies,
  onChange,
  onRemove,
}: Props) {
  return (
    <div
      data-testid={`override-control-${propId}`}
      style={{
        padding: '6px 8px',
        borderRadius: 6,
        border: '1px solid var(--border)',
        background: 'var(--bg-surface)',
        marginBottom: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{label}</span>
        <button
          type="button"
          className="tg-btn tg-btn--icon tg-btn--sm tg-remove-btn"
          data-testid={`remove-override-${propId}`}
          onClick={onRemove}
          title="Remove this property override"
          style={{
            padding: 0,
            width: 18,
            height: 18,
            minWidth: 18,
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {renderPropertyInput(field, propId, style, allFontFamilies, onChange)}
    </div>
  )
}

function renderPropertyInput(
  field: FieldDefinition,
  propId: string,
  style: Record<string, unknown>,
  allFontFamilies: string[],
  onChange: (patch: Record<string, unknown>) => void,
) {
  if (field.type === 'table') {
    const tableResult = renderTablePropertyInput(
      propId,
      style,
      field.style as TableFieldStyle,
      allFontFamilies,
      onChange,
    )
    if (tableResult !== null) return tableResult
  }

  return renderTextPropertyInput(field, propId, style, allFontFamilies, onChange)
}
