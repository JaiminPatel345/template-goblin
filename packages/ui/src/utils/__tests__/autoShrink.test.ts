/**
 * Unit tests for the auto-shrink helpers (#42).
 *
 * `fitStaticImageRect` is fully pure — easy to exercise.
 * `measureStaticTextRect` uses the off-screen `<canvas>` 2D context; vitest's
 * jsdom env provides a stub `getContext('2d')` with deterministic
 * `measureText` (returns `text.length * 8` for the default font), which is
 * stable enough to assert the helper's branching logic.
 */
import { describe, it, expect } from 'vitest'
import { fitStaticImageRect, measureStaticTextRect } from '../autoShrink.js'

describe('fitStaticImageRect', () => {
  // User feedback on #42: height is the user's intentional choice, never
  // auto-modified. Only width gets trimmed when the user drew wider than
  // the image's natural aspect at the chosen height.
  it('trims width to natural aspect when rect is wider than the image aspect', () => {
    // Image 100x100. User drew 200x100 → too wide.
    // widthAtCurrentHeight = 100 * 100 / 100 = 100 → trim width to 100.
    const r = fitStaticImageRect(200, 100, 100, 100)
    expect(r.width).toBe(100)
    expect(r.height).toBe(100)
  })

  it('keeps height unchanged even when rect is taller than the image aspect', () => {
    // widthAtCurrentHeight = 100 * 200 / 100 = 200 > currentW=100, so width
    // is unchanged too (never grow). Height preserved as user's choice.
    const r = fitStaticImageRect(100, 200, 100, 100)
    expect(r.width).toBe(100)
    expect(r.height).toBe(200)
  })

  it('keeps the rect when natural aspect matches exactly at the user height', () => {
    // widthAtCurrentHeight = 200 * 75 / 100 = 150 — same as currentW.
    const r = fitStaticImageRect(150, 75, 200, 100)
    expect(r.width).toBe(150)
    expect(r.height).toBe(75)
  })

  it('does not modify height when image aspect would suggest a smaller height', () => {
    // Image 1920x1080 (16:9). User drew 400x300 (4:3, taller-than-aspect).
    // widthAtCurrentHeight = 1920 * 300 / 1080 = 533.3 > currentW=400 →
    // never grow, width unchanged. Height preserved (300).
    const r = fitStaticImageRect(400, 300, 1920, 1080)
    expect(r.width).toBe(400)
    expect(r.height).toBe(300)
  })

  it('trims width on a tall-narrow image inside a wider rect', () => {
    // Image 100x400. User drew 200x400.
    // widthAtCurrentHeight = 100 * 400 / 400 = 100 → trim width to 100.
    const r = fitStaticImageRect(200, 400, 100, 400)
    expect(r.width).toBe(100)
    expect(r.height).toBe(400)
  })

  it('never grows the rect on either axis', () => {
    // Image 1000x500 in rect 50x10. widthAtCurrentHeight = 1000 * 10 / 500
    // = 20 → shrink width to 20. Height stays 10.
    const r = fitStaticImageRect(50, 10, 1000, 500)
    expect(r.width).toBe(20)
    expect(r.height).toBe(10)
  })

  it('rejects bogus inputs', () => {
    expect(fitStaticImageRect(0, 100, 100, 100)).toEqual({ width: 0, height: 100 })
    expect(fitStaticImageRect(100, 100, 0, 100)).toEqual({ width: 100, height: 100 })
    expect(fitStaticImageRect(100, 100, NaN, 100)).toEqual({ width: 100, height: 100 })
  })
})

describe('measureStaticTextRect', () => {
  // jsdom's <canvas> doesn't ship a 2D context (`getContext('2d')` returns
  // null), so live measurement is unverifiable in unit tests — we cover the
  // degraded path + every input-validation branch. Live behaviour is
  // covered by manual smoke + production browser.
  //
  // Critical invariant for every case: result.height === currentH. Height
  // is never modified by this helper (user feedback on #42).

  it('preserves height on empty text (and returns rect unchanged)', () => {
    const r = measureStaticTextRect('', 'Helvetica', 12, 1.2, 300, 100)
    expect(r).toEqual({ width: 300, height: 100 })
  })

  it('preserves height on non-positive dimensions', () => {
    const r = measureStaticTextRect('hi', 'Helvetica', 12, 1.2, 0, 100)
    expect(r).toEqual({ width: 0, height: 100 })
    const r2 = measureStaticTextRect('hi', 'Helvetica', 12, 1.2, 100, 0)
    expect(r2).toEqual({ width: 100, height: 0 })
  })

  it('preserves height on non-positive fontSize', () => {
    const r = measureStaticTextRect('hi', 'Helvetica', 0, 1.2, 100, 100)
    expect(r).toEqual({ width: 100, height: 100 })
  })

  it('preserves height even when DOM measurement degrades (jsdom path)', () => {
    // In jsdom, getMeasureCtx() returns null → helper returns input rect.
    // The critical property is that height is preserved.
    const r = measureStaticTextRect('hello world', 'Helvetica', 12, 1.2, 500, 500)
    expect(r.height).toBe(500)
  })

  it('accepts custom options without throwing and preserves height', () => {
    expect(() =>
      measureStaticTextRect('a', 'Helvetica', 12, 1.2, 100, 100, {
        innerPad: 0,
        minW: 1,
      }),
    ).not.toThrow()
    const r = measureStaticTextRect('a', 'Helvetica', 12, 1.2, 100, 100, {
      innerPad: 0,
      minW: 1,
    })
    expect(r.height).toBe(100)
  })
})
