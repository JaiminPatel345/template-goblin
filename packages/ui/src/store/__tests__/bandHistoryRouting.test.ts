/**
 * Band fields are first-class in every store mutation + undo/redo.
 *
 * The band pools (#61) were retrofitted onto only SOME field mutations:
 * `removeFields` (the keyboard Delete path), `setFieldMode`, and
 * `duplicateField` still assumed a single body pool, and history
 * snapshots carried fields+groups only — so undo was blind to band
 * edits, and hiding a band (which migrates its fields into the body)
 * followed by Ctrl+Z permanently lost the fields from BOTH pools.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FieldDefinition, ImageField, TextField } from '@template-goblin/types'

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

function makeText(id: string, jsonKey: string): FieldDefinition {
  const field = createDefaultField('text', {
    id,
    pageId: null,
    x: 10,
    y: 10,
    width: 100,
    height: 30,
    zIndex: 0,
  })
  ;(field as TextField).source = { mode: 'dynamic', jsonKey, required: true, placeholder: null }
  return field
}

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).buffer

function store() {
  return useTemplateStore.getState()
}

beforeEach(() => {
  storage.clear()
  store().reset()
})

describe('band routing parity', () => {
  it('removeFields (keyboard Delete) actually removes a band field', () => {
    store().setHeaderEnabled(true)
    store().addHeaderField(makeText('h1', 'title'))
    expect(store().header?.fields).toHaveLength(1)

    store().removeFields(['h1'])
    expect(store().header?.fields).toHaveLength(0)
  })

  it('removeFields removes a mixed body+band selection atomically', () => {
    store().addField(makeText('b1', 'body_one'))
    store().setHeaderEnabled(true)
    store().addHeaderField(makeText('h1', 'title'))

    store().removeFields(['b1', 'h1'])
    expect(store().fields).toHaveLength(0)
    expect(store().header?.fields).toHaveLength(0)
  })

  it('setFieldMode flips a band field (the toggle previously no-opd)', () => {
    store().setHeaderEnabled(true)
    store().addHeaderField(makeText('h1', 'title'))

    store().setFieldMode('h1', 'static')
    const flipped = store().header?.fields.find((f) => f.id === 'h1')
    expect(flipped?.source.mode).toBe('static')

    store().setFieldMode('h1', 'dynamic')
    const back = store().header?.fields.find((f) => f.id === 'h1')
    expect(back?.source.mode).toBe('dynamic')
    // QA BUG-06 memo applies to band fields too — the jsonKey round-trips.
    expect(back?.source.mode === 'dynamic' && back.source.jsonKey).toBe('title')
  })

  it('setFieldMode migrates image bytes for band image fields', () => {
    store().setHeaderEnabled(true)
    const img = createDefaultField('image', {
      id: 'h-img',
      pageId: null,
      x: 0,
      y: 0,
      width: 50,
      height: 30,
      zIndex: 0,
    }) as ImageField
    img.source = {
      mode: 'dynamic',
      jsonKey: 'logo',
      required: true,
      placeholder: { filename: 'logo.png' },
    }
    store().addHeaderField(img)
    store().addPlaceholder('logo.png', PNG_BYTES)

    store().setFieldMode('h-img', 'static')
    expect(store().staticImageBuffers.has('logo.png')).toBe(true)
  })

  it('duplicateField duplicates a band field into its own pool', () => {
    store().setHeaderEnabled(true)
    store().addHeaderField(makeText('h1', 'title'))

    const copy = store().duplicateField('h1')
    expect(copy).not.toBeNull()
    expect(store().header?.fields).toHaveLength(2)
    expect(store().fields).toHaveLength(0)
  })
})

describe('band-aware undo/redo', () => {
  it('hiding a band then Ctrl+Z restores the band fields (the data-loss case)', () => {
    store().setHeaderEnabled(true)
    store().addHeaderField(makeText('h1', 'title'))
    expect(store().header?.fields).toHaveLength(1)

    // Hide migrates h1 into the body pool and clears the band.
    store().setHeaderEnabled(false)
    expect(store().header?.fields).toHaveLength(0)
    expect(store().fields.some((f) => f.id === 'h1')).toBe(true)

    // Pre-fix: undo restored a pre-migration BODY array while the band was
    // already empty — h1 vanished from both pools, unrecoverable.
    store().undo()
    expect(store().header?.fields.some((f) => f.id === 'h1')).toBe(true)
    expect(store().fields.some((f) => f.id === 'h1')).toBe(false)

    // And redo replays the hide-migration.
    store().redo()
    expect(store().header?.fields).toHaveLength(0)
    expect(store().fields.some((f) => f.id === 'h1')).toBe(true)
  })

  it('undoing a band-field edit reverts the band, not the last body change', () => {
    store().addField(makeText('b1', 'body_one'))
    store().setHeaderEnabled(true)
    store().addHeaderField(makeText('h1', 'title'))

    store().updateField('h1', { label: 'renamed' })
    expect(store().header?.fields[0]?.label).toBe('renamed')

    store().undo()
    expect(store().header?.fields[0]?.label).toBe('')
    // The body field is untouched by that undo step.
    expect(store().fields.some((f) => f.id === 'b1')).toBe(true)
  })

  it('deleting a band field is one undoable step', () => {
    store().setHeaderEnabled(true)
    store().addHeaderField(makeText('h1', 'title'))
    store().removeField('h1')
    expect(store().header?.fields).toHaveLength(0)

    store().undo()
    expect(store().header?.fields.some((f) => f.id === 'h1')).toBe(true)
  })
})
