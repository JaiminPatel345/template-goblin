/**
 * #112 — per-field validation of the custom Width / Height inputs in the
 * page-size picker. The store's `clampPageDimension` floors silently,
 * which protects state but doesn't tell the user WHY the value is bad.
 * `validateCustomDims` is what the picker + Apply gate use to surface
 * a per-field error before the user clicks through.
 */
import { describe, it, expect } from 'vitest'
import { validateCustomDims } from '../PageSizePicker.js'

describe('validateCustomDims', () => {
  it('accepts canonical A4 dimensions', () => {
    const r = validateCustomDims(595, 842)
    expect(r.widthError).toBeNull()
    expect(r.heightError).toBeNull()
    expect(r.hasError).toBe(false)
  })

  it('accepts the minimum-allowed 1pt dimension', () => {
    const r = validateCustomDims(1, 1)
    expect(r.hasError).toBe(false)
  })

  it.each([
    [-100, 'negative width'],
    [0, 'zero width'],
    [0.5, 'sub-1pt width'],
  ])('rejects width %s (%s) with a min-1pt message', (width) => {
    const r = validateCustomDims(width, 842)
    expect(r.widthError).toMatch(/at least 1 pt/i)
    expect(r.heightError).toBeNull()
    expect(r.hasError).toBe(true)
  })

  it('rejects a negative height while keeping a valid width clean', () => {
    const r = validateCustomDims(595, -50)
    expect(r.widthError).toBeNull()
    expect(r.heightError).toMatch(/at least 1 pt/i)
    expect(r.hasError).toBe(true)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite width %s with a "must be a number" message',
    (value) => {
      const r = validateCustomDims(value, 842)
      expect(r.widthError).toMatch(/must be a number/i)
      expect(r.hasError).toBe(true)
    },
  )

  it('reports BOTH fields when both are invalid', () => {
    const r = validateCustomDims(-1, -1)
    expect(r.widthError).toMatch(/at least 1 pt/i)
    expect(r.heightError).toMatch(/at least 1 pt/i)
    expect(r.hasError).toBe(true)
  })
})
