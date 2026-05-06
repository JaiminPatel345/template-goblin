/**
 * tableBodyRows — runtime data-row rendering for the canvas table preview
 * (#79). Extracted from `tableCanvasParts.ts` (Hard Rule #11). Computes
 * row count clipped to `style.maxRows` AND to the rows that physically
 * fit between the header and the rect's bottom (Hard Rule #10), then
 * appends one row-background rect + one Textbox per non-empty cell.
 */
import { Rect, Textbox } from 'fabric'
import type { FabricObject } from 'fabric'
import type { CellStyle, FieldDefinition } from '@template-goblin/types'

const DEFAULT_FONT_FAMILY = 'Helvetica'
const DEFAULT_TEXT_COLOR = '#0a0a0a'

/**
 * Append body-row Fabric children (row backgrounds + cell labels) onto
 * `parts`. No-op for non-table fields, missing styles, or zero rows.
 */
export function pushBodyRows(
  parts: FabricObject[],
  field: FieldDefinition,
  width: number,
  height: number,
  headerH: number,
  widths: number[],
  rows: Record<string, string>[],
): void {
  if (field.type !== 'table' || !field.style) return
  const rowStyle = field.style.rowStyle as CellStyle | undefined
  const columns = field.style.columns ?? []
  const maxRowsCfg = field.style.maxRows
  const maxRows = typeof maxRowsCfg === 'number' && maxRowsCfg > 0 ? maxRowsCfg : rows.length

  const fontSize =
    typeof rowStyle?.fontSize === 'number' && rowStyle.fontSize > 0 ? rowStyle.fontSize : 10
  const padTop = Math.max(0, rowStyle?.paddingTop ?? 2)
  const padBottom = Math.max(0, rowStyle?.paddingBottom ?? 2)
  const rowH = fontSize + padTop + padBottom
  const availableH = Math.max(0, height - headerH)
  const fitCount = rowH > 0 ? Math.floor(availableH / rowH) : 0
  const renderCount = Math.min(rows.length, maxRows, fitCount)
  if (renderCount <= 0) return

  const padL = Math.max(0, rowStyle?.paddingLeft ?? 4)
  const padR = Math.max(0, rowStyle?.paddingRight ?? 4)
  const fontFamily = rowStyle?.fontFamily || DEFAULT_FONT_FAMILY
  const color = rowStyle?.color || DEFAULT_TEXT_COLOR
  const bg = rowStyle?.backgroundColor

  for (let r = 0; r < renderCount; r++) {
    const rowTop = headerH + r * rowH
    const row = rows[r] ?? {}

    if (isVisibleColor(bg)) {
      parts.push(
        new Rect({
          left: 0,
          top: rowTop,
          width,
          height: rowH,
          fill: bg,
          selectable: false,
          evented: false,
          originX: 'left',
          originY: 'top',
        }),
      )
    }

    let leftCum = 0
    for (let c = 0; c < columns.length; c++) {
      const colWidth = widths[c] ?? 0
      const col = columns[c]
      if (!col) {
        leftCum += colWidth
        continue
      }
      const cellValue = row[col.key] ?? ''
      if (cellValue && colWidth > padL + padR + 2) {
        const innerW = Math.max(1, colWidth - padL - padR)
        parts.push(
          new Textbox(String(cellValue), {
            left: leftCum + padL + innerW / 2,
            top: rowTop + rowH / 2,
            width: innerW,
            fontSize,
            fontFamily,
            fontWeight: rowStyle?.fontWeight || 'normal',
            fontStyle: rowStyle?.fontStyle || 'normal',
            underline: rowStyle?.textDecoration === 'underline',
            linethrough: rowStyle?.textDecoration === 'line-through',
            fill: color,
            textAlign: rowStyle?.align || 'center',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            splitByGrapheme: false,
          }),
        )
      }
      leftCum += colWidth
    }
  }
}

function isVisibleColor(c: string | null | undefined): c is string {
  if (!c) return false
  const s = c.trim().toLowerCase()
  return s.length > 0 && s !== 'transparent' && s !== 'none'
}
