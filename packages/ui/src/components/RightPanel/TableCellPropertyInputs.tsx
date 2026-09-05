/**
 * Cell padding, border, and table setting inputs for condition styling (#43).
 *
 * Extracted from `TablePropertyInputs.tsx` to maintain the 300-line cap (Rule #11).
 */
import type {
  TableFieldStyle,
  CellStyle,
  TableBorderStyle,
  OverflowMode,
} from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { NullableColorInput } from '../NullableColorInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'

/**
 * Renders cell-level and table-setting override controls.
 */
export function renderTableCellPropertyInput(
  propId: string,
  style: Record<string, unknown>,
  baseStyle: TableFieldStyle,
  onChange: (patch: Record<string, unknown>) => void,
) {
  const rowObj = (style.rowStyle as Partial<CellStyle>) ?? {}
  const cellStyleObj = (style.cellStyle as { overflowMode?: OverflowMode }) ?? {}

  switch (propId) {
    case 'maxRows':
      return (
        <NumberInput
          min={1}
          value={(style.maxRows as number) ?? baseStyle.maxRows ?? 10}
          defaultValue={10}
          onChange={(v) => onChange({ maxRows: v })}
          data-testid="cond-table-max-rows"
        />
      )

    case 'maxColumns':
      return (
        <NumberInput
          min={1}
          value={(style.maxColumns as number) ?? baseStyle.maxColumns ?? 5}
          defaultValue={5}
          onChange={(v) => onChange({ maxColumns: v })}
          data-testid="cond-table-max-columns"
        />
      )

    case 'multiPage':
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
            className="tg-checkbox"
            checked={(style.multiPage as boolean) ?? baseStyle.multiPage ?? true}
            onChange={(e) => onChange({ multiPage: e.target.checked })}
            data-testid="cond-table-multipage"
          />
          Multi-Page
        </label>
      )

    case 'showHeader':
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
            className="tg-checkbox"
            checked={(style.showHeader as boolean) ?? baseStyle.showHeader ?? true}
            onChange={(e) => onChange({ showHeader: e.target.checked })}
            data-testid="cond-table-show-header"
          />
          Show Header
        </label>
      )

    case 'fitToContent':
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
            className="tg-checkbox"
            checked={(style.fitToContent as boolean) ?? baseStyle.fitToContent !== false}
            onChange={(e) => onChange({ fitToContent: e.target.checked })}
            data-testid="cond-table-fit-to-content"
          />
          Fit to Content
        </label>
      )

    case 'tableOverflowMode':
      return (
        <select
          className="tg-select"
          data-testid="cond-table-overflow-mode"
          value={cellStyleObj.overflowMode ?? baseStyle.cellStyle?.overflowMode ?? 'dynamic_font'}
          onChange={(e) =>
            onChange({
              cellStyle: { ...cellStyleObj, overflowMode: e.target.value as OverflowMode },
            })
          }
        >
          <option value="dynamic_font">Dynamic Font</option>
          <option value="truncate">Truncate</option>
        </select>
      )

    case 'cellBorderWidth':
      return (
        <NumberInput
          min={0}
          step={0.5}
          value={rowObj.borderWidth ?? baseStyle.rowStyle?.borderWidth ?? 1}
          defaultValue={1}
          onChange={(v) => onChange({ rowStyle: { ...rowObj, borderWidth: v } })}
          data-testid="cond-cell-border-width"
        />
      )

    case 'cellBorderColor':
      return (
        <NullableColorInput
          value={rowObj.borderColor ?? baseStyle.rowStyle?.borderColor ?? '#000000'}
          onChange={(c) => onChange({ rowStyle: { ...rowObj, borderColor: c } })}
          ariaLabel="Cell Border Color"
        />
      )

    case 'paddingTop':
    case 'paddingBottom':
    case 'paddingLeft':
    case 'paddingRight': {
      const paddingKey = propId as keyof Pick<
        CellStyle,
        'paddingTop' | 'paddingBottom' | 'paddingLeft' | 'paddingRight'
      >
      return (
        <NumberInput
          min={0}
          value={rowObj[paddingKey] ?? baseStyle.rowStyle?.[paddingKey] ?? 4}
          defaultValue={4}
          onChange={(v) => onChange({ rowStyle: { ...rowObj, [paddingKey]: v } })}
          data-testid={`cond-${propId}`}
        />
      )
    }

    case 'tableBorderWidth': {
      const border = (style.tableBorder as Partial<TableBorderStyle>) ?? {}
      const baseBorder = baseStyle.tableBorder ?? { width: 1, color: '#000000' }
      return (
        <NumberInput
          min={0}
          step={0.5}
          value={border.width ?? baseBorder.width}
          defaultValue={1}
          onChange={(v) => onChange({ tableBorder: { ...border, width: v } })}
          data-testid="cond-table-border-width"
        />
      )
    }

    case 'tableBorderColor': {
      const border = (style.tableBorder as Partial<TableBorderStyle>) ?? {}
      const baseBorder = baseStyle.tableBorder ?? { width: 1, color: '#000000' }
      return (
        <ColorPickerPopover
          value={border.color ?? baseBorder.color ?? '#000000'}
          onChange={(c) => onChange({ tableBorder: { ...border, color: c } })}
          ariaLabel="Table Border Color"
        />
      )
    }

    default:
      return null
  }
}
