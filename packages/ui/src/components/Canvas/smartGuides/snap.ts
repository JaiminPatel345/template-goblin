/**
 * Pure snap math for smart alignment guides (#41).
 *
 * Given an active rect (the object being dragged/scaled) and a candidate
 * list, picks the best snap for each axis within tolerance and reports the
 * coordinate delta required to move the active rect into alignment.
 *
 * The active rect's left / right / centerX edges are each tested against
 * every X candidate; whichever pair yields the smallest |distance| within
 * tolerance wins. Same on Y. Both axes are independent.
 */
import type { Rect, XCandidate, YCandidate, Candidates } from './candidates.js'

export interface AxisHit<C> {
  /** Delta to add to the active rect's left/top to land on the snap. */
  delta: number
  /** Which edge of the active rect aligned. */
  activeEdge: 'left' | 'right' | 'centerX' | 'top' | 'bottom' | 'centerY'
  /** The candidate that was hit. */
  candidate: C
}

export interface SnapResult {
  x: AxisHit<XCandidate> | null
  y: AxisHit<YCandidate> | null
}

/**
 * Find the best X-axis snap for `rect` against `xCandidates` within
 * `tolerance` points. Returns the delta to apply to the rect's `left`,
 * not a target coordinate — keeps the caller honest about applying to the
 * Fabric group's `left` (which may differ from `boundingRect.left`).
 */
export function findXSnap(
  rect: Rect,
  xCandidates: readonly XCandidate[],
  tolerance: number,
): AxisHit<XCandidate> | null {
  const left = rect.left
  const right = rect.left + rect.width
  const cx = rect.left + rect.width / 2
  let best: AxisHit<XCandidate> | null = null
  for (const c of xCandidates) {
    const cases: Array<[number, AxisHit<XCandidate>['activeEdge']]> = [
      [c.x - left, 'left'],
      [c.x - right, 'right'],
      [c.x - cx, 'centerX'],
    ]
    for (const [delta, activeEdge] of cases) {
      const abs = Math.abs(delta)
      if (abs > tolerance) continue
      if (!best || abs < Math.abs(best.delta)) {
        best = { delta, activeEdge, candidate: c }
      }
    }
  }
  return best
}

/** Y-axis twin of {@link findXSnap}. */
export function findYSnap(
  rect: Rect,
  yCandidates: readonly YCandidate[],
  tolerance: number,
): AxisHit<YCandidate> | null {
  const top = rect.top
  const bottom = rect.top + rect.height
  const cy = rect.top + rect.height / 2
  let best: AxisHit<YCandidate> | null = null
  for (const c of yCandidates) {
    const cases: Array<[number, AxisHit<YCandidate>['activeEdge']]> = [
      [c.y - top, 'top'],
      [c.y - bottom, 'bottom'],
      [c.y - cy, 'centerY'],
    ]
    for (const [delta, activeEdge] of cases) {
      const abs = Math.abs(delta)
      if (abs > tolerance) continue
      if (!best || abs < Math.abs(best.delta)) {
        best = { delta, activeEdge, candidate: c }
      }
    }
  }
  return best
}

/**
 * Compute both-axis snap for the active rect against the candidate list.
 * Returns `{x: null, y: null}` when nothing's in range — the caller still
 * uses the result to clear stale guide lines.
 */
export function computeSnap(rect: Rect, candidates: Candidates, tolerance: number): SnapResult {
  return {
    x: findXSnap(rect, candidates.x, tolerance),
    y: findYSnap(rect, candidates.y, tolerance),
  }
}
