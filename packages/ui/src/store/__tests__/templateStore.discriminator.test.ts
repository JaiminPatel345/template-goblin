/**
 * QA tests for `updateField` discriminator + style-shape preservation.
 *
 * Invariants from the QA brief (derived from specs 010/011/012 + design §4):
 *   d.1) updateField(id, { label }) on a text field preserves type === 'text'
 *        and the full TextFieldStyle shape.
 *   d.2) updateField(id, { x }) on a table field preserves TableFieldStyle —
 *        showHeader, oddRowStyle, evenRowStyle, columns[].style,
 *        columns[].headerStyle must not disappear.
 *   d.3) prototype-pollution guard on the naive { ...f, ...updates } spread.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

import { useTemplateStore } from '../templateStore.js'
import type {
  FieldDefinition,
  TableField,
  TableFieldStyle,
  TextField,
  TextFieldStyle,
  ImageField,
  ImageFieldStyle,
  CellStyle,
} from '@template-goblin/types'

function cell(o: Partial<CellStyle> = {}): CellStyle {
  return {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    align: 'left',
    verticalAlign: 'top',
    ...o,
  }
}

function makeTextField(): FieldDefinition {
  const style: TextFieldStyle = {
    fontId: null,
    fontFamily: 'Helvetica',
    fontSize: 14,
    fontSizeDynamic: false,
    fontSizeMin: 11,
    lineHeight: 1.2,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#123456',
    align: 'left',
    verticalAlign: 'top',
    maxRows: 2,
    overflowMode: 'truncate',
    snapToGrid: true,
  }
  const f: TextField = {
    id: 't1',
    type: 'text',
    groupId: null,
    pageId: null,
    label: 'original',
    source: { mode: 'dynamic', jsonKey: 'key1', required: true, placeholder: null },
    x: 0,
    y: 0,
    width: 100,
    height: 30,
    zIndex: 0,
    style,
  }
  return f
}

function makeTableField(): FieldDefinition {
  const style: TableFieldStyle = {
    maxRows: 15,
    maxColumns: 4,
    multiPage: true,
    showHeader: true,
    headerStyle: cell({ fontWeight: 'bold' }),
    rowStyle: cell(),
    oddRowStyle: cell({ backgroundColor: '#fafafa' }),
    evenRowStyle: cell({ backgroundColor: '#eeeeee' }),
    cellStyle: { overflowMode: 'dynamic_font' },
    columns: [
      {
        key: 'c1',
        label: 'Column 1',
        width: 120,
        style: { fontSize: 9, color: '#222222' },
        headerStyle: { fontWeight: 'bold', color: '#111111' },
      },
      {
        key: 'c2',
        label: 'Column 2',
        width: 80,
        style: null,
        headerStyle: null,
      },
    ],
  }
  const f: TableField = {
    id: 'tbl1',
    type: 'table',
    groupId: null,
    pageId: null,
    label: 'table',
    source: { mode: 'dynamic', jsonKey: 'marks', required: true, placeholder: null },
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    zIndex: 0,
    style,
  }
  return f
}

function makeImageField(): FieldDefinition {
  const style: ImageFieldStyle = { fit: 'cover' }
  const f: ImageField = {
    id: 'img1',
    type: 'image',
    groupId: null,
    pageId: null,
    label: 'photo',
    source: { mode: 'dynamic', jsonKey: 'photo', required: false, placeholder: null },
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
    style,
  }
  return f
}

const state = () => useTemplateStore.getState()

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

// ---------------------------------------------------------------------------
// Discriminator + style-shape preservation
// ---------------------------------------------------------------------------

describe('updateField — discriminator preservation', () => {
  it('text field: updating label preserves type and full TextFieldStyle', () => {
    state().addField(makeTextField())
    state().updateField('t1', { label: 'changed' })
    const f = state().fields[0] as TextField
    expect(f.type).toBe('text')
    expect(f.label).toBe('changed')
    // full style preserved
    expect(f.style.fontFamily).toBe('Helvetica')
    expect(f.style.fontSize).toBe(14)
    expect(f.style.color).toBe('#123456')
    expect(f.style.maxRows).toBe(2)
    expect(f.style.snapToGrid).toBe(true)
  })

  it('image field: updating x,y preserves type and ImageFieldStyle.fit', () => {
    state().addField(makeImageField())
    state().updateField('img1', { x: 50, y: 60 })
    const f = state().fields[0] as ImageField
    expect(f.type).toBe('image')
    expect(f.style.fit).toBe('cover')
  })

  it('table field: updating x preserves showHeader/oddRow/evenRow/columns[i].style/headerStyle', () => {
    state().addField(makeTableField())
    state().updateField('tbl1', { x: 100 })
    const f = state().fields[0] as TableField
    expect(f.type).toBe('table')
    // Top-level table style
    expect(f.style.showHeader).toBe(true)
    expect(f.style.multiPage).toBe(true)
    expect(f.style.maxRows).toBe(15)
    expect(f.style.oddRowStyle).not.toBeNull()
    expect(f.style.oddRowStyle!.backgroundColor).toBe('#fafafa')
    expect(f.style.evenRowStyle).not.toBeNull()
    expect(f.style.evenRowStyle!.backgroundColor).toBe('#eeeeee')
    // Column overrides
    expect(f.style.columns).toHaveLength(2)
    expect(f.style.columns[0]!.style).toEqual({ fontSize: 9, color: '#222222' })
    expect(f.style.columns[0]!.headerStyle).toEqual({
      fontWeight: 'bold',
      color: '#111111',
    })
    expect(f.style.columns[1]!.style).toBeNull()
    expect(f.style.columns[1]!.headerStyle).toBeNull()
    expect(f.style.cellStyle.overflowMode).toBe('dynamic_font')
  })

  it('updateFieldStyle on a table preserves columns[] and headerStyle sub-object', () => {
    state().addField(makeTableField())
    state().updateFieldStyle('tbl1', { multiPage: false } as Partial<TableFieldStyle>)
    const f = state().fields[0] as TableField
    expect(f.style.multiPage).toBe(false)
    expect(f.style.columns).toHaveLength(2)
    expect(f.style.columns[0]!.style).toEqual({ fontSize: 9, color: '#222222' })
    expect(f.style.showHeader).toBe(true)
    expect(f.style.headerStyle.fontWeight).toBe('bold')
  })
})

// ---------------------------------------------------------------------------
// Documentation test — current behaviour of type-swap via updateField
// ---------------------------------------------------------------------------

describe('updateField — type-swap behaviour (documentation)', () => {
  it('accepting a conflicting type in updates silently mutates the discriminator', () => {
    state().addField(makeTextField())
    // Cast through unknown — we're deliberately mis-using the API.
    state().updateField('t1', { type: 'table' } as unknown as Partial<FieldDefinition>)
    const f = state().fields[0]!
    // Document the ACTUAL behaviour. If the store ever chooses to reject
    // discriminator changes, update this test.
    expect(f.type).toBe('table')
    // But the style is still the OLD text style — this is the inconsistent
    // state the QA brief flags.
    expect(f.style).toMatchObject({ fontFamily: 'Helvetica', fontSize: 14 })
  })
})

// ---------------------------------------------------------------------------
// Prototype-pollution guards on updateField — hostile updates payload
// ---------------------------------------------------------------------------

describe('updateField — prototype-pollution surface', () => {
  it('__proto__ spread via updates does not pollute Object.prototype', () => {
    state().addField(makeTextField())
    const hostile = JSON.parse('{"__proto__":{"polluted":"yes"}}') as Partial<FieldDefinition>
    state().updateField('t1', hostile)
    const probe: Record<string, unknown> = {}
    // Using `in` walks the prototype chain.
    expect('polluted' in probe && probe.polluted === 'yes').toBe(false)
  })

  it('constructor key in updates does not leak onto unrelated plain objects', () => {
    state().addField(makeTextField())
    const hostile = { constructor: 'evil' } as unknown as Partial<FieldDefinition>
    state().updateField('t1', hostile)
    // Spreading `{ constructor: 'evil' }` becomes an OWN property on the
    // field — that's a minor oddity, not a security concern. The real
    // concern is whether Object.prototype was mutated.
    const unrelated: Record<string, unknown> = {}
    expect(typeof unrelated.constructor).toBe('function')
    expect(Object.prototype.constructor).toBe(Object)
  })
})

// ---------------------------------------------------------------------------
// loadFromManifest must preserve the validated shape as-is
// ---------------------------------------------------------------------------

describe('loadFromManifest — preserves static-source fields', () => {
  it('static text fields load correctly into the store', () => {
    const fields: FieldDefinition[] = [
      {
        id: 'st1',
        type: 'text',
        groupId: null,
        pageId: null,
        label: '',
        source: { mode: 'static', value: 'Baked Text' },
        x: 0,
        y: 0,
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
        } satisfies TextFieldStyle,
      },
    ]
    state().loadFromManifest(
      {
        name: 'T',
        width: 595,
        height: 842,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      fields,
      [],
      [],
      null,
      null,
      new Map(),
      new Map(),
    )
    const f = state().fields[0]!
    expect(f.source.mode).toBe('static')
    expect((f.source as { mode: 'static'; value: string }).value).toBe('Baked Text')
  })
})
