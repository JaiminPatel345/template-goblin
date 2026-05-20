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
