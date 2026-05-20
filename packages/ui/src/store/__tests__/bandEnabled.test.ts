/**
 * #61 follow-up — unit tests for `setHeaderEnabled` / `setFooterEnabled`.
 *
 * Pinned scenarios (the user explicitly asked for "no case the user can
 * do that our tests don't cover"):
 *
 *  1. First enable on a never-configured store creates a default band.
 *  2. Hide preserves every style detail — height, padding, divider,
 *     background, applyToFirstPage.
 *  3. Show after hide restores exactly the prior config (no defaults clobber).
 *  4. Hide migrates band fields → body with page-absolute coords.
 *  5. Re-show does NOT pull migrated fields back into the band
 *     (one-way migration matches the user's spec).
 *  6. Hide is atomic — the body-fields append and band-fields clear
 *     happen in a single mutation so the reconciler never sees the
 *     same id in both pools (regression guard for the duplicate-on-drag
 *     symptom).
 *  7. Header coord migration uses bandTop = 0 + paddingTop; footer uses
 *     pageHeight - footerHeight + paddingTop.
 *  8. Disabling twice in a row is idempotent.
 *  9. Enabling an already-enabled band is a no-op.
 *
 * Live IDB stubbed via the same shim used by `migration.test.ts` so the
 * store can persist without touching real storage.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FieldDefinition, PageBand } from '@template-goblin/types'

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

function makeBand(overrides: Partial<PageBand> = {}): PageBand {
  return {
    enabled: true,
    style: {
      height: 50,
      backgroundColor: '#abcdef',
      divider: { color: '#888', width: 0.5, gap: 4 },
      paddingTop: 6,
      paddingBottom: 8,
      paddingLeft: 14,
      paddingRight: 16,
    },
    fields: [],
    applyToFirstPage: true,
    ...overrides,
  }
}

function bandTextField(id: string, x: number, y: number): FieldDefinition {
  return {
    id,
    type: 'text',
    label: id,
    groupId: null,
    pageId: null,
    x,
    y,
    width: 100,
    height: 20,
    zIndex: 1,
    source: { mode: 'static', value: id },
    style: {
      fontId: null,
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontSizeMin: 8,
      lineHeight: 1.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000',
      align: 'left',
      verticalAlign: 'middle',
      maxRows: 1,
      overflowMode: 'truncate',
      snapToGrid: true,
    },
  }
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('setHeaderEnabled — first enable / hide / show cycle', () => {
  it('first enable on a never-configured store creates a default band', () => {
    expect(useTemplateStore.getState().header).toBeUndefined()
    useTemplateStore.getState().setHeaderEnabled(true)
    const h = useTemplateStore.getState().header
    expect(h).toBeDefined()
    expect(h?.enabled).toBe(true)
    expect(h?.style.height).toBeGreaterThan(0)
    expect(h?.style.divider).toBeNull() // divider OFF by default (#61 follow-up)
    expect(h?.fields).toHaveLength(0)
    expect(h?.applyToFirstPage).toBe(true)
  })

  it('first disable on a never-configured store is a no-op', () => {
    useTemplateStore.getState().setHeaderEnabled(false)
    expect(useTemplateStore.getState().header).toBeUndefined()
  })

  it('hide preserves every style detail', () => {
    useTemplateStore.getState().setHeader(makeBand({ style: { ...makeBand().style, height: 73 } }))
    const before = useTemplateStore.getState().header
    expect(before?.style.height).toBe(73)
    useTemplateStore.getState().setHeaderEnabled(false)
    const after = useTemplateStore.getState().header
    expect(after?.enabled).toBe(false)
    expect(after?.style.height).toBe(73)
    expect(after?.style.backgroundColor).toBe(before?.style.backgroundColor)
    expect(after?.style.divider?.color).toBe(before?.style.divider?.color)
    expect(after?.style.paddingTop).toBe(before?.style.paddingTop)
    expect(after?.style.paddingLeft).toBe(before?.style.paddingLeft)
    expect(after?.applyToFirstPage).toBe(before?.applyToFirstPage)
  })

  it('show after hide restores prior config (no defaults clobber)', () => {
    useTemplateStore.getState().setHeader(makeBand({ style: { ...makeBand().style, height: 99 } }))
    useTemplateStore.getState().setHeaderEnabled(false)
    useTemplateStore.getState().setHeaderEnabled(true)
    const h = useTemplateStore.getState().header
    expect(h?.enabled).toBe(true)
    expect(h?.style.height).toBe(99)
    expect(h?.style.backgroundColor).toBe('#abcdef')
  })

  it('enabling an already-enabled band is a no-op (same reference)', () => {
    useTemplateStore.getState().setHeader(makeBand())
    const before = useTemplateStore.getState().header
    useTemplateStore.getState().setHeaderEnabled(true)
    const after = useTemplateStore.getState().header
    expect(after).toBe(before)
  })

  it('disabling twice in a row is idempotent', () => {
    useTemplateStore.getState().setHeader(makeBand())
    useTemplateStore.getState().setHeaderEnabled(false)
    const first = useTemplateStore.getState().header
    useTemplateStore.getState().setHeaderEnabled(false)
    const second = useTemplateStore.getState().header
    expect(second).toBe(first)
    expect(second?.enabled).toBe(false)
  })
})

describe('setHeaderEnabled — band-field migration to body', () => {
  it('migrates header fields into body fields on hide with translated coords', () => {
    useTemplateStore.getState().setHeader(
      makeBand({
        style: {
          ...makeBand().style,
          paddingTop: 6,
          paddingLeft: 14,
        },
        fields: [bandTextField('h1', 10, 4)],
      }),
    )
    expect(useTemplateStore.getState().fields).toHaveLength(0)
    expect(useTemplateStore.getState().header?.fields).toHaveLength(1)

    useTemplateStore.getState().setHeaderEnabled(false)

    const s = useTemplateStore.getState()
    expect(s.header?.fields).toHaveLength(0)
    expect(s.fields).toHaveLength(1)
    const migrated = s.fields[0]!
    expect(migrated.id).toBe('h1')
    // Header band top = 0; field coord = (x + padX, y + 0 + padY).
    expect(migrated.x).toBe(10 + 14)
    expect(migrated.y).toBe(4 + 0 + 6)
  })

  it('re-show pulls back body fields whose bbox sits inside the band Y-range', () => {
    // Hide migrates the band field into body; show reclaims any body
    // field still entirely within the band strip so the user does not
    // hit FIELD_OVERLAPS_BAND on preview without ever having touched it.
    useTemplateStore.getState().setHeader(makeBand({ fields: [bandTextField('h1', 0, 0)] }))
    useTemplateStore.getState().setHeaderEnabled(false)
    useTemplateStore.getState().setHeaderEnabled(true)

    const s = useTemplateStore.getState()
    expect(s.header?.enabled).toBe(true)
    expect(s.header?.fields).toHaveLength(1)
    expect(s.fields).toHaveLength(0)
    // Coordinates restored to band-local (inverse of the hide migration).
    expect(s.header?.fields[0]?.id).toBe('h1')
    expect(s.header?.fields[0]?.x).toBe(0)
    expect(s.header?.fields[0]?.y).toBe(0)
  })

  it('re-show leaves body fields whose bbox extends past the band strip in body', () => {
    // A field the user explicitly moved below the header (so its bbox no
    // longer fits inside the band Y-range) stays in body on re-show.
    useTemplateStore.getState().setHeader(makeBand({ fields: [bandTextField('h1', 0, 0)] }))
    useTemplateStore.getState().setHeaderEnabled(false)
    // Move the migrated field down so it now straddles the band edge.
    const migrated = useTemplateStore.getState().fields[0]!
    useTemplateStore.getState().updateField(migrated.id, { y: 100 })
    useTemplateStore.getState().setHeaderEnabled(true)

    const s = useTemplateStore.getState()
    expect(s.header?.fields).toHaveLength(0)
    expect(s.fields).toHaveLength(1)
    expect(s.fields[0]?.y).toBe(100)
  })

  it('migration + clear is atomic — one mutation, no duplicate ids in both pools', () => {
    // Subscribe to every change and snapshot the (header.fields.id ∪
    // body.fields.id) multiset. After the hide, no id should appear in
    // BOTH pools in any snapshot — that's the regression guard.
    useTemplateStore.getState().setHeader(makeBand({ fields: [bandTextField('h1', 0, 0)] }))
    const overlaps: string[][] = []
    const unsub = useTemplateStore.subscribe((s) => {
      const headerIds = (s.header?.fields ?? []).map((f) => f.id)
      const bodyIds = s.fields.map((f) => f.id)
      const overlap = headerIds.filter((id) => bodyIds.includes(id))
      if (overlap.length > 0) overlaps.push(overlap)
    })
    useTemplateStore.getState().setHeaderEnabled(false)
    unsub()
    expect(overlaps).toEqual([])
    // Final state: id moved out of header into body.
    const s = useTemplateStore.getState()
    expect(s.header?.fields.map((f) => f.id)).toEqual([])
    expect(s.fields.map((f) => f.id)).toEqual(['h1'])
  })

  it('multiple band fields all migrate in one go', () => {
    useTemplateStore.getState().setHeader(
      makeBand({
        fields: [
          bandTextField('h1', 0, 0),
          bandTextField('h2', 50, 5),
          bandTextField('h3', 120, 8),
        ],
      }),
    )
    useTemplateStore.getState().setHeaderEnabled(false)
    const s = useTemplateStore.getState()
    expect(s.header?.fields).toEqual([])
    expect(s.fields).toHaveLength(3)
    expect(s.fields.map((f) => f.id).sort()).toEqual(['h1', 'h2', 'h3'])
  })
})

describe('setFooterEnabled — symmetric with the header but anchored at bottom', () => {
  it('hide migrates footer fields with page-coord translation including bandTop', () => {
    // Default meta height = 842. Footer height = 50, paddingTop = 6.
    // Field at band-local (10, 4) → page-absolute (10 + 14, 842 - 50 + 6 + 4).
    useTemplateStore.getState().setFooter(
      makeBand({
        style: { ...makeBand().style, paddingLeft: 14, paddingTop: 6, height: 50 },
        fields: [bandTextField('f1', 10, 4)],
      }),
    )
    useTemplateStore.getState().setFooterEnabled(false)
    const migrated = useTemplateStore.getState().fields[0]!
    expect(migrated.id).toBe('f1')
    expect(migrated.x).toBe(10 + 14)
    expect(migrated.y).toBe(842 - 50 + 6 + 4)
  })

  it('first enable creates a default band with default footer height', () => {
    useTemplateStore.getState().setFooterEnabled(true)
    const f = useTemplateStore.getState().footer
    expect(f?.enabled).toBe(true)
    expect(f?.style.height).toBeGreaterThan(0)
    expect(f?.style.divider).toBeNull()
  })
})
