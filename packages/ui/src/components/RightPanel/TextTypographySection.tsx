/**
 * TextTypographySection — Font family / size / weight / style / decoration /
 * colour plus dynamic-only Overflow Mode + Min Font controls. Extracted from
 * `TextFieldProps.tsx` per Hard Rule #11 (split as you touch).
 */
import type { TextField, TextFieldStyle } from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { NullableColorInput } from '../NullableColorInput.js'
import { StyleToggleGroup } from '../StyleToggleGroup.js'
import { InfoTip } from './InfoTip.js'

interface Props {
  field: TextField
  style: TextFieldStyle
  isDynamic: boolean
  allFontFamilies: string[]
  onFontSizeChange: (fontSize: number) => void
  updateFieldStyle: (id: string, patch: Partial<TextFieldStyle>) => void
}

export function TextTypographySection({
  field,
  style,
  isDynamic,
  allFontFamilies,
  onFontSizeChange,
  updateFieldStyle,
}: Props) {
  return (
    <div className="tg-panel-section">
      <div className="tg-panel-section-title">Typography</div>

      <div className="tg-form-row">
        <label>Font Family</label>
        <select
          className="tg-select"
          value={style.fontFamily}
          onChange={(e) => updateFieldStyle(field.id, { fontFamily: e.target.value })}
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
          value={style.fontSize}
          min={1}
          defaultValue={12}
          onChange={(v) => onFontSizeChange(v)}
        />
      </div>

      {/* GH #91 — Overflow Mode is the single knob for what happens when
          content exceeds the rect. Static text has no rendered drift
          (fixed string at fixed fontSize) so the dropdown is dynamic-only.
          Truncate cuts characters from the end at a character boundary
          (no ellipsis); Dynamic Font shrinks `fontSize` down to
          `fontSizeMin`, then truncates the rest. */}
      {isDynamic && (
        <div className="tg-form-row">
          <label>
            Overflow Mode
            <InfoTip text="Truncate: cut characters from the end so the visible text fits the rect (no ellipsis). Dynamic Font: shrink the font size down to Minimum Font Size, then truncate." />
          </label>
          <select
            className="tg-select"
            value={style.overflowMode}
            onChange={(e) =>
              updateFieldStyle(field.id, {
                overflowMode: e.target.value as 'dynamic_font' | 'truncate',
              })
            }
          >
            <option value="truncate">Truncate</option>
            <option value="dynamic_font">Dynamic Font</option>
          </select>
        </div>
      )}

      {/* Minimum Font Size only matters when Overflow Mode = Dynamic Font. */}
      {isDynamic && style.overflowMode === 'dynamic_font' && (
        <div className="tg-form-row">
          <label>
            Minimum Font Size
            <InfoTip text="The smallest font size the renderer will shrink to before falling back to truncation." />
          </label>
          <NumberInput
            value={style.fontSizeMin}
            min={1}
            defaultValue={11}
            onChange={(v) => updateFieldStyle(field.id, { fontSizeMin: v })}
          />
        </div>
      )}

      {/* #167 — B / I / U / S inline toggles replace the old Font Weight /
          Font Style / Text Decoration dropdowns. Underline and strikethrough
          share `textDecoration`, so they are mutually exclusive. */}
      <div className="tg-form-row">
        <label>Style</label>
        <StyleToggleGroup
          value={{
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            textDecoration: style.textDecoration,
          }}
          onChange={(patch) => updateFieldStyle(field.id, patch)}
          testIdPrefix="panel"
        />
      </div>

      <div className="tg-form-row">
        <label>Text Color</label>
        <ColorPickerPopover
          value={style.color}
          onChange={(c) => updateFieldStyle(field.id, { color: c })}
          ariaLabel="Text color"
        />
      </div>

      <div className="tg-form-row">
        <label>
          Background
          <InfoTip text="Fill colour painted behind the text. Leave transparent for no fill." />
        </label>
        <NullableColorInput
          value={style.backgroundColor ?? null}
          onChange={(v) => updateFieldStyle(field.id, { backgroundColor: v })}
          ariaLabel="Text background color"
        />
      </div>
    </div>
  )
}
