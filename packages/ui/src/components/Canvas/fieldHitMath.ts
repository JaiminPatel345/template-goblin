/**
 * Pure-logic helpers that describe the invariants the Konva render relies on
 * for correct hit-detection. These are what `stage.getIntersection({x, y})`
 * should return for a well-formed Stage given the same inputs.
 *
 * Factoring the math out into a pure function lets us exercise the invariant
 * in a Node test without the heavy `canvas` native dependency Konva requires
 * when run outside a browser.
 *
 * The production Konva render honours the same invariants:
 *   - Each field is a Group at (field.x, field.y) with a Rect of
 *     (field.width, field.height).
 *   - Fields are sorted ascending by `zIndex`, so the highest zIndex renders
 *     last (on top).
 *   - Konva returns the topmost listening shape under the pointer.
 */

export interface HittableField {
  id: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

export interface HitPoint {
  x: number
  y: number
}

/**
 * Bounding-box hit test. Returns true when the point is inside the field's
 * rectangular bounds (inclusive). Production Konva uses the same rule for
 * listening `Rect` shapes with `fill` set.
 */
export function pointInField(p: HitPoint, f: HittableField): boolean {
  return p.x >= f.x && p.x <= f.x + f.width && p.y >= f.y && p.y <= f.y + f.height
}

/**
 * Return the topmost field under a point (highest zIndex wins). Returns null
 * if no field contains the point. This mirrors `stage.getIntersection()` for
 * our production render which draws fields in ascending zIndex order so the
 * highest-zIndex field is on top of the hit graph.
 */
export function topFieldAt(p: HitPoint, fields: HittableField[]): HittableField | null {
  // Walk descending by zIndex so we find the topmost match first.
  const sorted = [...fields].sort((a, b) => b.zIndex - a.zIndex)
  for (const f of sorted) {
    if (pointInField(p, f)) return f
  }
  return null
}
