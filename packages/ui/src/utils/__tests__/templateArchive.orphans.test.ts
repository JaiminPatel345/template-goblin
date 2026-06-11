/**
 * Orphaned-image-asset sweep — UI side.
 *
 * The store's image pools are APPEND-ONLY during a session: deleting a
 * field, replacing its image, or flipping its mode leaves the old bytes
 * in place (eager deletion would break undo — history snapshots capture
 * fields, not bytes — and could drop an asset another field still
 * references by the same filename). The sweep happens at the
 * serialization boundary instead: `buildTemplateArchive` (Save) and
 * `templateToLoaded` (Preview render) persist / hand over only the
 * assets the manifest references.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { ImageField } from '@template-goblin/types'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
  clear: () => storage.clear(),
})
vi.mock('../../store/idbStorage', () => ({
  idbGet: async (k: string) => storage.get(k),
  idbSet: async (k: string, v: string) => {
    storage.set(k, v)
  },
  idbDelete: async (k: string) => {
    storage.delete(k)
  },
  migrateFromLocalStorage: async () => {},
}))

import { useTemplateStore } from '../../store/templateStore.js'
import { createDefaultField } from '../defaults.js'
import { buildTemplateArchive } from '../templateArchive.js'
import { templateToLoaded } from '../templateToLoaded.js'

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]).buffer

function addDynamicImage(id: string, jsonKey: string, placeholderFile: string | null): void {
  const field = createDefaultField('image', {
    id,
    pageId: null,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
  }) as ImageField
  field.source = {
    mode: 'dynamic',
    jsonKey,
    required: true,
    placeholder: placeholderFile ? { filename: placeholderFile } : null,
  }
  useTemplateStore.getState().addField(field)
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('orphaned image assets are swept at the archive boundary', () => {
  it('Save: deleted-field and replaced-upload bytes are not written to the .tgbl', () => {
    const store = useTemplateStore.getState()
    addDynamicImage('img-keep', 'photo', 'keep.png')
    store.addPlaceholder('keep.png', PNG_BYTES)

    // Simulate session churn: a field that was deleted (bytes remain for
    // undo) and a static upload that was later replaced.
    store.addPlaceholder('deleted-field.png', PNG_BYTES)
    store.addStaticImage('replaced-upload.png', 'data:image/png;base64,AAAA', PNG_BYTES)

    const { zip } = buildTemplateArchive(useTemplateStore.getState())
    const entries = Object.keys(zip.files)
    expect(entries).toContain('placeholders/keep.png')
    expect(entries.some((e) => e.includes('deleted-field.png'))).toBe(false)
    expect(entries.some((e) => e.includes('replaced-upload.png'))).toBe(false)
  })

  it('Save: a real delete-the-field flow leaves no trace in the archive', () => {
    const store = useTemplateStore.getState()
    addDynamicImage('img-a', 'a', 'a.png')
    addDynamicImage('img-b', 'b', 'b.png')
    store.addPlaceholder('a.png', PNG_BYTES)
    store.addPlaceholder('b.png', PNG_BYTES)

    store.removeField('img-b')
    // The pool still holds b.png (undo must be able to restore it)…
    expect(useTemplateStore.getState().placeholderBuffers.has('b.png')).toBe(true)
    // …but the saved archive must not.
    const { zip } = buildTemplateArchive(useTemplateStore.getState())
    expect(Object.keys(zip.files)).toContain('placeholders/a.png')
    expect(Object.keys(zip.files)).not.toContain('placeholders/b.png')
  })

  it('Save: band-field assets survive the sweep (#61)', () => {
    const store = useTemplateStore.getState()
    store.setHeaderEnabled(true)
    const field = createDefaultField('image', {
      id: 'hdr-logo',
      pageId: null,
      x: 0,
      y: 0,
      width: 60,
      height: 30,
      zIndex: 0,
    }) as ImageField
    field.source = {
      mode: 'dynamic',
      jsonKey: 'logo',
      required: true,
      placeholder: { filename: 'header-logo.png' },
    }
    store.addHeaderField(field)
    store.addPlaceholder('header-logo.png', PNG_BYTES)

    const { zip } = buildTemplateArchive(useTemplateStore.getState())
    expect(Object.keys(zip.files)).toContain('placeholders/header-logo.png')
  })

  it('Preview: templateToLoaded hands the renderer only referenced assets', () => {
    const store = useTemplateStore.getState()
    addDynamicImage('img-keep', 'photo', 'keep.png')
    store.addPlaceholder('keep.png', PNG_BYTES)
    store.addPlaceholder('orphan.png', PNG_BYTES)
    store.addStaticImage('orphan-static.png', 'data:image/png;base64,AAAA', PNG_BYTES)

    const loaded = templateToLoaded(useTemplateStore.getState())
    expect(loaded.placeholders.has('keep.png')).toBe(true)
    expect(loaded.placeholders.has('orphan.png')).toBe(false)
    expect(loaded.staticImages.has('orphan-static.png')).toBe(false)
  })

  it('Preview: a mode-flipped field keeps exactly the pool the renderer reads', () => {
    const store = useTemplateStore.getState()
    addDynamicImage('img-flip', 'photo', 'flip.png')
    store.addPlaceholder('flip.png', PNG_BYTES)

    store.setFieldMode('img-flip', 'static')

    const loaded = templateToLoaded(useTemplateStore.getState())
    // Static now — the renderer reads staticImages; the stale placeholder
    // copy is swept from the handover (it stays in the store for undo).
    expect(loaded.staticImages.has('flip.png')).toBe(true)
    expect(loaded.placeholders.has('flip.png')).toBe(false)
  })
})
