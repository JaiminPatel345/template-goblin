import type {
  CellStyle,
  FontWeight,
  TableBorderStyle,
  TableField,
  TextAlign,
} from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { NumberInput } from '../NumberInput.js'
import { NullableColorInput } from '../NullableColorInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'

interface Props {
  field: TableField
  allFontFamilies: string[]
}

/**
 * Header / Row / Cell style sub-panels for the table field properties.
 * Extracted from `LoopFieldProps.tsx` to keep that file under the 300-line
 * cap (Hard Rule #11). Behaviour is unchanged versus the inline version
 * apart from the GH #76 transparent-fill controls.
 */
export function TableStyleSections({ field, allFontFamilies }: Props) {
  const updateFieldStyle = useTemplateStore((s) => s.updateFieldStyle)
  const style = field.style
  const headerStyle = style.headerStyle
  const rowStyle = style.rowStyle

  function updateHeader(updates: Partial<CellStyle>) {
    updateFieldStyle(field.id, { headerStyle: { ...headerStyle, ...updates } })
  }
  function updateRow(updates: Partial<CellStyle>) {
    updateFieldStyle(field.id, { rowStyle: { ...rowStyle, ...updates } })
  }

  const tableBorder: TableBorderStyle = style.tableBorder ?? { color: '#000000', width: 1 }
  function updateTableBorder(updates: Partial<TableBorderStyle>) {
    updateFieldStyle(field.id, { tableBorder: { ...tableBorder, ...updates } })
  }

  return (
    <>
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Header Style</div>

        <div className="tg-form-row">
          <label>Font Family</label>
          <select
            className="tg-select"
            value={headerStyle.fontFamily}
            onChange={(e) => updateHeader({ fontFamily: e.target.value })}
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
            value={headerStyle.fontSize}
            defaultValue={10}
            onChange={(v) => updateHeader({ fontSize: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>Font Weight</label>
          <select
            className="tg-select"
            value={headerStyle.fontWeight}
            onChange={(e) => updateHeader({ fontWeight: e.target.value as FontWeight })}
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Align</label>
          <select
            className="tg-select"
            value={headerStyle.align}
            onChange={(e) => updateHeader({ align: e.target.value as TextAlign })}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Header Text Color</label>
          <ColorPickerPopover
            value={headerStyle.color}
            onChange={(c) => updateHeader({ color: c })}
            ariaLabel="Header text color"
          />
        </div>

        <div className="tg-form-row">
          <label>Header Row Background</label>
          <NullableColorInput
            value={headerStyle.backgroundColor}
            onChange={(v) => updateHeader({ backgroundColor: v })}
            ariaLabel="Header row background color"
          />
        </div>
      </div>

      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Row Style</div>

        <div className="tg-form-row">
          <label>Font Family</label>
          <select
            className="tg-select"
            value={rowStyle.fontFamily}
            onChange={(e) => updateRow({ fontFamily: e.target.value })}
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
            value={rowStyle.fontSize}
            defaultValue={10}
            onChange={(v) => updateRow({ fontSize: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>Font Weight</label>
          <select
            className="tg-select"
            value={rowStyle.fontWeight}
            onChange={(e) => updateRow({ fontWeight: e.target.value as FontWeight })}
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Row Text Color</label>
          <ColorPickerPopover
            value={rowStyle.color}
            onChange={(c) => updateRow({ color: c })}
            ariaLabel="Row text color"
          />
        </div>

        <div className="tg-form-row">
          <label>Row Background</label>
          <NullableColorInput
            value={rowStyle.backgroundColor}
            onChange={(v) => updateRow({ backgroundColor: v })}
            ariaLabel="Row background color"
          />
        </div>

        <div className="tg-form-row">
          <label>Overflow Mode</label>
          <select
            className="tg-select"
            value={style.cellStyle.overflowMode}
            onChange={(e) =>
              updateFieldStyle(field.id, {
                cellStyle: {
                  ...style.cellStyle,
                  overflowMode: e.target.value as 'dynamic_font' | 'truncate',
                },
              })
            }
          >
            <option value="dynamic_font">Dynamic Font</option>
            <option value="truncate">Truncate</option>
          </select>
        </div>
      </div>

      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Table Border</div>

        <div className="tg-form-row">
          <label>Border Width</label>
          <NumberInput
            min={0}
            step={0.5}
            value={tableBorder.width}
            defaultValue={1}
            onChange={(v) => updateTableBorder({ width: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>Border Color</label>
          <NullableColorInput
            value={tableBorder.color}
            onChange={(c) => updateTableBorder({ color: c })}
            ariaLabel="Table border color"
          />
        </div>
      </div>

      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Cell Style</div>

        <div className="tg-form-row">
          <label>Cell Border Width</label>
          <NumberInput
            min={0}
            step={0.5}
            value={rowStyle.borderWidth}
            defaultValue={1}
            onChange={(v) => updateRow({ borderWidth: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>Cell Border Color</label>
          <NullableColorInput
            value={rowStyle.borderColor}
            onChange={(v) => updateRow({ borderColor: v })}
            ariaLabel="Cell border color"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div className="tg-form-row">
            <label>Padding Top</label>
            <NumberInput
              min={0}
              value={rowStyle.paddingTop}
              defaultValue={4}
              onChange={(v) => updateRow({ paddingTop: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Padding Bottom</label>
            <NumberInput
              min={0}
              value={rowStyle.paddingBottom}
              defaultValue={4}
              onChange={(v) => updateRow({ paddingBottom: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Padding Left</label>
            <NumberInput
              min={0}
              value={rowStyle.paddingLeft}
              defaultValue={4}
              onChange={(v) => updateRow({ paddingLeft: v })}
            />
          </div>

          <div className="tg-form-row">
            <label>Padding Right</label>
            <NumberInput
              min={0}
              value={rowStyle.paddingRight}
              defaultValue={4}
              onChange={(v) => updateRow({ paddingRight: v })}
            />
          </div>
        </div>
      </div>
    </>
  )
}
