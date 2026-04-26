/**
 * GH #26 — `setFieldMode` flips a field between static and dynamic and
 * migrates the user's content across the boundary so nothing is silently
 * lost. These tests pin the migration contract per field type and guard
 * against regressions.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { TextField, ImageField, TableField } from '@template-goblin/types'

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

const TEXT_STYLE = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontSizeDynamic: false,
  fontSizeMin: 8,
  lineHeight: 1.2,
  fontWeight: 'normal' as const,
  fontStyle: 'normal' as const,
  textDecoration: 'none' as const,
  color: '#000',
  align: 'left' as const,
  verticalAlign: 'top' as const,
  maxRows: 2,
  overflowMode: 'truncate' as const,
  snapToGrid: false,
}
const BASE = {
  groupId: null,
  pageId: null,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  zIndex: 0,
  label: '',
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('GH #26 — setFieldMode (static ↔ dynamic) preserves content', () => {
  it('text static → dynamic copies value into placeholder and generates a jsonKey', () => {
    const f: TextField = {
      ...BASE,
      id: 't1',
      type: 'text',
      source: { mode: 'static', value: 'Hello world' },
      style: TEXT_STYLE,
    }
    useTemplateStore.getState().addField(f)
    useTemplateStore.getState().setFieldMode('t1', 'dynamic')

    const after = useTemplateStore.getState().fields.find((x) => x.id === 't1')!
    expect(after.source.mode).toBe('dynamic')
    if (after.source.mode === 'dynamic') {
      expect(after.source.placeholder).toBe('Hello world')
      expect(after.source.required).toBe(false)
      expect(after.source.jsonKey).toMatch(/^text_\d+$/)
    }
  })

  it('text dynamic → static copies placeholder back into value', () => {
    const f: TextField = {
      ...BASE,
      id: 't2',
      type: 'text',
      source: { mode: 'dynamic', jsonKey: 'greeting', required: true, placeholder: 'Hi there' },
      style: TEXT_STYLE,
    }
    useTemplateStore.getState().addField(f)
    useTemplateStore.getState().setFieldMode('t2', 'static')

    const after = useTemplateStore.getState().fields.find((x) => x.id === 't2')!
    expect(after.source.mode).toBe('static')
    if (after.source.mode === 'static') expect(after.source.value).toBe('Hi there')
  })

  it('text dynamic with null placeholder → static gets empty string', () => {
    const f: TextField = {
      ...BASE,
      id: 't3',
      type: 'text',
      source: { mode: 'dynamic', jsonKey: 'k', required: false, placeholder: null },
      style: TEXT_STYLE,
    }
    useTemplateStore.getState().addField(f)
    useTemplateStore.getState().setFieldMode('t3', 'static')

    const after = useTemplateStore.getState().fields.find((x) => x.id === 't3')!
    expect(after.source.mode).toBe('static')
    if (after.source.mode === 'static') expect(after.source.value).toBe('')
  })

  it('image static → dynamic carries the filename across', () => {
    const f: ImageField = {
      ...BASE,
      id: 'i1',
      type: 'image',
      source: { mode: 'static', value: { filename: 'logo.png' } },
      style: { fit: 'contain' },
    }
    useTemplateStore.getState().addField(f)
    useTemplateStore.getState().setFieldMode('i1', 'dynamic')

    const after = useTemplateStore.getState().fields.find((x) => x.id === 'i1')!
    expect(after.source.mode).toBe('dynamic')
    if (after.source.mode === 'dynamic') {
      expect(after.source.placeholder).toEqual({ filename: 'logo.png' })
      expect(after.source.jsonKey).toMatch(/^image_\d+$/)
    }
  })

  it('image dynamic → static carries the placeholder back', () => {
    const f: ImageField = {
      ...BASE,
      id: 'i2',
      type: 'image',
      source: {
        mode: 'dynamic',
        jsonKey: 'photo',
        required: false,
        placeholder: { filename: 'placeholder.png' },
      },
      style: { fit: 'contain' },
    }
    useTemplateStore.getState().addField(f)
    useTemplateStore.getState().setFieldMode('i2', 'static')

    const after = useTemplateStore.getState().fields.find((x) => x.id === 'i2')!
    expect(after.source.mode).toBe('static')
    if (after.source.mode === 'static')
      expect(after.source.value).toEqual({ filename: 'placeholder.png' })
  })

  it('table static → dynamic carries the row array across', () => {
    const f: TableField = {
      ...BASE,
      id: 'tb1',
      type: 'table',
      source: { mode: 'static', value: [{ name: 'Alice' }, { name: 'Bob' }] },
      style: {
        maxRows: 5,
        maxColumns: 3,
        multiPage: false,
        showHeader: true,
        headerStyle: TEXT_STYLE as never,
        rowStyle: TEXT_STYLE as never,
        oddRowStyle: null,
        evenRowStyle: null,
        cellStyle: { overflowMode: 'truncate' },
        columns: [],
      },
    }
    useTemplateStore.getState().addField(f)
    useTemplateStore.getState().setFieldMode('tb1', 'dynamic')

    const after = useTemplateStore.getState().fields.find((x) => x.id === 'tb1')!
    expect(after.source.mode).toBe('dynamic')
    if (after.source.mode === 'dynamic') {
      expect(after.source.placeholder).toEqual([{ name: 'Alice' }, { name: 'Bob' }])
    }
  })

  it('jsonKey collision avoidance: existing dynamic peers do not get duplicate keys', () => {
    const a: TextField = {
      ...BASE,
      id: 'a',
      type: 'text',
      source: { mode: 'dynamic', jsonKey: 'text_1', required: false, placeholder: null },
      style: TEXT_STYLE,
    }
    const b: TextField = {
      ...BASE,
      id: 'b',
      type: 'text',
      source: { mode: 'static', value: 'flip me' },
      style: TEXT_STYLE,
    }
    useTemplateStore.getState().addField(a)
    useTemplateStore.getState().addField(b)
    useTemplateStore.getState().setFieldMode('b', 'dynamic')

    const flipped = useTemplateStore.getState().fields.find((x) => x.id === 'b')!
    if (flipped.source.mode === 'dynamic') {
      expect(flipped.source.jsonKey).not.toBe('text_1')
      expect(flipped.source.jsonKey).toMatch(/^text_\d+$/)
    }
  })

  it('flipping to the same mode is a no-op', () => {
    const f: TextField = {
      ...BASE,
      id: 'noop',
      type: 'text',
      source: { mode: 'static', value: 'unchanged' },
      style: TEXT_STYLE,
    }
    useTemplateStore.getState().addField(f)
    useTemplateStore.getState().setFieldMode('noop', 'static')

    const after = useTemplateStore.getState().fields.find((x) => x.id === 'noop')!
    expect(after.source.mode).toBe('static')
    if (after.source.mode === 'static') expect(after.source.value).toBe('unchanged')
  })
})
