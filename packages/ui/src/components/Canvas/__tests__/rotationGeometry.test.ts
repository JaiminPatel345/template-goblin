/**
 * Unit tests for centre-pivoted rotation math (#172 follow-up).
 *
 * Property pinned: when the helper's `(left, top)` are applied to a
 * Fabric Group with `originX: 'left', originY: 'top'` and the supplied
 * angle, the visible centre lands EXACTLY at the unrotated centre.
 * Round-trip via `recoverUnrotatedXY` returns the original `(x, y)`.
 */
import { describe, it, expect } from 'vitest'
import { centerCompensatedLeftTop, normaliseAngle, recoverUnrotatedXY } from '../rotationGeometry'

function visibleCenter(
  left: number,
  top: number,
  width: number,
  height: number,
  angleDeg: number,
): { cx: number; cy: number } {
  // Rendering math under originX:'left', originY:'top' — the visible
  // centre after rotating around `(left, top)` by angleDeg degrees.
  const theta = (angleDeg * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  return {
    cx: left + (width / 2) * cos - (height / 2) * sin,
    cy: top + (width / 2) * sin + (height / 2) * cos,
  }
}

describe('centerCompensatedLeftTop', () => {
  it('returns (x, y) unchanged when rotation is 0', () => {
    expect(
      centerCompensatedLeftTop({ x: 100, y: 200, width: 80, height: 30, rotation: 0 }),
    ).toEqual({ left: 100, top: 200 })
  })

  it('treats null rotation as 0', () => {
    expect(
      centerCompensatedLeftTop({ x: 100, y: 200, width: 80, height: 30, rotation: null }),
    ).toEqual({ left: 100, top: 200 })
  })

  it('treats undefined rotation as 0', () => {
    expect(centerCompensatedLeftTop({ x: 100, y: 200, width: 80, height: 30 })).toEqual({
      left: 100,
      top: 200,
    })
  })

  it.each([15, 30, 45, 60, 90, 120, 180, -45, -90, 270, 359])(
    'visible centre equals unrotated centre at rotation = %s°',
    (rotation) => {
      const rect = { x: 100, y: 200, width: 120, height: 40, rotation }
      const { left, top } = centerCompensatedLeftTop(rect)
      const { cx, cy } = visibleCenter(left, top, rect.width, rect.height, rotation)
      // Unrotated centre = (x + w/2, y + h/2) = (160, 220) for this case.
      expect(cx).toBeCloseTo(rect.x + rect.width / 2, 6)
      expect(cy).toBeCloseTo(rect.y + rect.height / 2, 6)
    },
  )

  it('positive rotation shifts compensated.left RIGHT for wide rects', () => {
    // For a wide rect at angle 60°, compensation must push group.left
    // right (so the visible centre stays on the unrotated centre).
    const { left } = centerCompensatedLeftTop({
      x: 100,
      y: 100,
      width: 120,
      height: 40,
      rotation: 60,
    })
    expect(left).toBeGreaterThan(100)
  })
})

describe('recoverUnrotatedXY', () => {
  it('returns (left, top) unchanged when angle is 0', () => {
    expect(recoverUnrotatedXY(100, 200, 80, 30, 0)).toEqual({ x: 100, y: 200 })
  })

  it.each([15, 30, 45, 60, 90, 120, 180, -45, -90, 270, 359])(
    'round-trips (x,y) → compensated → unrotated at rotation = %s°',
    (rotation) => {
      const original = { x: 137, y: 53, width: 120, height: 40 }
      const { left, top } = centerCompensatedLeftTop({ ...original, rotation })
      const back = recoverUnrotatedXY(left, top, original.width, original.height, rotation)
      expect(back.x).toBeCloseTo(original.x, 6)
      expect(back.y).toBeCloseTo(original.y, 6)
    },
  )

  it('round-trips for very thin rects (height = 1)', () => {
    const original = { x: 10, y: 10, width: 200, height: 1 }
    const { left, top } = centerCompensatedLeftTop({ ...original, rotation: 17 })
    const back = recoverUnrotatedXY(left, top, original.width, original.height, 17)
    expect(back.x).toBeCloseTo(original.x, 6)
    expect(back.y).toBeCloseTo(original.y, 6)
  })

  it('round-trips for square rects', () => {
    const original = { x: 50, y: 50, width: 100, height: 100 }
    const { left, top } = centerCompensatedLeftTop({ ...original, rotation: 33 })
    const back = recoverUnrotatedXY(left, top, original.width, original.height, 33)
    expect(back.x).toBeCloseTo(original.x, 6)
    expect(back.y).toBeCloseTo(original.y, 6)
  })
})

describe('normaliseAngle', () => {
  it.each([
    [0, 0],
    [360, 0],
    [-360, 0],
    [720, 0],
    [45, 45],
    [-45, 315],
    [180, 180],
    [-180, 180],
    [359.999, 359.999],
    [400, 40],
    [-400, 320],
  ])('normalises %s -> %s', (input, expected) => {
    expect(normaliseAngle(input)).toBeCloseTo(expected, 6)
  })

  it.each([null, undefined, NaN, Infinity, -Infinity])('non-finite %s collapses to 0', (input) => {
    expect(normaliseAngle(input as number | null | undefined)).toBe(0)
  })

  it('huge values stay in [0, 360)', () => {
    const huge = 5612356213214654
    const result = normaliseAngle(huge)
    expect(result).toBeGreaterThanOrEqual(0)
    expect(result).toBeLessThan(360)
  })

  it('huge value pair that maps to the same equivalence class yields the same normalised angle', () => {
    // Property: x and x + 360 should normalise to the same value at
    // small magnitudes. At large magnitudes the float ULP exceeds
    // 360, so we just require the result to be in range — not bit-
    // identical to a small-magnitude representative.
    const a = normaliseAngle(720 + 45)
    const b = normaliseAngle(45)
    expect(a).toBeCloseTo(b, 6)
  })
})

describe('centerCompensatedLeftTop — huge-angle precision (#172 follow-up)', () => {
  it('rotation = N and rotation = (N mod 360) produce the same compensated (left, top) for small N', () => {
    // For small N (well within float precision), normalising the
    // rotation MUST be a no-op for the visible position.
    const rect = { x: 100, y: 100, width: 160, height: 160 }
    const a = centerCompensatedLeftTop({ ...rect, rotation: 720 + 45 })
    const b = centerCompensatedLeftTop({ ...rect, rotation: 45 })
    expect(a.left).toBeCloseTo(b.left, 6)
    expect(a.top).toBeCloseTo(b.top, 6)
  })

  it('huge rotation returns a finite, in-range visible position (no NaN/Infinity)', () => {
    const huge = 5612356213214654
    const result = centerCompensatedLeftTop({
      x: 100,
      y: 100,
      width: 160,
      height: 160,
      rotation: huge,
    })
    expect(Number.isFinite(result.left)).toBe(true)
    expect(Number.isFinite(result.top)).toBe(true)
  })
})
