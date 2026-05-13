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
      // Per-column style overrides (e.g. align, color, padding) merge over
      // the table's rowStyle — mirrors core/render/loop.ts `mergeStyle` so
      // canvas and PDF agree. Without this, changing a column's align in
      // the sidebar had no visible effect on canvas (#76 follow-up).
      const cs: Partial<CellStyle> = { ...(rowStyle ?? {}), ...(col.style ?? {}) }
      const cellValue = row[col.key] ?? ''
      const padL = Math.max(0, cs.paddingLeft ?? 4)
      const padR = Math.max(0, cs.paddingRight ?? 4)
      if (cellValue && colWidth > padL + padR + 2) {
        const innerW = Math.max(1, colWidth - padL - padR)
        const align = cs.align ?? 'center'
        parts.push(
          new Textbox(String(cellValue), {
            left: leftCum + padL,
            top: rowTop + rowH / 2,
            width: innerW,
            fontSize,
            fontFamily: cs.fontFamily || DEFAULT_FONT_FAMILY,
            fontWeight: cs.fontWeight || 'normal',
            fontStyle: cs.fontStyle || 'normal',
            underline: cs.textDecoration === 'underline',
            linethrough: cs.textDecoration === 'line-through',
            fill: cs.color || DEFAULT_TEXT_COLOR,
            textAlign: align,
            originX: 'left',
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
