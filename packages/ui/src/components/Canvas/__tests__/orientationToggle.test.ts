/**
 * Pure-logic tests for the page orientation helpers (#119). Component-render
 * tests are deferred (no `@testing-library/react`); the Playwright suite
 * covers the visible toggle in the add-page flow.
 */
import { describe, it, expect } from 'vitest'
import { PAGE_SIZE_PRESETS } from '@template-goblin/types'
import { orientationOf, swapDimensions } from '../OrientationToggle.js'

describe('orientationOf', () => {
  it('reports portrait when the page is taller than wide (A4)', () => {
    expect(orientationOf(PAGE_SIZE_PRESETS.A4.width, PAGE_SIZE_PRESETS.A4.height)).toBe('portrait')
  })

  it('reports landscape when the page is wider than tall', () => {
    expect(orientationOf(842, 595)).toBe('landscape')
  })

  it('treats a square page as portrait', () => {
    expect(orientationOf(500, 500)).toBe('portrait')
  })
})

describe('swapDimensions', () => {
  it('swaps width and height', () => {
    expect(swapDimensions(595, 842)).toEqual({ width: 842, height: 595 })
  })

  it('flips orientation portrait → landscape', () => {
    const s = swapDimensions(PAGE_SIZE_PRESETS.A4.width, PAGE_SIZE_PRESETS.A4.height)
    expect(orientationOf(s.width, s.height)).toBe('landscape')
  })

  it('is its own inverse — swapping twice restores the original', () => {
    const once = swapDimensions(595, 842)
    const twice = swapDimensions(once.width, once.height)
    expect(twice).toEqual({ width: 595, height: 842 })
  })
})
