import { describe, it, expect } from 'vitest'
import type { TableColumn } from '@template-goblin/types'
import {
  computeColumnBoundaries,
  computeHeaderHeight,
  scaledColumnWidths,
} from '../tableCanvasParts.js'

function col(width: number, key = 'k', label = 'L'): TableColumn {
  return { key, label, width, style: null, headerStyle: null }
}

describe('scaledColumnWidths', () => {
  it('returns [] for zero columns', () => {
    expect(scaledColumnWidths([], 200)).toEqual([])
  })

  it('returns [] when totalWidth is non-positive', () => {
    expect(scaledColumnWidths([col(80), col(120)], 0)).toEqual([])
    expect(scaledColumnWidths([col(80), col(120)], -10)).toEqual([])
  })

  it('scales declared widths to fit totalWidth', () => {
    // declared total = 200, totalWidth = 100 → scale 0.5
    expect(scaledColumnWidths([col(80), col(120)], 100)).toEqual([40, 60])
  })

  it('falls back to even split when every declared width is zero', () => {
    // Treats all-zero as "no declaration" so dividers still appear.
    expect(scaledColumnWidths([col(0), col(0), col(0)], 120)).toEqual([40, 40, 40])
  })

  it('treats negative widths as zero', () => {
    // 100 (only positive) + (-50 → 0) → totalDeclared 100, scale = 200/100 = 2
    expect(scaledColumnWidths([col(100), col(-50)], 200)).toEqual([200, 0])
  })
})

describe('computeColumnBoundaries', () => {
  it('returns [] for fewer than 2 columns', () => {
    expect(computeColumnBoundaries([], 200)).toEqual([])
    expect(computeColumnBoundaries([col(100)], 200)).toEqual([])
  })

  it('returns [] when totalWidth is non-positive', () => {
    expect(computeColumnBoundaries([col(50), col(50)], 0)).toEqual([])
    expect(computeColumnBoundaries([col(50), col(50)], -1)).toEqual([])
  })

  it('returns N-1 boundaries for N columns', () => {
    expect(computeColumnBoundaries([col(50), col(50)], 100)).toEqual([50])
    expect(computeColumnBoundaries([col(50), col(50), col(50)], 150)).toEqual([50, 100])
    expect(computeColumnBoundaries([col(50), col(50), col(50), col(50)], 200)).toEqual([
      50, 100, 150,
    ])
  })

  it('scales declared widths to fit totalWidth', () => {
    // declared total = 60, totalWidth = 120 → scale 2 → widths [20, 40, 60]
    // boundaries are cumulative, excluding the last edge → [20, 60]
    expect(computeColumnBoundaries([col(10), col(20), col(30)], 120)).toEqual([20, 60])
  })

  it('uses even split when no column declares a positive width', () => {
    // Even split fallback should still produce the boundaries.
    expect(computeColumnBoundaries([col(0), col(0), col(0)], 120)).toEqual([40, 80])
  })
})

describe('computeHeaderHeight', () => {
  it('returns 0 when showHeader is false', () => {
    expect(computeHeaderHeight(200, false)).toBe(0)
  })

  it('returns 0 for non-positive totalHeight', () => {
    expect(computeHeaderHeight(0, true)).toBe(0)
    expect(computeHeaderHeight(-5, true)).toBe(0)
  })

  it('returns 22% of totalHeight when that exceeds the floor', () => {
    // 22% of 200 = 44, well above the 14pt floor.
    expect(computeHeaderHeight(200, true)).toBe(44)
  })

  it('clamps up to the 14pt minimum on tiny rects', () => {
    // 22% of 50 = 11 → bumped up to 14.
    expect(computeHeaderHeight(50, true)).toBe(14)
  })

  it('caps at totalHeight when the field is smaller than the minimum', () => {
    // For a 10pt-tall rect the header would be 14 (floor) but cap to 10
    // so the divider stays inside the field.
    expect(computeHeaderHeight(10, true)).toBe(10)
  })
})
