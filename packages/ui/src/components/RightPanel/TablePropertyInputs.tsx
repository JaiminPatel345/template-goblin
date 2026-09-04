/**
 * Table property inputs for condition-based styling (#43).
 *
 * Extracted from `IndividualPropertyControls.tsx` to keep files under the 300-line cap (Rule #11).
 */
import type {
  TableFieldStyle,
  TextAlign,
  CellStyle,
  TableBorderStyle,
} from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { NullableColorInput } from '../NullableColorInput.js'

/**
 * Renders an input control for an individual table property override.
 */
export function renderTablePropertyInput(
  propId: string,
  style: Record<string, unknown>,
  baseStyle: TableFieldStyle,
  allFontFamilies: string[],
  onChange: (patch: Record<string, unknown>) => void,
) {
  switch (propId) {
    case 'headerFontFamily':
    case 'rowFontFamily': {
      const isHeader = propId === 'headerFontFamily'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      return (
        <select
          className="tg-select"
          value={targetObj?.fontFamily ?? baseObj?.fontFamily}
          onChange={(e) =>
            onChange(
              isHeader
                ? { headerStyle: { ...targetObj, fontFamily: e.target.value } }
                : { rowStyle: { ...targetObj, fontFamily: e.target.value } },
            )
          }
        >
          {allFontFamilies.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      )
    }

    case 'headerFontSize':
    case 'rowFontSize': {
      const isHeader = propId === 'headerFontSize'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      return (
        <NumberInput
          value={targetObj?.fontSize ?? baseObj?.fontSize}
          min={1}
          defaultValue={10}
          onChange={(v) =>
            onChange(
              isHeader
                ? { headerStyle: { ...targetObj, fontSize: v } }
                : { rowStyle: { ...targetObj, fontSize: v } },
            )
          }
        />
      )
    }

    case 'headerTextColor':
    case 'rowTextColor': {
      const isHeader = propId === 'headerTextColor'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      return (
        <ColorPickerPopover
          value={targetObj?.color ?? baseObj?.color ?? '#000000'}
          onChange={(c) =>
            onChange(
              isHeader
                ? { headerStyle: { ...targetObj, color: c } }
                : { rowStyle: { ...targetObj, color: c } },
            )
          }
          ariaLabel={isHeader ? 'Header Text Color' : 'Row Text Color'}
        />
      )
    }

    case 'headerBgColor':
    case 'rowBgColor': {
      const isHeader = propId === 'headerBgColor'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      return (
        <NullableColorInput
          value={targetObj?.backgroundColor ?? baseObj?.backgroundColor ?? null}
          onChange={(c) =>
            onChange(
              isHeader
                ? { headerStyle: { ...targetObj, backgroundColor: c } }
                : { rowStyle: { ...targetObj, backgroundColor: c } },
            )
          }
          ariaLabel={isHeader ? 'Header Background Color' : 'Row Background Color'}
        />
      )
    }

    case 'headerAlign':
    case 'rowAlign': {
      const isHeader = propId === 'headerAlign'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      return (
        <select
          className="tg-select"
          value={targetObj?.align ?? baseObj?.align ?? 'left'}
          onChange={(e) =>
            onChange(
              isHeader
                ? { headerStyle: { ...targetObj, align: e.target.value as TextAlign } }
                : { rowStyle: { ...targetObj, align: e.target.value as TextAlign } },
            )
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
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
