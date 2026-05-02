/**
 * Table-specific Fabric children for the canvas (#38).
 *
 * The base `buildGroupChildren` in `fabricUtils.ts` handles the bgRect and
 * (for non-table fields) a centred body label. Tables need column dividers,
 * a header divider, and per-column header labels so that adding / editing /
 * removing columns in the right panel produces visible feedback on the
 * canvas. Without these, the rect rebuild on every field update is a no-op
 * and the canvas falsely says "nothing changed".
 *
 * Pure layout maths live in `computeColumnBoundaries` / `computeHeaderHeight`
 * so they can be unit-tested without instantiating Fabric.
 */
import { Line, Textbox } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition, TableColumn } from '@template-goblin/types'

const HEADER_FRACTION = 0.22
const HEADER_MIN_PT = 14
const HEADER_MAX_FONT_PT = 12
const DIVIDER_STROKE = '#0a0a0a'
const DIVIDER_WIDTH = 0.5

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
 * Build the table-specific Fabric children: column dividers, header
 * divider, and per-column header labels. Returns `[]` for non-table fields
 * or when the field has no columns (fall through to the centred body label
 * `buildGroupChildren` already produces).
 */
export function buildTableCanvasParts(
  field: FieldDefinition,
  width: number,
  height: number,
): FabricObject[] {
  if (field.type !== 'table' || !field.style) return []
  const columns = field.style.columns ?? []
  if (columns.length === 0) return []
  const showHeader = !!field.style.showHeader

  const boundaries = computeColumnBoundaries(columns, width)
  const headerH = computeHeaderHeight(height, showHeader)
  const widths = scaledColumnWidths(columns, width)
  const parts: FabricObject[] = []

  for (const x of boundaries) {
    parts.push(
      new Line([x, 0, x, height], {
        stroke: DIVIDER_STROKE,
        strokeWidth: DIVIDER_WIDTH,
        strokeUniform: true,
        selectable: false,
        evented: false,
      }),
    )
  }

  if (showHeader && headerH > 0 && headerH < height) {
    parts.push(
      new Line([0, headerH, width, headerH], {
        stroke: DIVIDER_STROKE,
        strokeWidth: DIVIDER_WIDTH,
        strokeUniform: true,
        selectable: false,
        evented: false,
      }),
    )
  }

  if (showHeader && headerH > 0) {
    let leftCum = 0
    const padding = 4
    for (let i = 0; i < columns.length; i++) {
      const colWidth = widths[i] ?? 0
      const labelText = columns[i]?.label || columns[i]?.key || ''
      if (labelText && colWidth > padding * 2) {
        const fontSize = Math.max(8, Math.min(HEADER_MAX_FONT_PT, headerH * 0.6))
        parts.push(
          new Textbox(labelText, {
            left: leftCum + colWidth / 2,
            top: headerH / 2,
            width: Math.max(1, colWidth - padding),
            fontSize,
            fontFamily: 'Helvetica',
            fontWeight: 'bold',
            fill: '#0a0a0a',
            textAlign: 'center',
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
