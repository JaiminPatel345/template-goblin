import { describe, it, expect } from 'vitest'
import type { PageDefinition } from '@template-goblin/types'
import { snapshotSameAsPrevious } from '../pageSnapshot.js'

function page(id: string, index: number, overrides: Partial<PageDefinition> = {}): PageDefinition {
  return {
    id,
    index,
    backgroundType: 'color',
    backgroundColor: '#ffffff',
    backgroundFilename: null,
    ...overrides,
  }
}

describe('snapshotSameAsPrevious (BUG-F regression)', () => {
  it('copies a color background by value, not by reference', () => {
    const pages: PageDefinition[] = [
      page('p0', 0, { backgroundType: 'color', backgroundColor: '#abcdef' }),
    ]
    const result = snapshotSameAsPrevious(pages, 'p1', 1)
    expect(result.page.backgroundType).toBe('color')
    expect(result.page.backgroundColor).toBe('#abcdef')
    expect(result.page.backgroundFilename).toBeNull()
    expect(result.sourceId).toBe('p0')
  })

  it('copies an image background with a fresh filename', () => {
    const pages: PageDefinition[] = [
      page('p0', 0, {
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/p0.png',
      }),
    ]
    const result = snapshotSameAsPrevious(pages, 'p1', 1)
    expect(result.page.backgroundType).toBe('image')
    expect(result.page.backgroundFilename).toBe('backgrounds/p1.png')
    expect(result.page.backgroundColor).toBeNull()
    expect(result.sourceId).toBe('p0')
  })

  it('BUG-F: mid-chain page removal does NOT retroactively change later pages', () => {
    // Scenario from the user's bug report:
    //   p1 (color X) → p2 (color Y) → p3 (same-as-previous, snapshotted from Y)
    // Then delete p2. The old p3 (now at index 1) must still render Y, not X.
    const p1 = page('p1', 0, { backgroundType: 'color', backgroundColor: '#ff0000' })
    const p2 = page('p2', 1, { backgroundType: 'color', backgroundColor: '#00ff00' })
    const p3Snapshot = snapshotSameAsPrevious([p1, p2], 'p3', 2).page
    expect(p3Snapshot.backgroundType).toBe('color')
    expect(p3Snapshot.backgroundColor).toBe('#00ff00')

    // Simulate removing p2 and re-indexing; p3 becomes index 1.
    const afterRemoval = [p1, { ...p3Snapshot, index: 1 }]
    expect(afterRemoval[1]?.backgroundColor).toBe('#00ff00')
    // The snapshot is by value — p1's color is not consulted.
    expect(afterRemoval[1]?.backgroundColor).not.toBe('#ff0000')
  })

  it('walks past any existing inherit entries to find the nearest concrete page', () => {
    // If somehow an old persisted state still has `inherit` entries (e.g.
    // from a pre-fix session), the walk still resolves to a concrete source.
    const p1 = page('p1', 0, { backgroundType: 'color', backgroundColor: '#123456' })
    const pInherit: PageDefinition = {
      id: 'pI',
      index: 1,
      backgroundType: 'inherit',
      backgroundColor: null,
      backgroundFilename: null,
    }
    const result = snapshotSameAsPrevious([p1, pInherit], 'p2', 2)
    expect(result.page.backgroundType).toBe('color')
    expect(result.page.backgroundColor).toBe('#123456')
    expect(result.sourceId).toBe('p1')
  })

  it('falls back to white when the pages array is empty', () => {
    const result = snapshotSameAsPrevious([], 'p0', 0)
    expect(result.page.backgroundType).toBe('color')
    expect(result.page.backgroundColor).toBe('#ffffff')
    expect(result.sourceId).toBeNull()
  })

  it('falls back to white when every previous page is inherit (unresolvable chain)', () => {
    const pInheritOnly: PageDefinition = {
      id: 'pI',
      index: 0,
      backgroundType: 'inherit',
      backgroundColor: null,
      backgroundFilename: null,
    }
    const result = snapshotSameAsPrevious([pInheritOnly], 'p1', 1)
    expect(result.page.backgroundType).toBe('color')
    expect(result.page.backgroundColor).toBe('#ffffff')
    expect(result.sourceId).toBeNull()
  })

  it('defaults color to #ffffff when the source page has a null backgroundColor', () => {
    const pNullColor = page('p0', 0, {
      backgroundType: 'color',
      backgroundColor: null,
    })
    const result = snapshotSameAsPrevious([pNullColor], 'p1', 1)
    expect(result.page.backgroundColor).toBe('#ffffff')
  })
})
