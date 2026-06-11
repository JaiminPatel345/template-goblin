/**
 * Image bytes must follow a field across dynamic ↔ static mode flips.
 *
 * The PDF renderer's preflight resolves static fields STRICTLY from
 * `LoadedTemplate.staticImages` and dynamic placeholders from
 * `.placeholders`. Pre-fix, `setFieldMode` carried only the FILENAME
 * across (placeholder ↔ value) while the bytes stayed in the old pool,
 * so rendering after a flip failed with MISSING_ASSET ("the archive does
 * not contain that file"). Same story for the properties-panel static
 * upload, which stored bytes via `addPlaceholder`.
 *
 * These tests assert through `templateToLoaded` — the exact adapter the
 * Preview dialog hands to `generatePDF` — so they fail if either pool
 * stops lining up with what the renderer reads.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FieldDefinition, ImageField } from '@template-goblin/types'

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
import { templateToLoaded } from '../../utils/templateToLoaded'

// Minimal valid PNG header so MIME sniffing has real magic bytes.
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]).buffer

function makeImageField(id: string): ImageField {
  return createDefaultField('image', {
    id,
    pageId: null,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
  }) as ImageField
}

function loaded() {
  return templateToLoaded(useTemplateStore.getState())
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('setFieldMode — image bytes follow the filename across pools', () => {
  it('dynamic → static: placeholder bytes land in staticImages for the renderer', () => {
    const field = makeImageField('img-1')
    field.source = {
      mode: 'dynamic',
      jsonKey: 'photo',
      required: true,
      placeholder: { filename: 'placeholders/dp.png' },
    }
    const store = useTemplateStore.getState()
    store.addField(field)
    store.addPlaceholder('placeholders/dp.png', PNG_BYTES)

    expect(loaded().staticImages.get('placeholders/dp.png')).toBeUndefined()
    store.setFieldMode('img-1', 'static')

    const live = useTemplateStore.getState().fields.find((f) => f.id === 'img-1')
    expect(live?.source).toEqual({ mode: 'static', value: { filename: 'placeholders/dp.png' } })
    // The renderer's lookup — this is what raised MISSING_ASSET pre-fix.
    expect(loaded().staticImages.get('placeholders/dp.png')?.length).toBeGreaterThan(0)
    // The data-URL mirror feeds the canvas thumbnails.
    expect(useTemplateStore.getState().staticImageDataUrls.get('placeholders/dp.png')).toMatch(
      /^data:image\/png;base64,/,
    )
  })

  it('static → dynamic: static bytes land in placeholders', () => {
    const field = makeImageField('img-2')
    ;(field as FieldDefinition).source = {
      mode: 'static',
      value: { filename: 'images/logo.png' },
    } as ImageField['source']
    const store = useTemplateStore.getState()
    store.addField(field)
    store.addStaticImage('images/logo.png', 'data:image/png;base64,AAAA', PNG_BYTES)

    store.setFieldMode('img-2', 'dynamic')

    const live = useTemplateStore.getState().fields.find((f) => f.id === 'img-2')
    expect(live?.source.mode).toBe('dynamic')
    expect(loaded().placeholders.get('images/logo.png')?.length).toBeGreaterThan(0)
  })

  it('full round-trip keeps the asset resolvable in both pools', () => {
    const field = makeImageField('img-3')
    field.source = {
      mode: 'dynamic',
      jsonKey: 'photo',
      required: true,
      placeholder: { filename: 'placeholders/pic.png' },
    }
    const store = useTemplateStore.getState()
    store.addField(field)
    store.addPlaceholder('placeholders/pic.png', PNG_BYTES)

    store.setFieldMode('img-3', 'static')
    store.setFieldMode('img-3', 'dynamic')
    store.setFieldMode('img-3', 'static')

    // The renderer handover carries the pool the field's CURRENT mode
    // reads (static → staticImages); the stale placeholder copy is swept
    // from the handover but kept in the store so undoing a flip still
    // finds its bytes.
    expect(loaded().staticImages.get('placeholders/pic.png')?.length).toBeGreaterThan(0)
    expect(loaded().placeholders.has('placeholders/pic.png')).toBe(false)
    expect(useTemplateStore.getState().placeholderBuffers.has('placeholders/pic.png')).toBe(true)
    expect(useTemplateStore.getState().staticImageBuffers.has('placeholders/pic.png')).toBe(true)
  })

  it('solid-colour static images flip without touching the pools (#81)', () => {
    const field = makeImageField('img-4')
    ;(field as FieldDefinition).source = {
      mode: 'static',
      value: { color: '#ff0000' },
    } as ImageField['source']
    const store = useTemplateStore.getState()
    store.addField(field)

    store.setFieldMode('img-4', 'dynamic')
    expect(useTemplateStore.getState().placeholderBuffers.size).toBe(0)
    expect(useTemplateStore.getState().staticImageBuffers.size).toBe(0)
  })

  it('text fields flip without touching the pools', () => {
    const field = createDefaultField('text', {
      id: 'txt-1',
      pageId: null,
      x: 0,
      y: 0,
      width: 100,
      height: 30,
      zIndex: 0,
    })
    const store = useTemplateStore.getState()
    store.addField(field)
    store.setFieldMode('txt-1', 'static')
    expect(useTemplateStore.getState().staticImageBuffers.size).toBe(0)
  })
})

describe('properties-panel static upload contract', () => {
  it('addStaticImage makes the asset visible to the renderer (the panel upload path)', () => {
    // Mirrors ImageFieldProps.handleStaticUpload: store bytes via
    // addStaticImage, then point source.value at the filename.
    const field = makeImageField('img-5')
    field.source = { mode: 'dynamic', jsonKey: 'photo', required: true, placeholder: null }
    const store = useTemplateStore.getState()
    store.addField(field)
    store.setFieldMode('img-5', 'static')

    store.addStaticImage('static-img-5-dp.png', 'data:image/png;base64,AAAA', PNG_BYTES)
    store.updateField('img-5', {
      source: { mode: 'static', value: { filename: 'static-img-5-dp.png' } },
    } as Partial<FieldDefinition>)

    expect(loaded().staticImages.get('static-img-5-dp.png')?.length).toBeGreaterThan(0)
  })
})
