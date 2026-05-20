/**
 * Defence-in-depth: `setPageSize` and `updatePage` floor width / height at
 * 1pt so a programmatic injection (dev console, stale persisted blob,
 * malicious URL param, ...) can't blank the canvas or crash the renderer
 * with negative / NaN / Infinity dimensions. The UI's HTML `min="1"`
 * attribute already covers normal keyboard input — this is the safety
 * net behind it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

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

import { useTemplateStore } from '../templateStore.js'

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('rehydration — heals poisoned page dimensions (GH #113)', () => {
  /**
   * Pre-existing IDB blobs written before the `setPageSize` clamp landed
   * can carry `width: -100`. Without a hydration-time guard those rehydrate
   * verbatim and crash the canvas. The healer floors every dimension at 1pt.
   */
  it('heals a negative meta.width on read', async () => {
    const poisoned = {
      state: {
        meta: { width: -100, height: 842, name: 'Poison', unit: 'pt' },
        fields: [],
        pages: [],
        groups: [],
        fonts: [],
        staticImages: [],
        backgroundDataUrl: null,
        pageBackgroundDataUrls: [],
        fontBuffers: [],
        placeholderBuffers: [],
        staticImageBuffers: [],
        staticImageDataUrls: [],
      },
      version: 2,
    }
    storage.set('template-goblin-template', JSON.stringify(poisoned))
    await useTemplateStore.persist.rehydrate()
    expect(useTemplateStore.getState().meta.width).toBe(1)
    expect(useTemplateStore.getState().meta.height).toBe(842)
  })

  it('heals a null meta.height on read (NaN becomes null after JSON round-trip)', async () => {
    // A pre-fix `Number.NaN` written to IDB serialises to `null` in JSON,
    // so the realistic poisoned shape is `height: null` — not NaN.
    const poisoned = {
      state: {
        meta: { width: 595, height: null, name: 'Poison', unit: 'pt' },
        fields: [],
        pages: [],
        groups: [],
        fonts: [],
        staticImages: [],
        backgroundDataUrl: null,
        pageBackgroundDataUrls: [],
        fontBuffers: [],
        placeholderBuffers: [],
        staticImageBuffers: [],
        staticImageDataUrls: [],
      },
      version: 2,
    }
    storage.set('template-goblin-template', JSON.stringify(poisoned))
    await useTemplateStore.persist.rehydrate()
    expect(useTemplateStore.getState().meta.height).toBe(1)
  })

  it('heals a negative per-page width on read', async () => {
    const poisoned = {
      state: {
        meta: { width: 595, height: 842, name: 'P', unit: 'pt' },
        fields: [],
        pages: [
          {
            id: 'p0',
            index: 0,
            backgroundType: 'color',
            backgroundColor: '#fff',
            backgroundFilename: null,
            width: -50,
            height: 100,
          },
        ],
        groups: [],
        fonts: [],
        staticImages: [],
        backgroundDataUrl: null,
        pageBackgroundDataUrls: [],
        fontBuffers: [],
        placeholderBuffers: [],
        staticImageBuffers: [],
        staticImageDataUrls: [],
      },
      version: 2,
    }
    storage.set('template-goblin-template', JSON.stringify(poisoned))
    await useTemplateStore.persist.rehydrate()
    const page = useTemplateStore.getState().pages[0]
    expect(page?.width).toBe(1)
    expect(page?.height).toBe(100)
  })

  it('passes valid dimensions through untouched on rehydrate', async () => {
    const healthy = {
      state: {
        meta: { width: 595, height: 842, name: 'P', unit: 'pt' },
        fields: [],
        pages: [],
        groups: [],
        fonts: [],
        staticImages: [],
        backgroundDataUrl: null,
        pageBackgroundDataUrls: [],
        fontBuffers: [],
        placeholderBuffers: [],
        staticImageBuffers: [],
        staticImageDataUrls: [],
      },
      version: 2,
    }
    storage.set('template-goblin-template', JSON.stringify(healthy))
    await useTemplateStore.persist.rehydrate()
    expect(useTemplateStore.getState().meta.width).toBe(595)
    expect(useTemplateStore.getState().meta.height).toBe(842)
  })
})

describe('setPageSize — page dimension clamp', () => {
  it('keeps a valid positive dimension untouched', () => {
    useTemplateStore.getState().setPageSize('A4', 595, 842)
    const m = useTemplateStore.getState().meta
    expect(m.width).toBe(595)
    expect(m.height).toBe(842)
  })

  it.each([
    [-100, 'negative'],
    [0, 'zero'],
    [Number.NaN, 'NaN'],
    [-Number.POSITIVE_INFINITY, '-Infinity'],
  ])('floors %s (%s) width to 1pt', (value) => {
    useTemplateStore.getState().setPageSize('custom', value, 842)
    expect(useTemplateStore.getState().meta.width).toBe(1)
    expect(useTemplateStore.getState().meta.height).toBe(842)
  })

  it('floors a negative height to 1pt while keeping a valid width', () => {
    useTemplateStore.getState().setPageSize('custom', 595, -50)
    const m = useTemplateStore.getState().meta
    expect(m.width).toBe(595)
    expect(m.height).toBe(1)
  })
})

describe('updatePage — per-page dimension clamp', () => {
  it('floors negative per-page width to 1pt', () => {
    useTemplateStore.getState().addPage({
      id: 'p1',
      index: 1,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundFilename: null,
    })
    useTemplateStore.getState().updatePage('p1', { width: -200 })
    const p = useTemplateStore.getState().pages.find((x) => x.id === 'p1')!
    expect(p.width).toBe(1)
  })

  it('passes a valid width through unchanged', () => {
    useTemplateStore.getState().addPage({
      id: 'p1',
      index: 1,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundFilename: null,
    })
    useTemplateStore.getState().updatePage('p1', { width: 420 })
    const p = useTemplateStore.getState().pages.find((x) => x.id === 'p1')!
    expect(p.width).toBe(420)
  })

  it('does not touch unrelated fields in the patch', () => {
    useTemplateStore.getState().addPage({
      id: 'p1',
      index: 1,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundFilename: null,
    })
    useTemplateStore.getState().updatePage('p1', {
      width: -10,
      backgroundColor: '#abcdef',
    })
    const p = useTemplateStore.getState().pages.find((x) => x.id === 'p1')!
    expect(p.width).toBe(1)
    expect(p.backgroundColor).toBe('#abcdef')
  })
})
