/**
 * Regression tests for GH #50 — the placeholder-bitmap save/load round-trip.
 *
 * Save writes placeholders under the `placeholders/` directory in the .tgbl
 * archive. Before the fix, the UI's `openTemplate` looked for the bitmap at
 * the bare filename (no directory prefix), missed it, and rehydrated with an
 * empty `placeholderBuffers` Map — so the canvas fell back to the filename
 * text, and a subsequent re-save produced an archive missing every
 * placeholder. These tests pin the round-trip behaviour so that drift can't
 * come back silently.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

vi.stubGlobal(
  'Blob',
  class BlobStub {
    constructor(
      public parts: unknown[],
      public opts: { type?: string } = {},
    ) {}
    get type() {
      return this.opts.type ?? ''
    }
  },
)

import { openTemplate } from '../saveOpen.js'
import { useTemplateStore } from '../../store/templateStore.js'

const PLACEHOLDER_FILENAME = 'placeholder-field-1-dp.png'
// 8-byte stand-in payload — `openTemplate` doesn't decode the image, just
// stuffs the bytes into the store. Real PNG header / body irrelevant here.
const PLACEHOLDER_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function buildManifest() {
  return {
    version: '1.0',
    meta: {
      name: 'T',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    fonts: [],
    groups: [],
    pages: [],
    fields: [
      {
        id: 'field-1',
        type: 'image',
        groupId: null,
        pageId: null,
        label: '',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        zIndex: 0,
        style: { fit: 'contain' },
        source: {
          mode: 'dynamic',
          jsonKey: 'photo',
          required: true,
          placeholder: { filename: PLACEHOLDER_FILENAME },
        },
      },
    ],
  }
}

async function buildTgbl(opts: {
  /** Where to put the placeholder file: `'placeholders/'` (canonical save
   *  location) or `''` (legacy / bare filename). */
  prefix: 'placeholders/' | ''
  /** Omit the bitmap entirely to assert graceful handling. */
  omit?: boolean
}): Promise<File> {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(buildManifest()))
  if (!opts.omit) {
    zip.file(`${opts.prefix}${PLACEHOLDER_FILENAME}`, PLACEHOLDER_BYTES)
  }
  const blob = await zip.generateAsync({ type: 'arraybuffer' })
  return new File([blob], 'tpl.tgbl', { type: 'application/zip' })
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('openTemplate — placeholder bitmap location (GH #50)', () => {
  it('finds the bitmap under `placeholders/<filename>` (canonical save layout)', async () => {
    const file = await buildTgbl({ prefix: 'placeholders/' })
    await openTemplate(file)
    const buf = useTemplateStore.getState().placeholderBuffers.get(PLACEHOLDER_FILENAME)
    expect(buf).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(buf!)).toEqual(PLACEHOLDER_BYTES)
  })

  it('falls back to the bare filename for legacy archives without the prefix', async () => {
    // Hand-patched / pre-`placeholders/`-folder archives stored bitmaps at
    // the root; the load path must still resolve them so users don't lose
    // their placeholders on the first reopen.
    const file = await buildTgbl({ prefix: '' })
    await openTemplate(file)
    const buf = useTemplateStore.getState().placeholderBuffers.get(PLACEHOLDER_FILENAME)
    expect(buf).toBeInstanceOf(ArrayBuffer)
    expect(new Uint8Array(buf!)).toEqual(PLACEHOLDER_BYTES)
  })

  it('does not crash when the placeholder is missing entirely', async () => {
    const file = await buildTgbl({ prefix: 'placeholders/', omit: true })
    await openTemplate(file)
    // The field stays in the manifest — only the bitmap is missing. Canvas
    // falls back to the filename label rendering, which is acceptable
    // (and visibly indicates the broken reference to the user).
    const buf = useTemplateStore.getState().placeholderBuffers.get(PLACEHOLDER_FILENAME)
    expect(buf).toBeUndefined()
    expect(useTemplateStore.getState().fields).toHaveLength(1)
  })
})
