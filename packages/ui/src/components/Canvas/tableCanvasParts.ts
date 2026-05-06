/**
 * Table-specific Fabric children for the canvas (#38).
 *
 * The base `buildGroupChildren` in `fabricUtils.ts` handles the bgRect and
 * (for non-table fields) a centred body label. Tables need column dividers,
 * a header band, and per-column header labels so that adding / editing /
 * removing columns — or tweaking the header style — produces visible
 * feedback on the canvas. Without these, the rect rebuild on every field
 * update is a no-op and the canvas falsely says "nothing changed".
 *
 * Header typography, fill colour, divider colour, alignment, and
 * horizontal padding are read from `style.headerStyle` so that user edits
 * in the right panel reflect on canvas (#38, second pass).
 *
 * Pure layout maths live in `computeColumnBoundaries` / `computeHeaderHeight`
 * so they can be unit-tested without instantiating Fabric.
 */
import { Rect, Line, Textbox } from 'fabric'
import type { FabricObject } from 'fabric'
import type { CellStyle, FieldDefinition, TableColumn } from '@template-goblin/types'
import { pushBodyRows } from './tableBodyRows.js'

const HEADER_FRACTION = 0.22
const HEADER_MIN_PT = 14
const HEADER_MAX_FONT_PT = 16
const DEFAULT_DIVIDER_STROKE = '#0a0a0a'
const DEFAULT_DIVIDER_WIDTH = 0.5
const DEFAULT_HEADER_COLOR = '#0a0a0a'
const DEFAULT_HEADER_FONT_FAMILY = 'Helvetica'

/**
 * Compute the **scaled** width of each column in points so the cumulative
 * width fits inside `totalWidth`. Falls back to an even split when no
 * column declares a positive width — that way dragging the table to a new
 * size, or seeding malformed columns, still draws visible dividers
 * instead of collapsing the table to a single rect.
 */
export function scaledColumnWidths(columns: TableColumn[], totalWidth: number): number[] {
  if (columns.length === 0 || totalWidth <= 0) return []
  const positive = columns.map((c) => (c.width > 0 ? c.width : 0))
  const totalDeclared = positive.reduce((s, w) => s + w, 0)
  if (totalDeclared <= 0) {
    return columns.map(() => totalWidth / columns.length)
  }
  const scale = totalWidth / totalDeclared
  return positive.map((w) => w * scale)
}

/**
 * X-coordinates of column dividers — the boundaries BETWEEN columns,
 * NOT including 0 or `totalWidth`. For N columns this returns N-1 values.
 * Returns `[]` for fewer than 2 columns or non-positive `totalWidth`.
 */
export function computeColumnBoundaries(columns: TableColumn[], totalWidth: number): number[] {
  if (columns.length < 2 || totalWidth <= 0) return []
  const ws = scaledColumnWidths(columns, totalWidth)
  const xs: number[] = []
  let cum = 0
  for (let i = 0; i < ws.length - 1; i++) {
    cum += ws[i] ?? 0
    xs.push(cum)
  }
  return xs
}

/**
 * Header band height in points. `0` when the header is hidden or the
 * field is too small. Caps at `totalHeight` (degenerate templates) so the
 * divider never sits below the rect.
 */
export function computeHeaderHeight(totalHeight: number, showHeader: boolean): number {
  if (!showHeader || totalHeight <= 0) return 0
  const ideal = Math.max(HEADER_MIN_PT, totalHeight * HEADER_FRACTION)
  return Math.min(ideal, totalHeight)
}

/**
 * Build the table-specific Fabric children: header background, column
 * dividers, header divider, per-column header labels, and (when `rows` is
 * supplied) body cell labels (#79). Returns `[]` for non-table fields or
 * when the field has no columns.
 *
 * `rows` is the runtime data the table should render against — flowed in
 * from `previewJsonText` via `useEffectivePreviewData`. Pass `null` to
 * skip the body-cell pass and render only the design-time header (legacy
 * behaviour). Body rows are clipped to `style.maxRows` and to the count
 * that physically fits inside the rect — never overflow (Hard Rule #10).
 */
export function buildTableCanvasParts(
  field: FieldDefinition,
  width: number,
  height: number,
  rows: Record<string, string>[] | null = null,
): FabricObject[] {
  if (field.type !== 'table' || !field.style) return []
  const columns = field.style.columns ?? []
  if (columns.length === 0) return []
  const showHeader = !!field.style.showHeader
  const headerStyle = field.style.headerStyle as CellStyle | undefined

  const boundaries = computeColumnBoundaries(columns, width)
  const headerH = computeHeaderHeight(height, showHeader)
  const widths = scaledColumnWidths(columns, width)
  const parts: FabricObject[] = []

  // Header background fill — paints a band behind the labels so the
  // user's chosen `headerStyle.backgroundColor` is visible. Skipped when
  // the colour is empty/transparent or the header is hidden.
  const headerBg = headerStyle?.backgroundColor
  if (showHeader && headerH > 0 && isVisibleColor(headerBg)) {
    parts.push(
      new Rect({
        left: 0,
        top: 0,
        width,
        height: headerH,
        fill: headerBg,
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      }),
    )
  }

  const headerBorder = headerStyle?.borderColor
  const dividerStroke = isVisibleColor(headerBorder) ? headerBorder : DEFAULT_DIVIDER_STROKE
  const dividerWidth =
    typeof headerStyle?.borderWidth === 'number' && headerStyle.borderWidth > 0
      ? headerStyle.borderWidth
      : DEFAULT_DIVIDER_WIDTH

  for (const x of boundaries) {
    parts.push(
      new Line([x, 0, x, height], {
        stroke: dividerStroke,
        strokeWidth: dividerWidth,
        strokeUniform: true,
        selectable: false,
        evented: false,
      }),
    )
  }

  if (showHeader && headerH > 0 && headerH < height) {
    parts.push(
      new Line([0, headerH, width, headerH], {
        stroke: dividerStroke,
        strokeWidth: dividerWidth,
        strokeUniform: true,
        selectable: false,
        evented: false,
      }),
    )
  }

  // GH #79: render body rows from the supplied data so the canvas reflects
  // the right-panel JSON. Skipped when `rows` is null — design-time
  // preview only. Row count = min(data length, maxRows, rows-that-fit).
  if (rows && rows.length > 0) {
    pushBodyRows(parts, field, width, height, headerH, widths, rows)
  }

  if (showHeader && headerH > 0) {
    const padL = Math.max(0, headerStyle?.paddingLeft ?? 0)
    const padR = Math.max(0, headerStyle?.paddingRight ?? 0)
    const userFontSize =
      typeof headerStyle?.fontSize === 'number' && headerStyle.fontSize > 0
        ? headerStyle.fontSize
        : null
    const fontCap = Math.max(8, Math.min(HEADER_MAX_FONT_PT, headerH * 0.6))
    const fontSize = userFontSize !== null ? Math.min(userFontSize, fontCap) : fontCap

    let leftCum = 0
    for (let i = 0; i < columns.length; i++) {
      const colWidth = widths[i] ?? 0
      const labelText = columns[i]?.label || columns[i]?.key || ''
      const innerW = Math.max(1, colWidth - padL - padR)
      if (labelText && colWidth > padL + padR + 2) {
        parts.push(
          new Textbox(labelText, {
            left: leftCum + padL + innerW / 2,
            top: headerH / 2,
            width: innerW,
            fontSize,
            fontFamily: headerStyle?.fontFamily || DEFAULT_HEADER_FONT_FAMILY,
            fontWeight: headerStyle?.fontWeight || 'bold',
            fontStyle: headerStyle?.fontStyle || 'normal',
            underline: headerStyle?.textDecoration === 'underline',
            linethrough: headerStyle?.textDecoration === 'line-through',
            fill: headerStyle?.color || DEFAULT_HEADER_COLOR,
            textAlign: headerStyle?.align || 'center',
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

  return parts
}

/**
 * Whether a colour value is meaningful to render. Empty / null / `none` /
 * `transparent` all map to "skip"; everything else is forwarded to Fabric.
 */
function isVisibleColor(c: string | null | undefined): c is string {
  if (!c) return false
  const s = c.trim().toLowerCase()
  return s.length > 0 && s !== 'transparent' && s !== 'none'
}
