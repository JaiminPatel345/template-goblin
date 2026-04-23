/**
 * Regression tests for the multi-field hit-detection invariant.
 *
 * User reported: "1st 2 elements work, 3rd/4th/5th are not selectable via
 * canvas click; when I select the 3rd from the left panel then drag inside
 * its area, a PREVIOUS element moves instead." The underlying invariant the
 * production Konva render depends on is:
 *
 *   For any point (x, y), the field whose rectangle contains (x, y) AND
 *   has the highest zIndex among containing fields is what Konva's hit
 *   graph must return.
 *
 * If the math returns a DIFFERENT field (e.g. always field #1 for every
 * point, or always the last-created field), the production bug reproduces.
 * These tests pin the invariant for up to N=5 fields, matching the user's
 * repro.
 */
import { describe, it, expect } from 'vitest'
import { topFieldAt, pointInField, type HittableField } from '../fieldHitMath.js'

function makeFields(n: number): HittableField[] {
  // Non-overlapping grid, 3 columns × ceil(n/3) rows. Each cell 180×80 with
  // 20 px gaps. `zIndex` mirrors creation order (ascending).
  const fields: HittableField[] = []
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / 3)
    const col = i % 3
    fields.push({
      id: `f${i + 1}`,
      x: 20 + col * 220,
      y: 20 + row * 120,
      width: 180,
      height: 80,
      zIndex: i,
    })
  }
  return fields
}

function center(f: HittableField): { x: number; y: number } {
  return { x: f.x + f.width / 2, y: f.y + f.height / 2 }
}

describe('pointInField', () => {
  const f: HittableField = { id: 'x', x: 10, y: 10, width: 100, height: 50, zIndex: 0 }

  it('inside → true', () => {
    expect(pointInField({ x: 50, y: 30 }, f)).toBe(true)
  })

  it('on the exact corner → true', () => {
    expect(pointInField({ x: 10, y: 10 }, f)).toBe(true)
    expect(pointInField({ x: 110, y: 60 }, f)).toBe(true)
  })

  it('outside → false', () => {
    expect(pointInField({ x: 5, y: 30 }, f)).toBe(false)
    expect(pointInField({ x: 115, y: 30 }, f)).toBe(false)
    expect(pointInField({ x: 50, y: 5 }, f)).toBe(false)
    expect(pointInField({ x: 50, y: 70 }, f)).toBe(false)
  })
})

describe('topFieldAt — 5-field regression', () => {
  it('each of 5 non-overlapping fields is returned for its own centre point', () => {
    // PIN for the reported bug: 1st/2nd field returned correctly but
    // 3rd/4th/5th not. Loop asserts every ordinal resolves to itself.
    const fields = makeFields(5)
    for (const f of fields) {
      const hit = topFieldAt(center(f), fields)
      expect(hit?.id).toBe(f.id)
    }
  })

  it('reverse-iteration still resolves correctly (no first-N bias)', () => {
    const fields = makeFields(5)
    for (const f of [...fields].reverse()) {
      expect(topFieldAt(center(f), fields)?.id).toBe(f.id)
    }
  })

  it('gap between fields returns null (no phantom hit)', () => {
    const fields = makeFields(5)
    // Column gap: columns are at x=20 and x=240 (width 180 each). Gap lives
    // between x=200 and x=240.
    expect(topFieldAt({ x: 220, y: 60 }, fields)).toBeNull()
  })

  it('dynamically adding a 6th field makes it hit-testable alongside the first 5', () => {
    const fields = makeFields(5)
    fields.push({ id: 'f6', x: 20, y: 300, width: 180, height: 80, zIndex: 5 })
    // All 6 resolve.
    for (const f of fields) {
      expect(topFieldAt(center(f), fields)?.id).toBe(f.id)
    }
  })

  it('overlapping fields: higher zIndex wins regardless of array position', () => {
    // User clicks inside a region where both field-a and field-b overlap.
    // field-b has higher zIndex → must win, even if it appears first in the
    // input array (array ordering should never affect the result).
    const a: HittableField = { id: 'a', x: 0, y: 0, width: 100, height: 100, zIndex: 0 }
    const b: HittableField = { id: 'b', x: 50, y: 50, width: 100, height: 100, zIndex: 1 }

    expect(topFieldAt({ x: 75, y: 75 }, [a, b])?.id).toBe('b')
    expect(topFieldAt({ x: 75, y: 75 }, [b, a])?.id).toBe('b') // order swap
  })

  it('REGRESSION: 3rd field of 5 at its centre must NOT resolve to the 2nd', () => {
    // Direct mirror of the user's repro: "when cursor is inside 3rd element,
    // drag moves the previous element". Happens only if the hit-math
    // incorrectly picks a lower-zIndex field at a point the higher-zIndex
    // field actually covers.
    const fields = makeFields(5)
    const f3 = fields[2]!
    const f2 = fields[1]!
    const c = center(f3)
    expect(topFieldAt(c, fields)?.id).toBe('f3')
    expect(topFieldAt(c, fields)?.id).not.toBe(f2.id)
  })
})
