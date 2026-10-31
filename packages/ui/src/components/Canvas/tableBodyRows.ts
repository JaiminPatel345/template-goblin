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
  const oddRowStyle = field.style.oddRowStyle as Partial<CellStyle> | null | undefined
  const evenRowStyle = field.style.evenRowStyle as Partial<CellStyle> | null | undefined
  const overflowMode = field.style.cellStyle?.overflowMode ?? 'truncate'
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

  for (let r = 0; r < renderCount; r++) {
    const rowTop = headerH + r * rowH
    const row = rows[r] ?? {}

    // Zebra striping: 1-based odd rows (1st, 3rd, …) take `oddRowStyle`,
    // even rows `evenRowStyle`, merged over `rowStyle` — mirrors
    // core/render/loop.ts so the canvas and PDF agree.
    const zebra = r % 2 === 0 ? oddRowStyle : evenRowStyle
    const rowBase: Partial<CellStyle> = { ...(rowStyle ?? {}), ...(zebra ?? {}) }
    const bg = rowBase.backgroundColor

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
      // the (zebra) row style — mirrors core/render/loop.ts `mergeStyle` so
      // canvas and PDF agree. Without this, changing a column's align in
      // the sidebar had no visible effect on canvas (#76 follow-up).
      const cs: Partial<CellStyle> = { ...rowBase, ...(col.style ?? {}) }
      const cellValue = row[col.key] ?? ''
      const padL = Math.max(0, cs.paddingLeft ?? 4)
      const padR = Math.max(0, cs.paddingRight ?? 4)

      // Per-cell stroked rect — mirrors core/render/loop.ts so cell
      // border width/colour changes in the right panel reflect on canvas
      // (#76 follow-up). Skip when width <= 0 or colour is null.
      const cellBw = typeof cs.borderWidth === 'number' ? cs.borderWidth : 0
      if (cellBw > 0 && isVisibleColor(cs.borderColor)) {
        parts.push(
          new Rect({
            left: leftCum,
            top: rowTop,
            width: colWidth,
            height: rowH,
            fill: '',
            stroke: cs.borderColor,
            strokeWidth: cellBw,
            strokeUniform: true,
            selectable: false,
            evented: false,
            originX: 'left',
            originY: 'top',
          }),
        )
      }

      if (cellValue && colWidth > padL + padR + 2) {
        const innerW = Math.max(1, colWidth - padL - padR)
        const align = cs.align ?? 'center'
        const fontFamily = cs.fontFamily || DEFAULT_FONT_FAMILY
        const fontWeight = cs.fontWeight || 'normal'
        const fontStyle = cs.fontStyle || 'normal'
        // PDF cells are STRICTLY single-line: `dynamic_font` shrinks the
        // font (floor = base − 6) then char-truncates; `truncate` keeps
        // the font and char-truncates (core/render/loop.ts, maxTextRows=1).
        // The canvas used a multi-line Textbox that WRAPPED instead — so a
        // long cell previewed on two lines but printed truncated. Mirror
        // the single-line fit here.
        const fit = fitCellText(
          String(cellValue),
          innerW,
          fontSize,
          overflowMode,
          fontFamily,
          fontWeight,
          fontStyle,
        )
        // Vertical alignment parity with core's `resolveCellTextY`.
        const vAlign = cs.verticalAlign ?? 'middle'
        const padTopCell = Math.max(0, cs.paddingTop ?? 2)
        const padBotCell = Math.max(0, cs.paddingBottom ?? 2)
        const { top, originY } =
          vAlign === 'top'
            ? { top: rowTop + padTopCell, originY: 'top' as const }
            : vAlign === 'bottom'
              ? { top: rowTop + rowH - padBotCell, originY: 'bottom' as const }
              : { top: rowTop + rowH / 2, originY: 'center' as const }
        parts.push(
          new Textbox(fit.text, {
            left: leftCum + padL,
            top,
            width: innerW,
            fontSize: fit.fontSize,
            fontFamily,
            fontWeight,
            fontStyle,
            underline: cs.textDecoration === 'underline',
            linethrough: cs.textDecoration === 'line-through',
            fill: cs.color || DEFAULT_TEXT_COLOR,
            textAlign: align,
            originX: 'left',
            originY,
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

/** Shared 2D context for single-line cell measurement (lazy). */
let _cellCtx: CanvasRenderingContext2D | null = null
function cellMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (_cellCtx) return _cellCtx
  _cellCtx = document.createElement('canvas').getContext('2d')
  return _cellCtx
}

/**
 * Fit a cell value onto ONE line within `innerW`, mirroring
 * core/render/loop.ts: `dynamic_font` shrinks the font down to
 * `base − 6` (floor 1) before char-truncating; `truncate` keeps the
 * font and char-truncates. Returns the text + font size to render.
 */
function fitCellText(
  value: string,
  innerW: number,
  baseSize: number,
  mode: 'truncate' | 'dynamic_font',
  fontFamily: string,
  fontWeight: string,
  fontStyle: string,
): { text: string; fontSize: number } {
  const ctx = cellMeasureCtx()
  if (!ctx || innerW <= 0) return { text: value, fontSize: baseSize }
  const font = (size: number) => `${fontStyle} ${fontWeight} ${size}px ${fontFamily}`
  let size = baseSize
  ctx.font = font(size)
  if (mode === 'dynamic_font') {
    const minSize = Math.max(1, baseSize - 6)
    while (ctx.measureText(value).width > innerW && size > minSize) {
      size -= 1
      ctx.font = font(size)
    }
  }
  if (ctx.measureText(value).width <= innerW) return { text: value, fontSize: size }
  // Still too wide → char-truncate at the chosen size.
  let truncated = value
  while (truncated.length > 0 && ctx.measureText(truncated).width > innerW) {
    truncated = truncated.slice(0, -1)
  }
  return { text: truncated, fontSize: size }
}

function isVisibleColor(c: string | null | undefined): c is string {
  if (!c) return false
  const s = c.trim().toLowerCase()
  return s.length > 0 && s !== 'transparent' && s !== 'none'
}
