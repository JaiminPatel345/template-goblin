/**
 * #61 — regression test for the IDB persist round-trip of header / footer /
 * pageNumber.
 *
 * Bug being pinned: the store's custom `setItem` storage adapter builds a
 * `PersistedState` payload listing each persisted field explicitly. The
 * first cut of #61 added `header`/`footer`/`pageNumber` to the zustand
 * `partialize` block but NOT to that explicit serialisation, so refreshing
 * the editor (which round-trips through `setItem` → IDB → `getItem`) lost
 * every band setting silently. Other fields survived because they were on
 * the explicit list. Test pins both sides of the round-trip.
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

const PERSIST_KEY = 'template-goblin-template'

function makeHeader() {
  return {
    enabled: true,
    style: {
      height: 40,
      backgroundColor: '#f5f5f5',
      divider: { color: '#888888', width: 0.5, gap: 4 },
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 12,
      paddingRight: 12,
    },
    fields: [
      {
        id: 'header-text-1',
        type: 'text' as const,
        label: 'Title',
        groupId: null,
        pageId: null,
        x: 0,
        y: 0,
        width: 200,
        height: 20,
        zIndex: 1,
        source: { mode: 'static' as const, value: 'My Doc' },
        style: {
          fontId: null,
          fontFamily: 'Helvetica',
          fontSize: 10,
          fontSizeMin: 8,
          lineHeight: 1.2,
          fontWeight: 'normal' as const,
          fontStyle: 'normal' as const,
          textDecoration: 'none' as const,
          color: '#000',
          align: 'left' as const,
          verticalAlign: 'middle' as const,
          maxRows: 1,
          overflowMode: 'truncate' as const,
          snapToGrid: true,
        },
      },
    ],
    applyToFirstPage: true,
  }
}

function makeFooter() {
  return {
    enabled: true,
    style: {
      height: 30,
      backgroundColor: null,
      divider: { color: '#888888', width: 0.5, gap: 4 },
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 12,
      paddingRight: 12,
    },
    fields: [],
    applyToFirstPage: false,
  }
}

function makePageNumber() {
  return {
    enabled: true,
    placement: 'footer' as const,
    align: 'center' as const,
    color: '#000',
    numeralStyle: 'arabic' as const,
    fontFamily: 'Helvetica',
    fontSize: 10,
    showOnFirstPage: false,
  }
}

describe('templateStore persist — #61 bands survive a refresh', () => {
  beforeEach(() => {
    storage.clear()
    vi.resetModules()
  })

  it('round-trips header / footer / pageNumber through IDB', async () => {
    const mod = await import('../templateStore')

    // Seed state in-memory: turn on a header band with one text field,
    // a footer band, and the page-number stamp.
    mod.useTemplateStore.getState().setHeader(makeHeader())
    mod.useTemplateStore.getState().setFooter(makeFooter())
    mod.useTemplateStore.getState().setPageNumber(makePageNumber())

    // Zustand schedules the persist write asynchronously; the persist
    // middleware flushes on every set, but the IDB adapter's setItem is
    // async. Drain microtasks before reading from storage.
    await new Promise((r) => setTimeout(r, 0))

    const raw = storage.get(PERSIST_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!) as {
      state: { header?: unknown; footer?: unknown; pageNumber?: unknown }
    }
    expect(parsed.state.header).toBeDefined()
    expect(parsed.state.footer).toBeDefined()
    expect(parsed.state.pageNumber).toBeDefined()

    // Now reset the module + rehydrate from the persisted blob: this is
    // what a browser refresh exercises.
    vi.resetModules()
    const fresh = await import('../templateStore')
    await fresh.useTemplateStore.persist.rehydrate()
    const restored = fresh.useTemplateStore.getState()

    expect(restored.header?.style.height).toBe(40)
    expect(restored.header?.style.divider?.color).toBe('#888888')
    expect(restored.header?.fields).toHaveLength(1)
    expect(restored.header?.fields[0]?.id).toBe('header-text-1')

    expect(restored.footer?.style.height).toBe(30)
    expect(restored.footer?.applyToFirstPage).toBe(false)

    expect(restored.pageNumber?.enabled).toBe(true)
    expect(restored.pageNumber?.placement).toBe('footer')
    expect(restored.pageNumber?.numeralStyle).toBe('arabic')
  })

  it('a refresh with no bands set persists header / footer / pageNumber as undefined', async () => {
    const mod = await import('../templateStore')
    // Touch the store so something gets persisted, but DON'T set bands.
    mod.useTemplateStore.getState().setMeta({ name: 'no-bands' })
    await new Promise((r) => setTimeout(r, 0))

    vi.resetModules()
    const fresh = await import('../templateStore')
    await fresh.useTemplateStore.persist.rehydrate()
    const restored = fresh.useTemplateStore.getState()

    expect(restored.header).toBeUndefined()
    expect(restored.footer).toBeUndefined()
    expect(restored.pageNumber).toBeUndefined()
  })
})
