/**
 * Table property inputs for condition-based styling (#43).
 *
 * Extracted from `IndividualPropertyControls.tsx` to keep files under the 300-line cap (Rule #11).
 */
import type { TableFieldStyle, TextAlign, VerticalAlign, CellStyle } from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { NullableColorInput } from '../NullableColorInput.js'
import { renderTableCellPropertyInput } from './TableCellPropertyInputs.js'

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
          data-testid={`cond-${propId}`}
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

    case 'headerFontWeight':
    case 'rowFontWeight': {
      const isHeader = propId === 'headerFontWeight'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      const val = targetObj?.fontWeight ?? baseObj?.fontWeight ?? 'normal'
      return (
        <select
          className="tg-select"
          data-testid={`cond-${propId}`}
          value={val}
          onChange={(e) =>
            onChange(
              isHeader
                ? { headerStyle: { ...targetObj, fontWeight: e.target.value as 'normal' | 'bold' } }
                : { rowStyle: { ...targetObj, fontWeight: e.target.value as 'normal' | 'bold' } },
            )
          }
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
      )
    }

    case 'headerFontStyle':
    case 'rowFontStyle': {
      const isHeader = propId === 'headerFontStyle'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      const val = targetObj?.fontStyle ?? baseObj?.fontStyle ?? 'normal'
      return (
        <select
          className="tg-select"
          data-testid={`cond-${propId}`}
          value={val}
          onChange={(e) =>
            onChange(
              isHeader
                ? {
                    headerStyle: { ...targetObj, fontStyle: e.target.value as 'normal' | 'italic' },
                  }
                : { rowStyle: { ...targetObj, fontStyle: e.target.value as 'normal' | 'italic' } },
            )
          }
        >
          <option value="normal">Normal</option>
          <option value="italic">Italic</option>
        </select>
      )
    }

    case 'headerTextDecoration':
    case 'rowTextDecoration': {
      const isHeader = propId === 'headerTextDecoration'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      const val = targetObj?.textDecoration ?? baseObj?.textDecoration ?? 'none'
      return (
        <select
          className="tg-select"
          data-testid={`cond-${propId}`}
          value={val}
          onChange={(e) =>
            onChange(
              isHeader
                ? {
                    headerStyle: {
                      ...targetObj,
                      textDecoration: e.target.value as 'none' | 'underline' | 'line-through',
                    },
                  }
                : {
                    rowStyle: {
                      ...targetObj,
                      textDecoration: e.target.value as 'none' | 'underline' | 'line-through',
                    },
                  },
            )
          }
        >
          <option value="none">None</option>
          <option value="underline">Underline</option>
          <option value="line-through">Strikethrough</option>
        </select>
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
          data-testid={`cond-${propId}`}
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

    case 'headerVerticalAlign':
    case 'rowVerticalAlign': {
      const isHeader = propId === 'headerVerticalAlign'
      const targetObj = (isHeader ? style.headerStyle : style.rowStyle) as
        | Partial<CellStyle>
        | undefined
      const baseObj = isHeader ? baseStyle.headerStyle : baseStyle.rowStyle
      return (
        <select
          className="tg-select"
          data-testid={`cond-${propId}`}
          value={targetObj?.verticalAlign ?? baseObj?.verticalAlign ?? 'middle'}
          onChange={(e) =>
            onChange(
              isHeader
                ? { headerStyle: { ...targetObj, verticalAlign: e.target.value as VerticalAlign } }
                : { rowStyle: { ...targetObj, verticalAlign: e.target.value as VerticalAlign } },
            )
          }
        >
          <option value="top">Top</option>
          <option value="middle">Middle</option>
          <option value="bottom">Bottom</option>
        </select>
      )
    }

    default:
      return renderTableCellPropertyInput(propId, style, baseStyle, onChange)
  }
}
