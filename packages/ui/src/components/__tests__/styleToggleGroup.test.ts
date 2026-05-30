/**
 * #167 — pure-logic coverage for the B / I / U / S toggle group. The
 * rendering is exercised by Playwright; here we pin the patch semantics
 * that all three surfaces (panel, ribbon, floating toolbar) depend on.
 */
import { describe, it, expect } from 'vitest'
import {
  isStyleToggleActive,
  styleTogglePatch,
  type StyleToggleState,
} from '../StyleToggleGroup.js'

const PLAIN: StyleToggleState = {
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
}

describe('isStyleToggleActive', () => {
  it('reads each glyph off the matching style field', () => {
    expect(isStyleToggleActive('bold', { ...PLAIN, fontWeight: 'bold' })).toBe(true)
    expect(isStyleToggleActive('italic', { ...PLAIN, fontStyle: 'italic' })).toBe(true)
    expect(isStyleToggleActive('underline', { ...PLAIN, textDecoration: 'underline' })).toBe(true)
    expect(isStyleToggleActive('strike', { ...PLAIN, textDecoration: 'line-through' })).toBe(true)
  })

  it('is false on a plain style', () => {
    for (const key of ['bold', 'italic', 'underline', 'strike'] as const) {
      expect(isStyleToggleActive(key, PLAIN)).toBe(false)
    }
  })
})

describe('styleTogglePatch', () => {
  it('turns bold on and off', () => {
    expect(styleTogglePatch('bold', PLAIN)).toEqual({ fontWeight: 'bold' })
    expect(styleTogglePatch('bold', { ...PLAIN, fontWeight: 'bold' })).toEqual({
      fontWeight: 'normal',
    })
  })

  it('turns italic on and off', () => {
    expect(styleTogglePatch('italic', PLAIN)).toEqual({ fontStyle: 'italic' })
    expect(styleTogglePatch('italic', { ...PLAIN, fontStyle: 'italic' })).toEqual({
      fontStyle: 'normal',
    })
  })

  it('turns underline on and off', () => {
    expect(styleTogglePatch('underline', PLAIN)).toEqual({ textDecoration: 'underline' })
    expect(styleTogglePatch('underline', { ...PLAIN, textDecoration: 'underline' })).toEqual({
      textDecoration: 'none',
    })
  })

  it('turns strikethrough on and off', () => {
    expect(styleTogglePatch('strike', PLAIN)).toEqual({ textDecoration: 'line-through' })
    expect(styleTogglePatch('strike', { ...PLAIN, textDecoration: 'line-through' })).toEqual({
      textDecoration: 'none',
    })
  })

  it('makes underline and strikethrough mutually exclusive (they share textDecoration)', () => {
    // From underline, clicking S replaces the decoration rather than stacking.
    const fromUnderline = styleTogglePatch('strike', { ...PLAIN, textDecoration: 'underline' })
    expect(fromUnderline).toEqual({ textDecoration: 'line-through' })

    // From strikethrough, clicking U does the inverse.
    const fromStrike = styleTogglePatch('underline', { ...PLAIN, textDecoration: 'line-through' })
    expect(fromStrike).toEqual({ textDecoration: 'underline' })
  })

  it('does not touch unrelated style fields', () => {
    expect(styleTogglePatch('bold', PLAIN)).not.toHaveProperty('fontStyle')
    expect(styleTogglePatch('bold', PLAIN)).not.toHaveProperty('textDecoration')
  })
})
