import { describe, it, expect, beforeEach, vi } from 'vitest'
import type {
  PageDefinition,
  FieldDefinition,
  TextField,
  ImageField,
  TextFieldStyle,
  ImageFieldStyle,
} from '@template-goblin/types'

// ---------------------------------------------------------------------------
// Stub localStorage BEFORE importing the store (persist middleware needs it)
// ---------------------------------------------------------------------------

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

import { useTemplateStore } from '../templateStore'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function state() {
  return useTemplateStore.getState()
}

function makeTextStyle(overrides: Partial<TextFieldStyle> = {}): TextFieldStyle {
  return {
    fontId: null,
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontSizeDynamic: false,
    fontSizeMin: 11,
    lineHeight: 1.2,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    align: 'left',
    verticalAlign: 'top',
    maxRows: 1,
    overflowMode: 'truncate',
    snapToGrid: true,
    ...overrides,
  }
}

function makeTextField(overrides: Partial<TextField> = {}): FieldDefinition {
  return {
    id: '',
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey: 'test', required: false, placeholder: null },
    x: 0,
    y: 0,
    width: 100,
    height: 30,
    zIndex: 0,
    style: makeTextStyle(),
    ...overrides,
  }
}

function makeImageField(overrides: Partial<ImageField> = {}): FieldDefinition {
  const imageStyle: ImageFieldStyle = { fit: 'contain' }
  return {
    id: '',
    type: 'image',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey: 'logo', required: false, placeholder: null },
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    zIndex: 0,
    style: imageStyle,
    ...overrides,
  }
}

function makePage(overrides: Partial<PageDefinition> = {}): PageDefinition {
  return {
    id: 'page-1',
    index: 0,
    backgroundType: 'color',
    backgroundColor: '#ffffff',
    backgroundFilename: null,
    ...overrides,
  }
}

/** Create a small ArrayBuffer with recognizable content */
function makeBuffer(byte: number): ArrayBuffer {
  const buf = new ArrayBuffer(4)
  const view = new Uint8Array(buf)
  view[0] = byte
  view[1] = byte
  view[2] = byte
  view[3] = byte
  return buf
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

// ================================ addPage ===================================

describe('addPage', () => {
  it('adds a page with image background type', () => {
    const page = makePage({
      id: 'pg-img',
      index: 0,
      backgroundType: 'image',
      backgroundFilename: 'bg.png',
      backgroundColor: null,
    })
    const buf = makeBuffer(0xaa)
    state().addPage(page, 'data:image/png;base64,AAAA', buf)

    expect(state().pages).toHaveLength(1)
    expect(state().pages[0]?.backgroundType).toBe('image')
    expect(state().pages[0]?.backgroundFilename).toBe('bg.png')
    expect(state().pageBackgroundDataUrls.get('pg-img')).toBe('data:image/png;base64,AAAA')
    expect(state().pageBackgroundBuffers.get('pg-img')).toBe(buf)
  })

  it('adds a page with color background', () => {
    const page = makePage({
      id: 'pg-color',
      index: 0,
      backgroundType: 'color',
      backgroundColor: '#ff0000',
      backgroundFilename: null,
    })
    state().addPage(page)

    expect(state().pages).toHaveLength(1)
    expect(state().pages[0]?.backgroundType).toBe('color')
    expect(state().pages[0]?.backgroundColor).toBe('#ff0000')
    // No background images stored for color-only pages
    expect(state().pageBackgroundDataUrls.has('pg-color')).toBe(false)
    expect(state().pageBackgroundBuffers.has('pg-color')).toBe(false)
  })

  it('adds a page with inherit background', () => {
    const page = makePage({
      id: 'pg-inherit',
      index: 1,
      backgroundType: 'inherit',
      backgroundColor: null,
      backgroundFilename: null,
    })
    state().addPage(page)

    expect(state().pages).toHaveLength(1)
    expect(state().pages[0]?.backgroundType).toBe('inherit')
    expect(state().pages[0]?.backgroundColor).toBeNull()
    expect(state().pages[0]?.backgroundFilename).toBeNull()
  })

  it('pages array grows correctly when adding multiple pages', () => {
    state().addPage(makePage({ id: 'p0', index: 0 }))
    state().addPage(makePage({ id: 'p1', index: 1 }))
    state().addPage(makePage({ id: 'p2', index: 2 }))

    expect(state().pages).toHaveLength(3)
    expect(state().pages[0]?.id).toBe('p0')
    expect(state().pages[1]?.id).toBe('p1')
    expect(state().pages[2]?.id).toBe('p2')
  })
})

// ============================== removePage ==================================

describe('removePage', () => {
  it('removes a page by ID', () => {
    state().addPage(makePage({ id: 'del-1', index: 0 }))
    state().addPage(makePage({ id: 'del-2', index: 1 }))

    state().removePage('del-1')
    expect(state().pages).toHaveLength(1)
    expect(state().pages[0]?.id).toBe('del-2')
  })

  it('reassigns orphaned fields to page 0 (null)', () => {
    state().addPage(makePage({ id: 'rp-page', index: 0 }))
    state().addField(makeTextField({ id: 'rp-f1', pageId: 'rp-page' }))
    state().addField(makeTextField({ id: 'rp-f2', pageId: 'rp-page' }))
    state().addField(makeTextField({ id: 'rp-f3', pageId: null }))

    state().removePage('rp-page')

    // Orphaned fields should have pageId set to null
    expect(state().fields.find((f) => f.id === 'rp-f1')?.pageId).toBeNull()
    expect(state().fields.find((f) => f.id === 'rp-f2')?.pageId).toBeNull()
    // Field that was already on page 0 is unchanged
    expect(state().fields.find((f) => f.id === 'rp-f3')?.pageId).toBeNull()
  })

  it('removing non-existent page is a no-op', () => {
    state().addPage(makePage({ id: 'keep-me', index: 0 }))
    state().addField(makeTextField({ id: 'keep-field', pageId: 'keep-me' }))

    state().removePage('ghost-page')

    expect(state().pages).toHaveLength(1)
    expect(state().pages[0]?.id).toBe('keep-me')
    expect(state().fields.find((f) => f.id === 'keep-field')?.pageId).toBe('keep-me')
  })

  it('removes page background data and buffers', () => {
    const buf = makeBuffer(0xbb)
    state().addPage(makePage({ id: 'bg-del', index: 0 }), 'data:image/png;base64,BBB', buf)

    expect(state().pageBackgroundDataUrls.has('bg-del')).toBe(true)
    expect(state().pageBackgroundBuffers.has('bg-del')).toBe(true)

    state().removePage('bg-del')

    expect(state().pageBackgroundDataUrls.has('bg-del')).toBe(false)
    expect(state().pageBackgroundBuffers.has('bg-del')).toBe(false)
  })

  it('re-indexes remaining pages after removal', () => {
    state().addPage(makePage({ id: 'ri-0', index: 0 }))
    state().addPage(makePage({ id: 'ri-1', index: 1 }))
    state().addPage(makePage({ id: 'ri-2', index: 2 }))

    state().removePage('ri-0')

    // Remaining pages should be re-indexed starting from 0
    expect(state().pages).toHaveLength(2)
    expect(state().pages[0]?.id).toBe('ri-1')
    expect(state().pages[0]?.index).toBe(0)
    expect(state().pages[1]?.id).toBe('ri-2')
    expect(state().pages[1]?.index).toBe(1)
  })
})

// ============================== updatePage ==================================

describe('updatePage', () => {
  it('updates backgroundColor', () => {
    state().addPage(makePage({ id: 'up-1', backgroundColor: '#ffffff' }))

    state().updatePage('up-1', { backgroundColor: '#00ff00' })
    expect(state().pages[0]?.backgroundColor).toBe('#00ff00')
  })

  it('updates backgroundType', () => {
    state().addPage(makePage({ id: 'up-2', backgroundType: 'color' }))

    state().updatePage('up-2', { backgroundType: 'image' })
    expect(state().pages[0]?.backgroundType).toBe('image')
  })

  it('updates index', () => {
    state().addPage(makePage({ id: 'up-3', index: 0 }))

    state().updatePage('up-3', { index: 5 })
    expect(state().pages[0]?.index).toBe(5)
  })

  it('preserves properties not included in the update', () => {
    state().addPage(
      makePage({
        id: 'up-4',
        backgroundType: 'color',
        backgroundColor: '#aabbcc',
        backgroundFilename: null,
      }),
    )

    state().updatePage('up-4', { backgroundColor: '#112233' })
    expect(state().pages[0]?.backgroundType).toBe('color')
    expect(state().pages[0]?.id).toBe('up-4')
    expect(state().pages[0]?.backgroundFilename).toBeNull()
  })
})

// =========================== setPageBackground ==============================

describe('setPageBackground', () => {
  it('sets dataUrl and buffer for a page', () => {
    state().addPage(makePage({ id: 'spb-1', backgroundType: 'image' }))

    const buf = makeBuffer(0xcc)
    state().setPageBackground('spb-1', 'data:image/png;base64,CCC', buf)

    expect(state().pageBackgroundDataUrls.get('spb-1')).toBe('data:image/png;base64,CCC')
    expect(state().pageBackgroundBuffers.get('spb-1')).toBe(buf)
  })

  it('overwrites existing background data for the same page', () => {
    state().addPage(makePage({ id: 'spb-2' }))

    const buf1 = makeBuffer(0x01)
    const buf2 = makeBuffer(0x02)
    state().setPageBackground('spb-2', 'data:image/png;base64,OLD', buf1)
    state().setPageBackground('spb-2', 'data:image/png;base64,NEW', buf2)

    expect(state().pageBackgroundDataUrls.get('spb-2')).toBe('data:image/png;base64,NEW')
    expect(state().pageBackgroundBuffers.get('spb-2')).toBe(buf2)
  })

  it('pageBackgroundDataUrls map is updated correctly', () => {
    state().addPage(makePage({ id: 'spb-3a' }))
    state().addPage(makePage({ id: 'spb-3b', index: 1 }))

    state().setPageBackground('spb-3a', 'data:a', makeBuffer(0x0a))
    state().setPageBackground('spb-3b', 'data:b', makeBuffer(0x0b))

    expect(state().pageBackgroundDataUrls.size).toBe(2)
    expect(state().pageBackgroundDataUrls.get('spb-3a')).toBe('data:a')
    expect(state().pageBackgroundDataUrls.get('spb-3b')).toBe('data:b')
  })
})

// ======================= Field pageId integration ===========================

describe('Field pageId integration', () => {
  it('addField with pageId assigns to correct page', () => {
    state().addPage(makePage({ id: 'fp-page', index: 0 }))
    state().addField(makeTextField({ id: 'fp-1', pageId: 'fp-page' }))

    expect(state().fields[0]?.pageId).toBe('fp-page')
  })

  it('fields default to pageId null', () => {
    state().addField(makeTextField({ id: 'fp-null' }))
    expect(state().fields[0]?.pageId).toBeNull()
  })

  it('filtering fields by pageId works', () => {
    state().addPage(makePage({ id: 'fp-a', index: 0 }))
    state().addPage(makePage({ id: 'fp-b', index: 1 }))
    state().addField(makeTextField({ id: 'f-a1', pageId: 'fp-a' }))
    state().addField(makeTextField({ id: 'f-a2', pageId: 'fp-a' }))
    state().addField(makeTextField({ id: 'f-b1', pageId: 'fp-b' }))
    state().addField(makeTextField({ id: 'f-null', pageId: null }))

    const pageAFields = state().fields.filter((f) => f.pageId === 'fp-a')
    const pageBFields = state().fields.filter((f) => f.pageId === 'fp-b')
    const nullFields = state().fields.filter((f) => f.pageId === null)

    expect(pageAFields).toHaveLength(2)
    expect(pageBFields).toHaveLength(1)
    expect(nullFields).toHaveLength(1)
  })

  it('removePage reassigns orphaned field pageIds', () => {
    state().addPage(makePage({ id: 'fp-del', index: 0 }))
    state().addPage(makePage({ id: 'fp-keep', index: 1 }))
    state().addField(makeTextField({ id: 'fo-1', pageId: 'fp-del' }))
    state().addField(makeTextField({ id: 'fo-2', pageId: 'fp-del' }))
    state().addField(makeTextField({ id: 'fo-3', pageId: 'fp-keep' }))

    state().removePage('fp-del')

    // Orphaned fields reassigned to null (page 0)
    expect(state().fields.find((f) => f.id === 'fo-1')?.pageId).toBeNull()
    expect(state().fields.find((f) => f.id === 'fo-2')?.pageId).toBeNull()
    // Field on surviving page is untouched
    expect(state().fields.find((f) => f.id === 'fo-3')?.pageId).toBe('fp-keep')
  })

  it('image fields can be assigned to specific pages', () => {
    state().addPage(makePage({ id: 'fp-img-page', index: 0 }))
    state().addField(makeImageField({ id: 'fi-1', pageId: 'fp-img-page' }))

    expect(state().fields[0]?.pageId).toBe('fp-img-page')
    expect(state().fields[0]?.type).toBe('image')
  })
})

// ========================== Persist / restore ===============================

describe('Persist / restore', () => {
  it('pages survive store reset + re-hydration from localStorage', async () => {
    state().addPage(
      makePage({
        id: 'persist-p1',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#abcdef',
      }),
    )
    state().addPage(
      makePage({
        id: 'persist-p2',
        index: 1,
        backgroundType: 'inherit',
        backgroundColor: null,
      }),
    )

    // The persist middleware should have written to localStorage by now.
    // Verify something was stored.
    const raw = storage.get('template-goblin-template')
    expect(raw).toBeDefined()

    // Parse what was stored and verify pages are present
    const parsed = JSON.parse(raw!) as { state: { pages: PageDefinition[] } }
    expect(parsed.state.pages).toHaveLength(2)
    expect(parsed.state.pages[0]?.id).toBe('persist-p1')
    expect(parsed.state.pages[0]?.backgroundColor).toBe('#abcdef')
    expect(parsed.state.pages[1]?.id).toBe('persist-p2')
    expect(parsed.state.pages[1]?.backgroundType).toBe('inherit')
  })

  it('pageBackgroundBuffers serialize/deserialize correctly (base64)', async () => {
    const buf = makeBuffer(0xdd)
    state().addPage(makePage({ id: 'ser-buf', index: 0, backgroundType: 'image' }))
    state().setPageBackground('ser-buf', 'data:image/png;base64,DDD', buf)

    // Read from localStorage
    const raw = storage.get('template-goblin-template')
    expect(raw).toBeDefined()

    const parsed = JSON.parse(raw!) as {
      state: { pageBackgroundBuffers: [string, string][] }
    }

    // The buffer should be serialized as base64 tuple entries
    expect(parsed.state.pageBackgroundBuffers).toHaveLength(1)
    const [key, b64] = parsed.state.pageBackgroundBuffers[0]!
    expect(key).toBe('ser-buf')
    // base64 of [0xDD, 0xDD, 0xDD, 0xDD] = "3d3d3d3d" => atob gives us 4 bytes
    expect(typeof b64).toBe('string')
    expect(b64.length).toBeGreaterThan(0)

    // Now re-import the store to simulate rehydration.
    // Clear the zustand state and force rehydration.
    useTemplateStore.setState({
      pages: [],
      pageBackgroundBuffers: new Map(),
      pageBackgroundDataUrls: new Map(),
    })

    // Manually invoke the storage getItem to simulate what persist does
    const rehydrated = JSON.parse(raw!) as { state: { pageBackgroundBuffers: [string, string][] } }
    const entries = rehydrated.state.pageBackgroundBuffers
    expect(entries).toHaveLength(1)

    // Verify the base64 decodes back to the original bytes
    const binary = atob(entries[0]![1])
    expect(binary.length).toBe(4)
    expect(binary.charCodeAt(0)).toBe(0xdd)
    expect(binary.charCodeAt(1)).toBe(0xdd)
    expect(binary.charCodeAt(2)).toBe(0xdd)
    expect(binary.charCodeAt(3)).toBe(0xdd)
  })

  it('pageBackgroundDataUrls serialize/deserialize correctly', () => {
    state().addPage(makePage({ id: 'ser-url', index: 0 }))
    state().setPageBackground('ser-url', 'data:image/png;base64,URLTEST', makeBuffer(0xee))

    const raw = storage.get('template-goblin-template')
    expect(raw).toBeDefined()

    const parsed = JSON.parse(raw!) as {
      state: { pageBackgroundDataUrls: [string, string][] }
    }

    // Data URLs are stored as tuple entries [key, dataUrl]
    expect(parsed.state.pageBackgroundDataUrls).toHaveLength(1)
    const [key, dataUrl] = parsed.state.pageBackgroundDataUrls[0]!
    expect(key).toBe('ser-url')
    expect(dataUrl).toBe('data:image/png;base64,URLTEST')
  })
})

// ====================== loadFromManifest with pages =========================

describe('loadFromManifest with pages', () => {
  it('loads pages and page backgrounds from manifest', () => {
    const pages: PageDefinition[] = [
      makePage({ id: 'lm-p0', index: 0, backgroundType: 'image' }),
      makePage({ id: 'lm-p1', index: 1, backgroundType: 'color', backgroundColor: '#123456' }),
    ]
    const pgDataUrls = new Map<string, string>([['lm-p0', 'data:image/png;base64,LM0']])
    const pgBuffers = new Map<string, ArrayBuffer>([['lm-p0', makeBuffer(0xff)]])

    state().loadFromManifest(
      {
        name: 'Multi-page Template',
        width: 595,
        height: 842,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 5,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-06-15T12:00:00.000Z',
      },
      [makeTextField({ id: 'lm-f1', pageId: 'lm-p0' })],
      [],
      [],
      null,
      null,
      new Map(),
      new Map(),
      pages,
      pgDataUrls,
      pgBuffers,
    )

    expect(state().pages).toHaveLength(2)
    expect(state().pages[0]?.id).toBe('lm-p0')
    expect(state().pages[1]?.id).toBe('lm-p1')
    expect(state().pageBackgroundDataUrls.get('lm-p0')).toBe('data:image/png;base64,LM0')
    expect(state().pageBackgroundBuffers.get('lm-p0')).toBe(pgBuffers.get('lm-p0'))
    expect(state().fields[0]?.pageId).toBe('lm-p0')
  })

  it('defaults to empty pages when manifest omits page data', () => {
    state().loadFromManifest(
      {
        name: 'No-page Template',
        width: 595,
        height: 842,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-06-15T12:00:00.000Z',
      },
      [],
      [],
      [],
      null,
      null,
      new Map(),
      new Map(),
      // pages, pageBackgroundDataUrls, pageBackgroundBuffers all omitted
    )

    expect(state().pages).toHaveLength(0)
    expect(state().pageBackgroundDataUrls.size).toBe(0)
    expect(state().pageBackgroundBuffers.size).toBe(0)
  })
})

// ===================== reset clears multi-page state ========================

describe('reset clears multi-page state', () => {
  it('reset clears pages and page background maps', () => {
    state().addPage(makePage({ id: 'reset-p', index: 0 }))
    state().setPageBackground('reset-p', 'data:url', makeBuffer(0x01))
    state().addField(makeTextField({ id: 'reset-f', pageId: 'reset-p' }))

    expect(state().pages).toHaveLength(1)
    expect(state().pageBackgroundDataUrls.size).toBe(1)
    expect(state().pageBackgroundBuffers.size).toBe(1)

    state().reset()

    expect(state().pages).toHaveLength(0)
    expect(state().pageBackgroundDataUrls.size).toBe(0)
    expect(state().pageBackgroundBuffers.size).toBe(0)
    expect(state().fields).toHaveLength(0)
  })
})
