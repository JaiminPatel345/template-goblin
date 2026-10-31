/**
 * Pure-logic tests for the page-size preset-match helpers (#118) — used to
 * tell the user when their custom dimensions equal a known preset.
 */
import { describe, it, expect } from 'vitest'
import { matchPreset, presetMatchLabel } from '../PageSizePicker.js'

describe('matchPreset', () => {
  it('matches A4 in portrait orientation', () => {
    expect(matchPreset(595, 842)).toEqual({ name: 'A4', landscape: false })
  })

  it('matches A4 rotated to landscape', () => {
    expect(matchPreset(842, 595)).toEqual({ name: 'A4', landscape: true })
  })

  it('matches Letter portrait', () => {
    expect(matchPreset(612, 792)).toEqual({ name: 'Letter', landscape: false })
  })

  it('returns null for a genuinely custom size', () => {
    expect(matchPreset(1000, 700)).toBeNull()
  })

  it('returns null for a square page (no preset is square)', () => {
    expect(matchPreset(500, 500)).toBeNull()
  })
})

describe('presetMatchLabel', () => {
  it('labels a portrait match', () => {
    expect(presetMatchLabel(595, 842)).toBe('Same as A4')
  })

  it('labels a landscape match', () => {
    expect(presetMatchLabel(842, 595)).toBe('Same as A4 (landscape)')
  })

  it('is null for a custom size', () => {
    expect(presetMatchLabel(321, 654)).toBeNull()
  })
})
