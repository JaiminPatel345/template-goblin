/**
 * Equal-spacing detection for smart alignment guides (#41).
 *
 * Canva/PowerPoint show a "matching gap" indicator when the active object's
 * distance to a neighbour equals the distance from that neighbour to another
 * object on the same axis. We compute this once per drag tick from the
 * candidate list's `otherRects`.
 *
 * Implementation: scan pairs of other rects on each axis. If `active` is
 * positioned such that gap(A → active) ≈ gap(active → B), record a
 * horizontal-spacing match (and vice versa for vertical).
 *
 * The output is a list of `Gap` records — the renderer turns each into a
 * pair of bracket marks the user sees as "= = =".
 */
import type { Rect } from './candidates.js'

export interface SpacingGap {
  /** Axis the gap lives on. */
  axis: 'x' | 'y'
  /** Start coordinate along the axis (left or top edge). */
  start: number
  /** End coordinate along the axis. */
  end: number
  /** Perpendicular position (vertical line for x-axis gap = y centre). */
  perp: number
}

/** Centre of `r` on the requested axis. */
function center(r: Rect, axis: 'x' | 'y'): number {
  return axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2
}

/** Edge-to-edge gap between two non-overlapping rects on the given axis. */
function gapBetween(a: Rect, b: Rect, axis: 'x' | 'y'): number {
  if (axis === 'x') {
    if (a.left > b.left) return gapBetween(b, a, axis)
    return b.left - (a.left + a.width)
  }
  if (a.top > b.top) return gapBetween(b, a, axis)
  return b.top - (a.top + a.height)
}

/**
 * Detect equal-spacing triples where `active` sits between two other rects
 * with matching gaps on each axis. Returns the pair of equal gaps as
 * {@link SpacingGap} records ready for the renderer.
 */
export function detectEqualSpacing(
  active: Rect,
  others: readonly Rect[],
  tolerance: number,
): SpacingGap[] {
  const out: SpacingGap[] = []
  for (const axis of ['x', 'y'] as const) {
    const activeC = center(active, axis)
    const before = others.filter((r) => center(r, axis) < activeC)
    const after = others.filter((r) => center(r, axis) > activeC)
    for (const a of before) {
      const gapA = gapBetween(a, active, axis)
      if (gapA < 0) continue // overlapping → not a clean spacing
      for (const b of after) {
        const gapB = gapBetween(active, b, axis)
        if (gapB < 0) continue
        if (Math.abs(gapA - gapB) > tolerance) continue
        const perp =
          axis === 'x'
            ? (active.top + active.height / 2 + a.top + a.height / 2 + b.top + b.height / 2) / 3
            : (active.left + active.width / 2 + a.left + a.width / 2 + b.left + b.width / 2) / 3
        if (axis === 'x') {
          out.push({ axis, start: a.left + a.width, end: active.left, perp })
          out.push({ axis, start: active.left + active.width, end: b.left, perp })
        } else {
          out.push({ axis, start: a.top + a.height, end: active.top, perp })
          out.push({ axis, start: active.top + active.height, end: b.top, perp })
        }
      }
    }
  }
  return out
}
