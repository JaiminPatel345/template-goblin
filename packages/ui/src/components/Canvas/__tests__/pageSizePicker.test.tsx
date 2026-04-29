/**
 * Pure-logic tests for `PageSizePicker.resolveChoice`. Component-render
 * tests for the AddPageDialog two-step flow are deferred — `@testing-
 * library/react` isn't a current dependency, and adding it for one test is
 * out of scope for this PR. The Playwright suite covers the visible flow
 * end-to-end (`add-page-flow.spec.ts`).
 */
import { describe, it, expect } from 'vitest'
import { PAGE_SIZE_PRESETS } from '@template-goblin/types'
import { resolveChoice } from '../PageSizePicker.js'

describe('PageSizePicker.resolveChoice', () => {
  it('returns the previous size when choice is "previous" and previousSize is supplied', () => {
    const r = resolveChoice('previous', 0, 0, { width: 595, height: 842 })
    expect(r).toEqual({ pageSize: 'custom', width: 595, height: 842 })
  })

  it('falls back to A4 when choice is "previous" but no previousSize is given', () => {
    const r = resolveChoice('previous', 0, 0)
    expect(r).toEqual({ pageSize: 'A4', ...PAGE_SIZE_PRESETS.A4 })
  })

  it('honours custom dimensions when choice is "custom"', () => {
    const r = resolveChoice('custom', 1200, 800)
    expect(r).toEqual({ pageSize: 'custom', width: 1200, height: 800 })
  })

  it('resolves preset choices to PAGE_SIZE_PRESETS values', () => {
    expect(resolveChoice('A3', 0, 0)).toEqual({ pageSize: 'A3', ...PAGE_SIZE_PRESETS.A3 })
    expect(resolveChoice('A5', 0, 0)).toEqual({ pageSize: 'A5', ...PAGE_SIZE_PRESETS.A5 })
    expect(resolveChoice('Letter', 0, 0)).toEqual({
      pageSize: 'Letter',
      ...PAGE_SIZE_PRESETS.Letter,
    })
    expect(resolveChoice('Legal', 0, 0)).toEqual({
      pageSize: 'Legal',
      ...PAGE_SIZE_PRESETS.Legal,
    })
  })
})
