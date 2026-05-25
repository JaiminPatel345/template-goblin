import type { VerticalAlign } from '@template-goblin/types'

/**
 * Resolve the y position for a single-line cell respecting the
 * cell's verticalAlign. The previous loop renderer always landed at
 * `startY + paddingTop`, dropping the editor's vAlign toggle for
 * table cells — discovered during the post-#158 audit. The renderer
 * for plain text fields already does this (see `text.ts` verticalAlign
 * switch); this helper applies the same semantic to body + header
 * cells.
 *
 * Cells render one visible line (`maxTextRows = 1`), so the visible
 * text-block height collapses to `fontSize`. The y position inside
 * the cell box becomes:
 *   - 'top'    → startY + paddingTop
 *   - 'middle' → startY + (rowHeight - fontSize) / 2  (centred)
 *   - 'bottom' → startY + rowHeight - paddingBottom - fontSize
 *
 * No clamping at the top edge — if the cell is too short to hold the
 * font + paddings, the caller's clip rect already prevents overflow
 * outside the table bounding rectangle.
 */
export function resolveCellTextY(
  startY: number,
  rowHeight: number,
  fontSize: number,
  paddingTop: number,
  paddingBottom: number,
  verticalAlign: VerticalAlign,
): number {
  if (verticalAlign === 'middle') {
    return startY + (rowHeight - fontSize) / 2
  }
  if (verticalAlign === 'bottom') {
    return startY + rowHeight - paddingBottom - fontSize
  }
  return startY + paddingTop
}
