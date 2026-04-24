/**
 * GH #23 — closing one page must remove exactly one page, never two, for
 * every combination of background types. The previous bug surfaced when
 * the remaining page had an image background and `currentPageId` was set
 * to `null` after the close: the canvas background resolver fell back to
 * the (now empty) legacy `backgroundDataUrl` and the UI looked as if both
 * pages had been deleted.
 *
 * These tests pin the contract at the store level (no browser needed).
 * Every two-page combination (colour × colour, colour × image,
 * image × colour, image × image) is exercised, closing each of the two
 * pages in turn. After the close we assert:
 *   1. Exactly one page remains.
 *   2. The survivor is the one we expected.
 *   3. Its background data is still reachable — for colour pages that
 *      means `backgroundColor` is intact; for image pages that means the
 *      corresponding entry in `pageBackgroundDataUrls` / `pageBackgroundBuffers`
 *      is still present.
 *   4. The reindexed survivor sits at `index: 0`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PageDefinition } from '@template-goblin/types'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

vi.mock('../idbStorage', () => ({
  idbGet: async (key: string) => storage.get(key),
  idbSet: async (key: string, value: string) => {
    storage.set(key, value)
  },
  idbDelete: async (key: string) => {
    storage.delete(key)
  },
  migrateFromLocalStorage: async () => {},
}))

import { useTemplateStore } from '../templateStore'

function state() {
  return useTemplateStore.getState()
}

function makeBuffer(byte: number): ArrayBuffer {
  return new Uint8Array([byte, byte, byte, byte]).buffer
}

type BgKind = 'color' | 'image'

function addPageWithBg(id: string, index: number, kind: BgKind, byteSeed: number): void {
  if (kind === 'color') {
    const page: PageDefinition = {
      id,
      index,
      backgroundType: 'color',
      backgroundColor: `#${byteSeed.toString(16).padStart(2, '0').repeat(3)}`,
      backgroundFilename: null,
    }
    state().addPage(page)
  } else {
    const page: PageDefinition = {
      id,
      index,
      backgroundType: 'image',
      backgroundColor: null,
      backgroundFilename: `backgrounds/${id}.png`,
    }
    state().addPage(page, `data:image/png;base64,${'A'.repeat(byteSeed)}`, makeBuffer(byteSeed))
  }
}

beforeEach(() => {
  storage.clear()
  state().reset()
})

/**
 * Matrix: [firstBg, secondBg, indexClosed, expectedSurvivorId, expectedSurvivorKind]
 *
 * `indexClosed` is 0 or 1 — which page the user clicks ✕ on.
 */
const CASES: Array<[BgKind, BgKind, 0 | 1, string, BgKind]> = [
  ['color', 'color', 0, 'p2', 'color'],
  ['color', 'color', 1, 'p1', 'color'],
  ['color', 'image', 0, 'p2', 'image'],
  ['color', 'image', 1, 'p1', 'color'],
  ['image', 'color', 0, 'p2', 'color'],
  ['image', 'color', 1, 'p1', 'image'],
  ['image', 'image', 0, 'p2', 'image'],
  ['image', 'image', 1, 'p1', 'image'],
]

describe('GH #23 — closing one page never closes two (every bg combination)', () => {
  for (const [firstBg, secondBg, indexClosed, expectedId, expectedKind] of CASES) {
    const name = `first=${firstBg} + second=${secondBg}, close tab ${indexClosed + 1} → ${expectedId}:${expectedKind} remains`
    it(name, () => {
      addPageWithBg('p1', 0, firstBg, 0x11)
      addPageWithBg('p2', 1, secondBg, 0x22)
      expect(state().pages).toHaveLength(2)

      const toClose = indexClosed === 0 ? 'p1' : 'p2'
      state().removePage(toClose)

      expect(state().pages).toHaveLength(1)
      const survivor = state().pages[0]!
      expect(survivor.id).toBe(expectedId)
      expect(survivor.index).toBe(0)
      expect(survivor.backgroundType).toBe(expectedKind)

      if (expectedKind === 'color') {
        expect(survivor.backgroundColor).toMatch(/^#[0-9a-f]{6}$/i)
      } else {
        expect(state().pageBackgroundDataUrls.has(expectedId)).toBe(true)
        expect(state().pageBackgroundBuffers.has(expectedId)).toBe(true)
      }

      // Closed page's bg data must be gone from the maps (no leak).
      expect(state().pageBackgroundDataUrls.has(toClose)).toBe(false)
      expect(state().pageBackgroundBuffers.has(toClose)).toBe(false)
    })
  }
})

/**
 * Three-page variant: closing the middle page leaves exactly two, both at
 * the correct reindexed positions, and none of them are collateral damage.
 */
describe('GH #23 — closing the middle of three pages', () => {
  const THREE_CASES: Array<[BgKind, BgKind, BgKind]> = [
    ['color', 'color', 'color'],
    ['color', 'image', 'color'],
    ['image', 'color', 'image'],
    ['image', 'image', 'image'],
  ]
  for (const [b1, b2, b3] of THREE_CASES) {
    it(`bgs=${b1}/${b2}/${b3}, close middle → pages 1 and 3 remain in order`, () => {
      addPageWithBg('p1', 0, b1, 0x11)
      addPageWithBg('p2', 1, b2, 0x22)
      addPageWithBg('p3', 2, b3, 0x33)

      state().removePage('p2')

      expect(state().pages).toHaveLength(2)
      expect(state().pages.map((p) => p.id)).toEqual(['p1', 'p3'])
      expect(state().pages.map((p) => p.index)).toEqual([0, 1])
      expect(state().pageBackgroundDataUrls.has('p2')).toBe(false)
      expect(state().pageBackgroundBuffers.has('p2')).toBe(false)
    })
  }
})
