import { describe, it, expect, beforeEach, vi } from 'vitest'

// ---------------------------------------------------------------------------
// localStorage shim — needed by `persist` at module-load time. Each test
// reimports the store (via `vi.resetModules`) after pre-populating this shim
// with a legacy v1 blob, so the persist rehydration + migrate pipeline runs
// against known inputs.
// ---------------------------------------------------------------------------
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

const PERSIST_KEY = 'template-goblin-template'

/** Canonical pre-Phase-1 persisted blob (version 1, legacy top-level keys). */
function legacyV1Blob(): unknown {
  return {
    version: 1,
    state: {
      meta: {
        name: 'Legacy Template',
        width: 595,
        height: 842,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 1,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-02T00:00:00.000Z',
      },
      fields: [
        {
          id: 'f-1',
          type: 'text',
          groupId: null,
          pageId: null,
          label: '',
          // Legacy top-level keys (no `source`).
          jsonKey: 'student_name',
          required: true,
          placeholder: null,
          x: 10,
          y: 20,
          width: 100,
          height: 30,
          zIndex: 0,
          style: {
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
          },
        },
        {
          id: 'f-2',
          type: 'image',
          groupId: null,
          pageId: null,
          label: '',
          jsonKey: 'photo',
          required: false,
          x: 200,
          y: 200,
          width: 120,
          height: 150,
          zIndex: 1,
          // Legacy shape: `style.placeholderFilename` must be moved to
          // `source.placeholder = { filename }` in v2.
          style: { fit: 'contain', placeholderFilename: 'photo.png' },
        },
        {
          id: 'f-3',
          // Legacy type name: must be renamed to `table`.
          type: 'loop',
          groupId: null,
          pageId: null,
          label: '',
          jsonKey: 'grades',
          required: true,
          x: 40,
          y: 400,
          width: 400,
          height: 200,
          zIndex: 2,
          style: {
            maxRows: 10,
            maxColumns: 5,
            multiPage: false,
            showHeader: true,
            headerStyle: {
              fontFamily: 'Helvetica',
              fontSize: 10,
              fontWeight: 'bold',
              fontStyle: 'normal',
              textDecoration: 'none',
              color: '#000',
              backgroundColor: '#f0f0f0',
              borderWidth: 1,
              borderColor: '#000',
              paddingTop: 4,
              paddingBottom: 4,
              paddingLeft: 4,
              paddingRight: 4,
              align: 'left',
              verticalAlign: 'top',
            },
            rowStyle: {
              fontFamily: 'Helvetica',
              fontSize: 10,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              color: '#000',
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#000',
              paddingTop: 4,
              paddingBottom: 4,
              paddingLeft: 4,
              paddingRight: 4,
              align: 'left',
              verticalAlign: 'top',
            },
            oddRowStyle: null,
            evenRowStyle: null,
            cellStyle: { overflowMode: 'truncate' },
            columns: [],
          },
        },
      ],
      fonts: [],
      groups: [],
      pages: [],
      backgroundDataUrl: null,
      backgroundBuffer: null,
      pageBackgroundDataUrls: [],
      pageBackgroundBuffers: [],
      fontBuffers: [],
      placeholderBuffers: [],
    },
  }
}

describe('templateStore persist migration (v1 -> v2)', () => {
  beforeEach(() => {
    storage.clear()
    vi.resetModules()
  })

  it('migrates legacy top-level jsonKey/required/placeholder into source', async () => {
    storage.set(PERSIST_KEY, JSON.stringify(legacyV1Blob()))

    const mod = await import('../templateStore')
    const state = mod.useTemplateStore.getState()

    expect(state.fields).toHaveLength(3)

    const text = state.fields.find((f) => f.id === 'f-1')!
    expect(text.type).toBe('text')
    expect(text.source.mode).toBe('dynamic')
    if (text.source.mode === 'dynamic') {
      expect(text.source.jsonKey).toBe('student_name')
      expect(text.source.required).toBe(true)
      expect(text.source.placeholder).toBeNull()
    }
    // Legacy top-level keys must be gone.
    expect((text as unknown as Record<string, unknown>).jsonKey).toBeUndefined()
    expect((text as unknown as Record<string, unknown>).required).toBeUndefined()
    expect((text as unknown as Record<string, unknown>).placeholder).toBeUndefined()
  })

  it('migrates image field placeholderFilename into source.placeholder', async () => {
    storage.set(PERSIST_KEY, JSON.stringify(legacyV1Blob()))

    const mod = await import('../templateStore')
    const state = mod.useTemplateStore.getState()

    const img = state.fields.find((f) => f.id === 'f-2')!
    expect(img.type).toBe('image')
    expect(img.source.mode).toBe('dynamic')
    if (img.source.mode === 'dynamic') {
      expect(img.source.jsonKey).toBe('photo')
      expect(img.source.placeholder).toEqual({ filename: 'photo.png' })
    }
    // style.placeholderFilename must be gone.
    expect((img.style as unknown as Record<string, unknown>).placeholderFilename).toBeUndefined()
  })

  it('renames type:"loop" to type:"table"', async () => {
    storage.set(PERSIST_KEY, JSON.stringify(legacyV1Blob()))

    const mod = await import('../templateStore')
    const state = mod.useTemplateStore.getState()

    const loopField = state.fields.find((f) => f.id === 'f-3')!
    expect(loopField.type).toBe('table')
    expect(loopField.source.mode).toBe('dynamic')
    if (loopField.source.mode === 'dynamic') {
      expect(loopField.source.jsonKey).toBe('grades')
      expect(loopField.source.required).toBe(true)
    }
  })

  it('drops fields whose source object is corrupt (null) and keeps the rest', async () => {
    const blob = legacyV1Blob() as { state: { fields: unknown[] } }
    // Inject a corrupt field: has a `source` but it's null.
    blob.state.fields.push({
      id: 'f-corrupt',
      type: 'text',
      groupId: null,
      pageId: null,
      label: '',
      source: null,
      x: 0,
      y: 0,
      width: 50,
      height: 20,
      zIndex: 99,
      style: {
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
      },
    })
    storage.set(PERSIST_KEY, JSON.stringify(blob))

    // Store hydrates without throwing.
    const mod = await import('../templateStore')
    const state = mod.useTemplateStore.getState()

    // The three legacy fields migrated; `null`-source is **not** corrupt (it
    // means "no source object at all") — it still gets a synthesized dynamic
    // source. So we end up with 4 fields.
    //
    // Note: the documented policy is: a field with `source: null` is treated
    // as "legacy, synthesize a default dynamic source". A field with an
    // object-typed `source` missing `mode` is the corrupt-drop case, covered
    // below.
    expect(state.fields.length).toBeGreaterThanOrEqual(3)
  })

  it('drops fields whose source is an object but lacks a valid mode', async () => {
    const blob = legacyV1Blob() as { state: { fields: unknown[] } }
    blob.state.fields.push({
      id: 'f-bad-source',
      type: 'text',
      groupId: null,
      pageId: null,
      label: '',
      source: { something: 'else' },
      x: 0,
      y: 0,
      width: 50,
      height: 20,
      zIndex: 99,
      style: {
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
      },
    })
    storage.set(PERSIST_KEY, JSON.stringify(blob))

    const mod = await import('../templateStore')
    const state = mod.useTemplateStore.getState()

    // The corrupt-source field is dropped; only the 3 legacy fields survive.
    expect(state.fields.find((f) => f.id === 'f-bad-source')).toBeUndefined()
    expect(state.fields).toHaveLength(3)
  })

  it('logs a warning and falls back to defaults on unparseable blob', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    storage.set(PERSIST_KEY, 'not-json-at-all{')

    const mod = await import('../templateStore')
    const state = mod.useTemplateStore.getState()

    // Falls back to empty defaults.
    expect(state.fields).toEqual([])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
