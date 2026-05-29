/**
 * Unit tests for #109's rect-containment helper.
 */
import { describe, it, expect } from 'vitest'
import { rectFullyContains, selectFullyContainedFieldIds } from '../marqueeContains.js'

describe('rectFullyContains', () => {
  const outer = { x: 0, y: 0, width: 100, height: 100 }

  it('returns true when inner is strictly inside', () => {
    expect(rectFullyContains(outer, { x: 10, y: 10, width: 20, height: 20 })).toBe(true)
  })

  it('returns true when inner edges touch outer edges (contact = contained)', () => {
    expect(rectFullyContains(outer, { x: 0, y: 0, width: 100, height: 100 })).toBe(true)
  })

  it('returns false when inner extends past the right edge', () => {
    expect(rectFullyContains(outer, { x: 50, y: 10, width: 60, height: 20 })).toBe(false)
  })

  it('returns false when inner extends past the bottom edge', () => {
    expect(rectFullyContains(outer, { x: 10, y: 80, width: 20, height: 30 })).toBe(false)
  })

  it('returns false when inner starts to the left of outer', () => {
    expect(rectFullyContains(outer, { x: -5, y: 10, width: 20, height: 20 })).toBe(false)
  })

  it('returns false when inner starts above outer', () => {
    expect(rectFullyContains(outer, { x: 10, y: -5, width: 20, height: 20 })).toBe(false)
  })

  it('returns false when inner only partially overlaps', () => {
    expect(rectFullyContains(outer, { x: 90, y: 10, width: 20, height: 20 })).toBe(false)
  })

  it('returns false when inner is completely outside', () => {
    expect(rectFullyContains(outer, { x: 200, y: 200, width: 20, height: 20 })).toBe(false)
  })

  it('handles a zero-size inner rect — degenerate but still contained when inside', () => {
    expect(rectFullyContains(outer, { x: 50, y: 50, width: 0, height: 0 })).toBe(true)
  })
})

describe('selectFullyContainedFieldIds', () => {
  const fields = [
    { id: 'a', x: 10, y: 10, width: 20, height: 20 }, // fully inside
    { id: 'b', x: 90, y: 10, width: 20, height: 20 }, // partial overlap (right)
    { id: 'c', x: 200, y: 200, width: 20, height: 20 }, // fully outside
    { id: 'd', x: 0, y: 0, width: 100, height: 100 }, // exact match
  ]

  it('returns ids of fully-contained fields only', () => {
    const marquee = { x: 0, y: 0, width: 100, height: 100 }
    expect(selectFullyContainedFieldIds(marquee, fields).sort()).toEqual(['a', 'd'])
  })

  it('returns an empty array when nothing is contained', () => {
    const marquee = { x: 500, y: 500, width: 10, height: 10 }
    expect(selectFullyContainedFieldIds(marquee, fields)).toEqual([])
  })

  it('returns every id when the marquee swallows the whole canvas', () => {
    const marquee = { x: -1000, y: -1000, width: 5000, height: 5000 }
    expect(selectFullyContainedFieldIds(marquee, fields).sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('partial overlap on the right boundary is rejected', () => {
    const marquee = { x: 0, y: 0, width: 95, height: 100 }
    expect(selectFullyContainedFieldIds(marquee, fields)).toEqual(['a'])
  })
})
