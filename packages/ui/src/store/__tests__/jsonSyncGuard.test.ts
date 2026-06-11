/**
 * SYNC GUARD — canvas ⇄ sidebar ⇄ JSON panel single-source invariant.
 *
 * The fields in `templateStore` (body + band pools) are the ONLY state.
 * The JSON panel shows `projectFieldsToJson(fields)`; the canvas renders
 * the same projection; the sidebar edits the fields directly. These tests
 * drive the REAL store through every mutation that historically broke the
 * old pinned-JSON design (second field added, new page, static→dynamic
 * flip, band fields) and assert the projection reflects each one
 * immediately, plus the write-back path (JSON edit → placeholder).
 *
 * If you change how fields, placeholders, the projection, or the JSON
 * panel work and one of these fails — the three surfaces CAN drift again.
 * Fix the regression, don't loosen the test.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FieldDefinition, TextField, TableField } from '@template-goblin/types'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
})
vi.mock('../idbStorage', () => ({
  idbGet: async (k: string) => storage.get(k),
  idbSet: async (k: string, v: string) => {
    storage.set(k, v)
  },
  idbDelete: async (k: string) => {
    storage.delete(k)
  },
  migrateFromLocalStorage: async () => {},
}))

import { useTemplateStore } from '../templateStore'
import { createDefaultField } from '../../utils/defaults'
import { projectFieldsToJson, projectionToText } from '../../utils/jsonProjection'
import { diffJsonEdit } from '../../utils/jsonApply'

/** Project straight from the live store state — exactly what the JSON
 *  panel and the canvas hook do. */
function projectStore() {
  const s = useTemplateStore.getState()
  return projectFieldsToJson(s.fields, { header: s.header?.fields, footer: s.footer?.fields })
}

/** Apply a JSON edit the way the JSON panel does: diff, then write each
 *  patch through `updateField`. */
function applyJsonEdit(text: string) {
  const s = useTemplateStore.getState()
  const bands = { header: s.header?.fields, footer: s.footer?.fields }
  const result = diffJsonEdit(text, s.fields, bands)
  expect(result.ok).toBe(true)
  const all = [...s.fields, ...(bands.header ?? []), ...(bands.footer ?? [])]
  for (const patch of result.patches) {
    const field = all.find((f) => f.id === patch.fieldId)
    if (field?.source?.mode !== 'dynamic') continue
    useTemplateStore.getState().updateField(field.id, {
      source: { ...field.source, placeholder: patch.placeholder },
    } as Partial<FieldDefinition>)
  }
  return result
}

let counter = 0
function makeText(jsonKey: string, pageId: string | null = null): FieldDefinition {
  counter++
  const field = createDefaultField('text', {
    id: `guard-${counter}`,
    pageId,
    x: 10,
    y: 10,
    width: 100,
    height: 30,
    zIndex: counter,
  })
  ;(field as TextField).source = { mode: 'dynamic', jsonKey, required: true, placeholder: null }
  return field
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('sync guard — every field mutation appears in the projection', () => {
  it('the SECOND field added appears too (the original bug)', () => {
    const store = useTemplateStore.getState()
    store.addField(makeText('first'))
    expect(projectStore().texts).toHaveProperty('first')
    store.addField(makeText('second'))
    const projected = projectStore()
    expect(projected.texts).toHaveProperty('first')
    expect(projected.texts).toHaveProperty('second')
  })

  it('fields created on another page appear (projection is page-agnostic)', () => {
    const store = useTemplateStore.getState()
    store.addField(makeText('on_page_1', null))
    store.addField(makeText('on_page_2', 'some-other-page-id'))
    const projected = projectStore()
    expect(projected.texts).toHaveProperty('on_page_1')
    expect(projected.texts).toHaveProperty('on_page_2')
  })

  it('static → dynamic flip surfaces a key immediately; flipping back removes it', () => {
    const field = makeText('ignored')
    ;(field as TextField).source = { mode: 'static', value: 'Baked in' }
    useTemplateStore.getState().addField(field)
    expect(Object.keys(projectStore().texts)).toHaveLength(0)

    useTemplateStore.getState().setFieldMode(field.id, 'dynamic')
    const keys = Object.keys(projectStore().texts)
    expect(keys).toHaveLength(1)

    useTemplateStore.getState().setFieldMode(field.id, 'static')
    expect(Object.keys(projectStore().texts)).toHaveLength(0)
  })

  it('removing a field drops its key', () => {
    const field = makeText('doomed')
    useTemplateStore.getState().addField(field)
    expect(projectStore().texts).toHaveProperty('doomed')
    useTemplateStore.getState().removeField(field.id)
    expect(projectStore().texts).not.toHaveProperty('doomed')
  })

  it('a sidebar placeholder edit flows to the JSON value', () => {
    const field = makeText('greeting')
    const store = useTemplateStore.getState()
    store.addField(field)
    expect(projectStore().texts.greeting).toBe('greeting')

    const live = useTemplateStore.getState().fields.find((f) => f.id === field.id) as TextField
    store.updateField(field.id, {
      source: { ...live.source, placeholder: 'Hello there' },
    } as Partial<FieldDefinition>)
    expect(projectStore().texts.greeting).toBe('Hello there')
  })

  it('header band fields project into the same buckets (#61)', () => {
    useTemplateStore.getState().setHeaderEnabled(true)
    useTemplateStore.getState().addHeaderField(makeText('page_title'))
    expect(projectStore().texts).toHaveProperty('page_title')
  })
})

describe('sync guard — JSON edits write through to the fields', () => {
  it('editing a text value lands in that field placeholder and re-projects identically', () => {
    const field = makeText('name')
    useTemplateStore.getState().addField(field)

    const projected = projectStore() as unknown as { texts: Record<string, unknown> }
    projected.texts.name = 'Jaimin'
    applyJsonEdit(JSON.stringify(projected))

    const live = useTemplateStore.getState().fields.find((f) => f.id === field.id) as TextField
    expect(live.source.mode === 'dynamic' && live.source.placeholder).toBe('Jaimin')
    expect(projectStore().texts.name).toBe('Jaimin')
  })

  it('editing a header band value lands in the band field (#61)', () => {
    useTemplateStore.getState().setHeaderEnabled(true)
    const field = makeText('title')
    useTemplateStore.getState().addHeaderField(field)

    const projected = projectStore() as unknown as { texts: Record<string, unknown> }
    projected.texts.title = 'Annual Report'
    applyJsonEdit(JSON.stringify(projected))

    const live = useTemplateStore
      .getState()
      .header?.fields.find((f) => f.id === field.id) as TextField
    expect(live.source.mode === 'dynamic' && live.source.placeholder).toBe('Annual Report')
    expect(projectStore().texts.title).toBe('Annual Report')
  })

  it('editing table rows lands in the table placeholder', () => {
    counter++
    const table = createDefaultField('table', {
      id: `guard-${counter}`,
      pageId: null,
      x: 0,
      y: 0,
      width: 300,
      height: 200,
      zIndex: 1,
    }) as TableField
    table.source = { mode: 'dynamic', jsonKey: 'items', required: true, placeholder: null }
    table.style.columns = [
      { key: 'sku', label: 'SKU', width: 100, style: null, headerStyle: null },
      { key: 'qty', label: 'Qty', width: 60, style: null, headerStyle: null },
    ]
    useTemplateStore.getState().addField(table)

    const editable = projectStore() as unknown as { tables: Record<string, unknown> }
    editable.tables.items = [{ sku: 'A-1', qty: '2' }]
    applyJsonEdit(JSON.stringify(editable))

    const live = useTemplateStore.getState().fields.find((f) => f.id === table.id) as TableField
    expect(live.source.mode === 'dynamic' && live.source.placeholder).toEqual([
      { sku: 'A-1', qty: '2' },
    ])
  })

  it('the full round-trip is a fixed point: project → edit nothing → zero patches', () => {
    const store = useTemplateStore.getState()
    store.addField(makeText('a'))
    store.addField(makeText('b'))
    const result = applyJsonEdit(projectionToText(projectStore()))
    expect(result.patches).toEqual([])
    expect(result.unknownKeys).toEqual([])
  })
})
