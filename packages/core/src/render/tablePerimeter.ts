import type PDFDocument from 'pdfkit'
import type { TableFieldStyle } from '@template-goblin/types'

/**
 * Draw the table's outer perimeter rectangle on top of any rendered rows.
 *
 * Uses `rowStyle.borderColor` / `borderWidth` as the closest proxy for "the
 * table's frame" until an explicit perimeter style lands (#76). When the
 * row border is zero-width, no perimeter is drawn — preserves the
 * borderless look users opt into.
 */
export function drawTablePerimeter(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  height: number,
  style: TableFieldStyle,
): void {
  // #76 follow-up: prefer the explicit table-level border when set; fall
  // back to the legacy row-derived perimeter for templates that predate
  // the `tableBorder` field. Either source can suppress the perimeter
  // with width <= 0 or a null colour.
  const tb = style.tableBorder
  const bw = tb ? tb.width : style.rowStyle.borderWidth
  if (!bw || bw <= 0) return
  const stroke = tb ? tb.color : style.rowStyle.borderColor
  if (!stroke) return
  doc.save()
  doc.lineWidth(bw).strokeColor(stroke)
  doc.rect(x, y, width, height).stroke()
  doc.restore()
}
