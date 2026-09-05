/**
 * Individual property override controls for condition-based styling (#43).
 *
 * Renders dedicated component controls only for properties selected by the author.
 */
import type {
  FieldDefinition,
  TextAlign,
  VerticalAlign,
  TableFieldStyle,
} from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { NullableColorInput } from '../NullableColorInput.js'
import { StyleToggleGroup } from '../StyleToggleGroup.js'
import { AlignButtonGroup } from './AlignButtonGroup.js'
import { renderTablePropertyInput } from './TablePropertyInputs.js'

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
  const baseStyle = (field.style as unknown as Record<string, unknown>) ?? {}

  switch (propId) {
    case 'fontFamily':
      return (
        <select
          className="tg-select"
          data-testid="cond-font-family"
          value={(style.fontFamily as string) ?? (baseStyle.fontFamily as string)}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          {allFontFamilies.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )

    case 'fontSize':
      return (
        <NumberInput
          value={(style.fontSize as number) ?? (baseStyle.fontSize as number)}
          min={1}
          defaultValue={12}
          onChange={(v) => onChange({ fontSize: v })}
          data-testid="cond-font-size"
        />
      )

    case 'color':
      return (
        <ColorPickerPopover
          value={(style.color as string) ?? (baseStyle.color as string)}
          onChange={(c) => onChange({ color: c })}
          ariaLabel="Text color"
        />
      )

    case 'backgroundColor':
      return (
        <NullableColorInput
          value={(style.backgroundColor as string) ?? (baseStyle.backgroundColor as string) ?? null}
          onChange={(c) => onChange({ backgroundColor: c })}
          ariaLabel="Background color"
        />
      )

    case 'fontWeight':
    case 'fontStyle':
    case 'textDecoration':
      return (
        <StyleToggleGroup
          size="sm"
          value={{
            fontWeight:
              ((style.fontWeight as string) ?? (baseStyle.fontWeight as string)) === 'bold'
                ? 'bold'
                : 'normal',
            fontStyle:
              ((style.fontStyle as string) ?? (baseStyle.fontStyle as string)) === 'italic'
                ? 'italic'
                : 'normal',
            textDecoration:
              ((style.textDecoration as string) ?? (baseStyle.textDecoration as string)) ===
              'underline'
                ? 'underline'
                : 'none',
          }}
          onChange={(patch) => onChange(patch)}
        />
      )

    case 'overflowMode':
      return (
        <select
          className="tg-select"
          data-testid="cond-overflow-mode"
          value={(style.overflowMode as string) ?? (baseStyle.overflowMode as string)}
          onChange={(e) => onChange({ overflowMode: e.target.value })}
        >
          <option value="truncate">Truncate</option>
          <option value="dynamic_font">Dynamic Font</option>
        </select>
      )

    case 'fontSizeMin':
      return (
        <NumberInput
          value={(style.fontSizeMin as number) ?? (baseStyle.fontSizeMin as number)}
          min={1}
          defaultValue={10}
          onChange={(v) => onChange({ fontSizeMin: v })}
          data-testid="cond-font-size-min"
        />
      )

    case 'align':
      return (
        <AlignButtonGroup
          options={['left', 'center', 'right'] as TextAlign[]}
          value={((style.align as TextAlign) ?? (baseStyle.align as TextAlign)) || 'left'}
          onChange={(align) => onChange({ align })}
        />
      )

    case 'verticalAlign':
      return (
        <AlignButtonGroup
          options={['top', 'middle', 'bottom'] as VerticalAlign[]}
          value={
            ((style.verticalAlign as VerticalAlign) ??
              (baseStyle.verticalAlign as VerticalAlign)) ||
            'top'
          }
          onChange={(verticalAlign) => onChange({ verticalAlign })}
        />
      )

    case 'maxRows':
      return (
        <NumberInput
          value={(style.maxRows as number) ?? (baseStyle.maxRows as number)}
          min={1}
          defaultValue={1}
          onChange={(v) => onChange({ maxRows: v })}
          data-testid="cond-max-rows"
        />
      )

    case 'lineHeight':
      return (
        <NumberInput
          value={(style.lineHeight as number) ?? (baseStyle.lineHeight as number)}
          min={0.5}
          step={0.1}
          defaultValue={1.2}
          onChange={(v) => onChange({ lineHeight: v })}
          data-testid="cond-line-height"
        />
      )

    case 'trim':
      return (
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--text-primary)',
          }}
        >
          <input
            type="checkbox"
            checked={(style.trim as boolean) ?? baseStyle.trim !== false}
            onChange={(e) => onChange({ trim: e.target.checked })}
          />
          Trim whitespace
        </label>
      )

    case 'fit':
      return (
        <select
          className="tg-select"
          data-testid="cond-image-fit"
          value={(style.fit as string) ?? (baseStyle.fit as string)}
          onChange={(e) => onChange({ fit: e.target.value })}
        >
          <option value="fill">Fill</option>
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
        </select>
      )

    default:
      if (field.type === 'table') {
        return renderTablePropertyInput(
          propId,
          style,
          field.style as TableFieldStyle,
          allFontFamilies,
          onChange,
        )
      }
      return null
  }
}
