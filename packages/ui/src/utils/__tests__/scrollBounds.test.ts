import { describe, it, expect } from 'vitest'
import { computeScrollBounds } from '../scrollBounds'

describe('computeScrollBounds — symmetric canvas overflow', () => {
  it('returns zero overflow when the zoomed stage fits in the viewport', () => {
    const b = computeScrollBounds({ canvasExtent: 595, zoom: 1, viewportExtent: 800 })
    expect(b.overflowStart).toBe(0)
    expect(b.overflowEnd).toBe(0)
    expect(b.totalOverflow).toBe(0)
  })

  it('splits overflow symmetrically between start and end at high zoom', () => {
    // A4 width 595 pt * 3x zoom = 1785 px, viewport 1000 px → 785 px overflow
    const b = computeScrollBounds({ canvasExtent: 595, zoom: 3, viewportExtent: 1000 })
    expect(b.totalOverflow).toBeCloseTo(785, 6)
    // Symmetric: magnitudes around centre must be equal — this is the exact
    // invariant the Workstream 5 bug violated (left was 0 / right was 785).
    expect(b.overflowStart).toBeCloseTo(b.overflowEnd, 6)
    expect(b.overflowStart).toBeCloseTo(392.5, 6)
  })

  it('never produces negative overflow', () => {
    const b = computeScrollBounds({ canvasExtent: 100, zoom: 0.5, viewportExtent: 500 })
    expect(b.overflowStart).toBeGreaterThanOrEqual(0)
    expect(b.overflowEnd).toBeGreaterThanOrEqual(0)
  })

  it('remains symmetric across a range of zoom levels (regression)', () => {
    for (const zoom of [0.5, 1, 1.25, 2, 2.5, 4]) {
      const b = computeScrollBounds({ canvasExtent: 842, zoom, viewportExtent: 900 })
      expect(
        Math.abs(b.overflowStart - b.overflowEnd),
        `zoom=${zoom} asymmetric: start=${b.overflowStart} end=${b.overflowEnd}`,
      ).toBeLessThan(1e-6)
    }
  })
})
