import type { TextFieldStyle, ImageFieldStyle, TableFieldStyle } from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { StyleToggleGroup } from '../StyleToggleGroup.js'
import { AlignButtonGroup } from './AlignButtonGroup.js'

export function TextStyleControls({
  style,
  baseStyle,
  allFontFamilies,
  onChange,
}: {
  style: Partial<TextFieldStyle>
  baseStyle: TextFieldStyle
  allFontFamilies: string[]
  onChange: (patch: Partial<TextFieldStyle>) => void
}) {
  const currentFontFamily = style.fontFamily ?? baseStyle.fontFamily
  const currentFontSize = style.fontSize ?? baseStyle.fontSize
  const currentColor = style.color ?? baseStyle.color
  const currentAlign = style.align ?? baseStyle.align
  const currentWeight = style.fontWeight ?? baseStyle.fontWeight
  const currentFontStyle = style.fontStyle ?? baseStyle.fontStyle
  const currentDecoration = style.textDecoration ?? baseStyle.textDecoration

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="tg-form-row">
        <label>Font Family</label>
        <select
          className="tg-select"
          data-testid="cond-font-family"
          value={currentFontFamily}
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
          value={currentFontSize}
          min={1}
          defaultValue={12}
          onChange={(v) => onChange({ fontSize: v })}
          data-testid="cond-font-size"
        />
      </div>

      <div className="tg-form-row">
        <label>Text Color</label>
        <ColorPickerPopover
          value={currentColor}
          onChange={(c) => onChange({ color: c })}
          ariaLabel="Text color"
        />
      </div>

      <div className="tg-form-row">
        <label>Alignment</label>
        <AlignButtonGroup
          options={['left', 'center', 'right']}
          value={currentAlign}
          onChange={(align) => onChange({ align })}
        />
      </div>

      <div className="tg-form-row">
        <label>Formatting</label>
        <StyleToggleGroup
          size="sm"
          value={{
            fontWeight: currentWeight,
            fontStyle: currentFontStyle,
            textDecoration: currentDecoration,
          }}
          onChange={(patch) => onChange(patch)}
        />
      </div>
    </div>
  )
}

export function ImageStyleControls({
  style,
  baseStyle,
  onChange,
}: {
  style: Partial<ImageFieldStyle>
  baseStyle: ImageFieldStyle
  onChange: (patch: Partial<ImageFieldStyle>) => void
}) {
  const currentFit = style.fit ?? baseStyle.fit

  return (
    <div className="tg-form-row">
      <label>Image Fit</label>
      <select
        className="tg-select"
        data-testid="cond-image-fit"
        value={currentFit}
        onChange={(e) => onChange({ fit: e.target.value as 'fill' | 'contain' | 'cover' })}
      >
        <option value="contain">Contain</option>
        <option value="cover">Cover</option>
        <option value="fill">Fill</option>
      </select>
    </div>
  )
}

export function TableStyleControls({
  style,
  onChange,
}: {
  style: Partial<TableFieldStyle>
  onChange: (patch: Partial<TableFieldStyle>) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="tg-form-row">
        <label>Multi Page</label>
        <input
          type="checkbox"
          data-testid="cond-table-multipage"
          checked={style.multiPage ?? false}
          onChange={(e) => onChange({ multiPage: e.target.checked })}
        />
      </div>
    </div>
  )
}
