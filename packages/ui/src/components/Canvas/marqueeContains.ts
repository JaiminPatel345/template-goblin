/**
 * Pure rect-containment helper for marquee selection (#109).
 *
 * Fabric's `selectionFullyContained: true` flag already handles the
 * live canvas test; this helper exposes the same math as a callable
 * function so the e2e test can assert the selection rules against
 * deterministic coordinates, AND so any future custom marquee impl
 * (e.g. lasso, multi-zone) can reuse the same predicate.
 *
 * Mirrors Canva / Figma / PowerPoint / Google Slides:
 *   - A field is selected only when its ENTIRE bounding rect lies
 *     within the marquee rect.
 *   - Partial overlap → NOT selected.
 *   - The field rect's edges touching the marquee edges count as
 *     contained (`<=` on every side).
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Returns `true` when `inner` lies fully inside `outer`. Edge contact
 * counts as contained.
 */
export function rectFullyContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

/**
 * Given the marquee rect (in canvas/page coordinates) and a list of
 * field rects, return the ids of fields whose bounding rect is fully
 * contained inside the marquee.
 */
export function selectFullyContainedFieldIds(
  marquee: Rect,
  fields: Array<{ id: string; x: number; y: number; width: number; height: number }>,
): string[] {
  return fields
    .filter((f) => rectFullyContains(marquee, { x: f.x, y: f.y, width: f.width, height: f.height }))
    .map((f) => f.id)
}
