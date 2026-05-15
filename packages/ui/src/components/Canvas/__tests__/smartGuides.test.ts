/**
 * Unit tests for the pure helpers in `smartGuides/` (#41).
 *
 * Render + the Fabric wire are intentionally NOT tested here — they need
 * a live Fabric.Canvas. The pure helpers cover the load-bearing math:
 *   - candidate building (right shape + page edges always present)
 *   - snap selection (best of three edges, tolerance honoured, miss → null)
 *   - equal-spacing detection (gap match + reject overlap / single-side)
 *   - zoom-aware tolerance (clamped to [6, 24] pt)
 */
import { describe, it, expect } from 'vitest'
import {
  buildCandidates,
  findXSnap,
  findYSnap,
  computeSnap,
  detectEqualSpacing,
  snapToleranceForZoom,
  SNAP_DISTANCE_PT,
} from '../smartGuides/index.js'
import type { Rect } from '../smartGuides/index.js'

const rect = (left: number, top: number, width: number, height: number): Rect => ({
  left,
  top,
  width,
  height,
})

describe('buildCandidates', () => {
  it('emits six candidates per other rect + three page candidates per axis', () => {
    const c = buildCandidates([rect(10, 20, 100, 50)], 800, 600)
    // 3 from the rect + 3 page edges on each axis
    expect(c.x).toHaveLength(6)
    expect(c.y).toHaveLength(6)
  })

  it('omits page candidates when page dims are zero (no current page yet)', () => {
    const c = buildCandidates([rect(0, 0, 10, 10)], 0, 0)
    expect(c.x).toHaveLength(3)
    expect(c.y).toHaveLength(3)
  })

  it('marks page candidates with source: "page" and object candidates with "object"', () => {
    const c = buildCandidates([rect(10, 10, 10, 10)], 800, 600)
    const pageX = c.x.filter((cand) => cand.source === 'page')
    expect(pageX).toHaveLength(3)
    expect(pageX.map((p) => p.x).sort((a, b) => a - b)).toEqual([0, 400, 800])
  })
})

describe('findXSnap / findYSnap', () => {
  const cands = buildCandidates([rect(100, 100, 50, 50)], 800, 600)

  it('snaps the active rect left edge to a candidate within tolerance', () => {
    // Pick an active rect whose closest candidate is unambiguously the left
    // candidate. Right candidate of other rect = 150, centerX = 125, left = 100.
    // active.left=98 → delta to left candidate = +2 (left edge match).
    // active.right=108, far from any candidate.
    const active = rect(98, 0, 10, 10)
    const hit = findXSnap(active, cands.x, 6)
    expect(hit).not.toBeNull()
    expect(hit?.activeEdge).toBe('left')
    expect(hit?.delta).toBe(2)
  })

  it('prefers the closer of left/right/centerX', () => {
    // active rect: left=140, right=160, cx=150. centerX candidate=125 (10 away),
    // left candidate from the other rect: x=100 (40 away from left=140 — out of range).
    // Right candidate of other rect: x=150 (10 away from right=160).
    // Best: centerX or right tied at 10. Bumping tolerance to 12 to catch both.
    const active = rect(140, 0, 20, 20)
    const hit = findXSnap(active, cands.x, 12)
    expect(hit).not.toBeNull()
    expect(Math.abs(hit!.delta)).toBeLessThanOrEqual(10)
  })

  it('returns null outside tolerance', () => {
    const active = rect(200, 0, 20, 20) // far from every candidate
    expect(findXSnap(active, cands.x, 6)).toBeNull()
  })

  it('Y axis mirrors X axis behaviour', () => {
    const active = rect(0, 102, 20, 20)
    const hit = findYSnap(active, cands.y, 6)
    expect(hit?.activeEdge).toBe('top')
    expect(hit?.delta).toBe(-2)
  })
})

describe('computeSnap', () => {
  it('returns null entries when nothing is in range, on both axes independently', () => {
    // Place active far from every other-rect candidate AND every page edge
    // (page 800x600 → x candidates {0,400,800}, y candidates {0,300,600}).
    const cands = buildCandidates([rect(100, 100, 50, 50)], 800, 600)
    const result = computeSnap(rect(700, 450, 10, 10), cands, 4)
    expect(result.x).toBeNull()
    expect(result.y).toBeNull()
  })

  it('can hit only one axis at a time', () => {
    const cands = buildCandidates([rect(100, 100, 50, 50)], 800, 600)
    const result = computeSnap(rect(102, 400, 10, 10), cands, 6)
    expect(result.x).not.toBeNull()
    expect(result.y).toBeNull()
  })
})

describe('detectEqualSpacing', () => {
  it('finds a matching gap when active sits between two rects with equal spacing', () => {
    const left = rect(0, 100, 50, 50) // right edge = 50
    const right = rect(200, 100, 50, 50) // left edge = 200
    const active = rect(100, 100, 50, 50) // gap to left = 50, gap to right = 50
    const gaps = detectEqualSpacing(active, [left, right], 1)
    expect(gaps.length).toBeGreaterThanOrEqual(2)
    expect(gaps.every((g) => g.axis === 'x')).toBe(true)
  })

  it('returns empty when only one neighbour exists on either side', () => {
    const active = rect(100, 100, 50, 50)
    const only = rect(0, 100, 50, 50)
    expect(detectEqualSpacing(active, [only], 1)).toEqual([])
  })

  it('rejects overlap (negative gap)', () => {
    const a = rect(80, 100, 50, 50)
    const b = rect(120, 100, 50, 50)
    const active = rect(100, 100, 50, 50) // overlaps both
    expect(detectEqualSpacing(active, [a, b], 1)).toEqual([])
  })

  it('honours tolerance — gaps within `tolerance` of each other match', () => {
    const left = rect(0, 100, 50, 50) // right=50
    const right = rect(201, 100, 50, 50) // left=201
    const active = rect(100, 100, 50, 50) // gap L=50, gap R=51
    expect(detectEqualSpacing(active, [left, right], 0.5)).toEqual([])
    expect(detectEqualSpacing(active, [left, right], 1.5).length).toBeGreaterThan(0)
  })
})

describe('edge cases', () => {
  it('empty other-rects + zero page → no candidates anywhere', () => {
    const c = buildCandidates([], 0, 0)
    expect(c.x).toHaveLength(0)
    expect(c.y).toHaveLength(0)
  })

  it('page-only candidates still snap the active rect (no other fields on page)', () => {
    const c = buildCandidates([], 800, 600)
    // active rect's left = 2 → snaps to page x=0
    const r = computeSnap(rect(2, 200, 50, 50), c, 6)
    expect(r.x?.candidate.source).toBe('page')
    expect(r.x?.delta).toBe(-2)
  })

  it('picks the smallest-|delta| candidate when multiple are in range', () => {
    // Two other rects exposing 6 X candidates total; active at (103, w=5)
    // tests all three of its own edges (left/right/cx) against all of them.
    // The win condition: returned delta has the smallest absolute value.
    const c = buildCandidates([rect(100, 0, 10, 10), rect(140, 0, 10, 10)], 0, 0)
    const r = findXSnap(rect(103, 0, 5, 5), c.x, 6)
    expect(r).not.toBeNull()
    // All other candidates would have |delta| > the winner's.
    for (const cand of c.x) {
      for (const activeX of [103, 103 + 5, 103 + 2.5]) {
        const d = Math.abs(cand.x - activeX)
        if (d <= 6) expect(d).toBeGreaterThanOrEqual(Math.abs(r!.delta))
      }
    }
  })

  it('horizontal-only page (height=0) still yields X candidates', () => {
    const c = buildCandidates([], 800, 0)
    expect(c.x).toHaveLength(3)
    expect(c.y).toHaveLength(0)
  })

  it('detectEqualSpacing on the Y axis between three vertically-stacked rects', () => {
    const top = rect(100, 0, 50, 50) // bottom = 50
    const bottom = rect(100, 200, 50, 50) // top = 200
    const active = rect(100, 100, 50, 50) // gap top = 50, gap bottom = 50
    const gaps = detectEqualSpacing(active, [top, bottom], 1)
    expect(gaps.length).toBeGreaterThan(0)
    expect(gaps.every((g) => g.axis === 'y')).toBe(true)
  })

  it('detectEqualSpacing handles 4 neighbours without crashing', () => {
    const a = rect(0, 100, 50, 50)
    const b = rect(60, 100, 50, 50)
    const c = rect(170, 100, 50, 50)
    const d = rect(230, 100, 50, 50)
    // Just ensure the algorithm produces an array, regardless of geometry.
    const active = rect(120, 100, 50, 50)
    const result = detectEqualSpacing(active, [a, b, c, d], 1)
    expect(Array.isArray(result)).toBe(true)
  })

  it('buildCandidates excludes nothing on its own — filtering is the wire layer', () => {
    // Pure helper: it includes everything passed in. The wire layer is
    // responsible for filtering grid/page-bounds/smart-guide/active members.
    const c = buildCandidates([rect(0, 0, 10, 10), rect(50, 50, 10, 10)], 100, 100)
    expect(c.x).toHaveLength(2 * 3 + 3) // 2 rects × 3 + page
  })
})

describe('snapToleranceForZoom', () => {
  it('returns the base distance at 1x zoom', () => {
    expect(snapToleranceForZoom(1)).toBe(SNAP_DISTANCE_PT)
  })

  it('caps at 24pt for very small zooms', () => {
    expect(snapToleranceForZoom(0.1)).toBe(24)
  })

  it('floors at 6pt for very large zooms', () => {
    expect(snapToleranceForZoom(10)).toBe(SNAP_DISTANCE_PT)
  })

  it('handles bogus zoom values defensively', () => {
    expect(snapToleranceForZoom(0)).toBe(SNAP_DISTANCE_PT)
    expect(snapToleranceForZoom(Number.NaN)).toBe(SNAP_DISTANCE_PT)
  })
})
