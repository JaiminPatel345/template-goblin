/**
 * openTemplate must load image assets referenced by header/footer band
 * fields (#61). Pre-fix the two asset-loading loops walked
 * `manifest.fields` only — a saved header/footer logo rendered blank
 * after open, PDF preview failed preflight with MISSING_ASSET, and the
 * next save's orphan sweep dropped the bytes from the archive for good.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => storage.get(k) ?? null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
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
// Node has no FileReader — openTemplate only uses it to build data-URL
// MIRRORS of the binary buffers; the buffers themselves are what we assert.
vi.stubGlobal(
  'FileReader',
  class FileReaderStub {
    result: string | null = null
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    readAsDataURL(_blob: unknown) {
      this.result = 'data:image/png;base64,c3R1Yg=='
      queueMicrotask(() => this.onload?.())
    }
  },
)

import { openTemplate } from '../saveOpen.js'
import { useTemplateStore } from '../../store/templateStore.js'

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const BAND_STYLE = {
  height: 40,
  backgroundColor: null,
  divider: null,
  paddingTop: 4,
  paddingBottom: 4,
  paddingLeft: 12,
  paddingRight: 12,
}

function bandImageField(id: string, source: object) {
  return {
    id,
    type: 'image',
    groupId: null,
    pageId: null,
    label: id,
    x: 0,
    y: 0,
    width: 20,
    height: 20,
    zIndex: 1,
    style: { fit: 'contain' },
    source,
  }
}

function buildManifest() {
  return {
    version: '1.0',
    meta: {
      name: 'BandAssets',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    fonts: [],
    groups: [],
    pages: [],
    fields: [],
    header: {
      enabled: true,
      applyToFirstPage: true,
      style: BAND_STYLE,
      fields: [
        bandImageField('hdr-logo', { mode: 'static', value: { filename: 'logo.png' } }),
        bandImageField('hdr-photo', {
          mode: 'dynamic',
          jsonKey: 'photo',
          required: false,
          placeholder: { filename: 'dp.png' },
        }),
      ],
    },
  }
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('openTemplate — band-field image assets (#61)', () => {
  it('loads static + placeholder bytes referenced only by band fields', async () => {
    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify(buildManifest()))
    zip.file('images/logo.png', PNG_BYTES)
    zip.file('placeholders/dp.png', PNG_BYTES)
    const blob = await zip.generateAsync({ type: 'arraybuffer' })
    await openTemplate(new File([blob], 'tpl.tgbl', { type: 'application/zip' }))

    const state = useTemplateStore.getState()
    expect(state.header?.fields).toHaveLength(2)
    // Pre-fix both maps stayed EMPTY for band-only references.
    expect(state.staticImageBuffers.has('logo.png')).toBe(true)
    expect(state.placeholderBuffers.has('dp.png')).toBe(true)
  })
})
