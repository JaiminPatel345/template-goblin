import type { CellStyle } from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { NullableColorInput } from '../NullableColorInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { StyleToggleGroup } from '../StyleToggleGroup.js'

/**
 * Reusable cell-style field groups shared by the table Header and Row style
 * panels (extracted from `TableStyleSections` to cut duplication and stay
 * under the line cap — Hard Rule #11).
 */
interface TypographyProps {
  style: CellStyle
  allFontFamilies: string[]
  onChange: (patch: Partial<CellStyle>) => void
  testIdPrefix: string
  textColorLabel: string
  bgLabel: string
}

/** Font family / size / B-I-U-S / text colour / background — shared by header + row. */
export function CellTypographyFields({
  style,
  allFontFamilies,
  onChange,
  testIdPrefix,
  textColorLabel,
  bgLabel,
}: TypographyProps) {
  return (
    <>
      <div className="tg-form-row">
        <label>Font Family</label>
        <select
          className="tg-select"
          value={style.fontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
        >
          {allFontFamilies.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="tg-form-row">
        <label>Font Size</label>
        <NumberInput
          min={1}
          value={style.fontSize}
          defaultValue={10}
          onChange={(v) => onChange({ fontSize: v })}
        />
      </div>

      <div className="tg-form-row">
        <label>Style</label>
        <StyleToggleGroup
          value={{
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            textDecoration: style.textDecoration,
          }}
          onChange={(patch) => onChange(patch)}
          testIdPrefix={testIdPrefix}
        />
      </div>

      <div className="tg-form-row">
        <label>{textColorLabel}</label>
        <ColorPickerPopover
          value={style.color}
          onChange={(c) => onChange({ color: c })}
          ariaLabel={textColorLabel}
        />
      </div>

      <div className="tg-form-row">
        <label>{bgLabel}</label>
        <NullableColorInput
          value={style.backgroundColor}
          onChange={(v) => onChange({ backgroundColor: v })}
          ariaLabel={bgLabel}
        />
      </div>
    </>
  )
}

const PADDING_FIELDS = [
  ['Padding Top', 'paddingTop'],
  ['Padding Bottom', 'paddingBottom'],
  ['Padding Left', 'paddingLeft'],
  ['Padding Right', 'paddingRight'],
] as const

/** Cell border + padding controls (the "Cell Style" section). */
export function CellBorderPaddingFields({
  style,
  onChange,
}: {
  style: CellStyle
  onChange: (patch: Partial<CellStyle>) => void
}) {
  return (
    <>
      <div className="tg-form-row">
        <label>Cell Border Width</label>
        <NumberInput
          min={0}
          step={0.5}
          value={style.borderWidth}
          defaultValue={1}
          onChange={(v) => onChange({ borderWidth: v })}
        />
      </div>

      <div className="tg-form-row">
        <label>Cell Border Color</label>
        <NullableColorInput
          value={style.borderColor}
          onChange={(v) => onChange({ borderColor: v })}
          ariaLabel="Cell border color"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PADDING_FIELDS.map(([label, key]) => (
          <div className="tg-form-row" key={key}>
            <label>{label}</label>
            <NumberInput
              min={0}
              value={style[key]}
              defaultValue={4}
              onChange={(v) => onChange({ [key]: v } as Partial<CellStyle>)}
            />
          </div>
        ))}
      </div>
    </>
  )
}
