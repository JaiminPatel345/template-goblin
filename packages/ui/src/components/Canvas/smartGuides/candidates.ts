/**
 * Build the snap-target candidate list for a smart-alignment-guide pass (#41).
 *
 * A "candidate" is a single coordinate that the active object's matching
 * edge or centre may snap to. We pre-build the candidate list at
 * `mouse:down` (or first `object:moving` tick) so the per-tick math is
 * just a linear scan + abs() comparison.
 *
 * Each non-active rect contributes six candidates (left / right / centerX /
 * top / bottom / centerY). The page itself contributes three on each axis
 * (edges + centre). Page-derived candidates carry `source: 'page'` so the
 * renderer can colour them differently.
 */

/** Axis-aligned bounding box in canvas object-space points. */
export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export interface XCandidate {
  /** X coordinate to snap the matching edge to. */
  x: number
  /** Which edge of the source rect this candidate represents. */
  kind: 'left' | 'right' | 'centerX'
  /** Where it came from — used for guide colour. */
  source: 'object' | 'page'
  /** Source rect (omitted for page candidates so renderer draws full-canvas). */
  rect?: Rect
}

export interface YCandidate {
  y: number
  kind: 'top' | 'bottom' | 'centerY'
  source: 'object' | 'page'
  rect?: Rect
}

export interface Candidates {
  x: XCandidate[]
  y: YCandidate[]
  /** Other-rects used for equal-spacing detection (active rect excluded). */
  otherRects: Rect[]
}

/**
 * Build candidates from the list of OTHER rects on the page plus the page
 * dimensions. Pure function — no Fabric coupling, trivially unit-testable.
 */
export function buildCandidates(
  otherRects: Rect[],
  pageWidth: number,
  pageHeight: number,
): Candidates {
  const x: XCandidate[] = []
  const y: YCandidate[] = []

  for (const r of otherRects) {
    const left = r.left
    const right = r.left + r.width
    const cx = r.left + r.width / 2
    const top = r.top
    const bottom = r.top + r.height
    const cy = r.top + r.height / 2
    x.push(
      { x: left, kind: 'left', source: 'object', rect: r },
      { x: right, kind: 'right', source: 'object', rect: r },
      { x: cx, kind: 'centerX', source: 'object', rect: r },
    )
    y.push(
      { y: top, kind: 'top', source: 'object', rect: r },
      { y: bottom, kind: 'bottom', source: 'object', rect: r },
      { y: cy, kind: 'centerY', source: 'object', rect: r },
    )
  }

  // Page edges + centres — always-on per the issue's acceptance criteria.
  if (pageWidth > 0) {
    x.push(
      { x: 0, kind: 'left', source: 'page' },
      { x: pageWidth, kind: 'right', source: 'page' },
      { x: pageWidth / 2, kind: 'centerX', source: 'page' },
    )
  }
  if (pageHeight > 0) {
    y.push(
      { y: 0, kind: 'top', source: 'page' },
      { y: pageHeight, kind: 'bottom', source: 'page' },
      { y: pageHeight / 2, kind: 'centerY', source: 'page' },
    )
  }

  return { x, y, otherRects }
}
