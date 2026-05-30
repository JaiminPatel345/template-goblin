import type { CellStyle, TableBorderStyle, TableField, TextAlign } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { NumberInput } from '../NumberInput.js'
import { NullableColorInput } from '../NullableColorInput.js'
import { CellTypographyFields, CellBorderPaddingFields } from './TableCellStyleFields.js'

interface Props {
  field: TableField
  allFontFamilies: string[]
}

/**
 * Header / Row / Border / Cell style sub-panels for the table field
 * properties. The shared font/colour/border field groups live in
 * `TableCellStyleFields` (Hard Rule #11 + reuse).
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
        <CellTypographyFields
          style={headerStyle}
          allFontFamilies={allFontFamilies}
          onChange={updateHeader}
          testIdPrefix="table-header"
          textColorLabel="Header Text Color"
          bgLabel="Header Row Background"
        />
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
      </div>

      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Row Style</div>
        <CellTypographyFields
          style={rowStyle}
          allFontFamilies={allFontFamilies}
          onChange={updateRow}
          testIdPrefix="table-row"
          textColorLabel="Row Text Color"
          bgLabel="Row Background"
        />
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
        <CellBorderPaddingFields style={rowStyle} onChange={updateRow} />
      </div>
    </>
  )
}
