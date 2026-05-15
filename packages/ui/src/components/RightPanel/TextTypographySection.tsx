/**
 * TextTypographySection — Font family / size / weight / style / decoration /
 * colour plus dynamic-only Overflow Mode + Min Font controls. Extracted from
 * `TextFieldProps.tsx` per Hard Rule #11 (split as you touch).
 */
import type { TextField, TextFieldStyle } from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
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

      <div className="tg-form-row">
        <label>Font Weight</label>
        <select
          className="tg-select"
          value={style.fontWeight}
          onChange={(e) =>
            updateFieldStyle(field.id, { fontWeight: e.target.value as 'normal' | 'bold' })
          }
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      </div>

      <div className="tg-form-row">
        <label>Font Style</label>
        <select
          className="tg-select"
          value={style.fontStyle}
          onChange={(e) =>
            updateFieldStyle(field.id, { fontStyle: e.target.value as 'normal' | 'italic' })
          }
        >
          <option value="normal">Normal</option>
          <option value="italic">Italic</option>
        </select>
      </div>

      <div className="tg-form-row">
        <label>Text Decoration</label>
        <select
          className="tg-select"
          // The displayed value collapses fontWeight=bold into the dropdown
          // so the user has a single "format" picker. When the user changes
          // the value, we write to fontWeight or textDecoration accordingly
          // so each store field still stays single-purposed.
          value={style.fontWeight === 'bold' ? 'bold' : style.textDecoration}
          onChange={(e) => {
            const v = e.target.value
            if (v === 'bold') {
              updateFieldStyle(field.id, {
                fontWeight: 'bold',
                textDecoration: 'none',
              })
            } else {
              updateFieldStyle(field.id, {
                fontWeight: 'normal',
                textDecoration: v as 'none' | 'underline' | 'line-through',
              })
            }
          }}
        >
          <option value="none">None</option>
          <option value="underline">Underline</option>
          <option value="line-through">Line Through</option>
          <option value="bold">Bold</option>
        </select>
      </div>

      <div className="tg-form-row">
        <label>Text Color</label>
        <ColorPickerPopover
          value={style.color}
          onChange={(c) => updateFieldStyle(field.id, { color: c })}
          ariaLabel="Text color"
        />
      </div>
    </div>
  )
}
