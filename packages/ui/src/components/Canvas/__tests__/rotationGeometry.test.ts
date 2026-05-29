/**
 * Unit tests for centre-pivoted rotation math (#172 follow-up).
 *
 * Property pinned: when the helper's `(left, top)` are applied to a
 * Fabric Group with `originX: 'left', originY: 'top'` and the supplied
 * angle, the visible centre lands EXACTLY at the unrotated centre.
 * Round-trip via `recoverUnrotatedXY` returns the original `(x, y)`.
 */
import { describe, it, expect } from 'vitest'
import { centerCompensatedLeftTop, recoverUnrotatedXY } from '../rotationGeometry'

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
