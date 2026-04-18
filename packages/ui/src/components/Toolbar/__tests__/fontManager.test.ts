/**
 * Font Manager — multi-file upload (bugs.md → Fonts §).
 *
 * Contract:
 *   When the user selects more than one font file in the file-input dialog,
 *   every valid file should land in the store as its own entry with a
 *   distinct font ID. Today `FontManager.tsx` pulls `e.target.files?.[0]`
 *   and drops the rest; the Dev fix is to add `multiple` to the input and
 *   iterate `FileList`.
 *
 * This test lives at the store level because the UI package has no jsdom /
 * @testing-library in its deps (see packages/ui/package.json), so we cannot
 * render `<FontManager />` and fire a change event. The **behaviour under
 * test** is: processing a FileList of two valid .ttf files results in the
 * store holding two fonts.
 *
 * Implementation hook (expected after Dev lands the fix):
 *   `packages/ui/src/components/Toolbar/fontUpload.ts` exports
 *     `processFontFiles(files: File[] | FileList): Promise<void>`
 *   which internally calls `useTemplateStore.getState().addFont(...)` for
 *   every valid file.
 *
 * If the Dev prefers to inline the loop inside FontManager.tsx and NOT
 * extract a helper, this test will stay RED with its import error — leave
 * it RED and note in the QA report: the product change is covered by an
 * e2e regression instead.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Stub localStorage before importing the store — the zustand persist
// middleware hits it on every `setState` and node-env tests don't ship one.
const __storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => __storage.get(key) ?? null,
  setItem: (key: string, value: string) => __storage.set(key, value),
  removeItem: (key: string) => __storage.delete(key),
  clear: () => __storage.clear(),
})

/**
 * Minimal FileReader shim (Node has no FileReader by default). `processFontFiles`
 * uses `new FileReader()` and awaits `onload`. Our stub reads the ArrayBuffer
 * out of the File synchronously, then calls `onload` on the next microtask.
 */
class FileReaderShim {
  result: ArrayBuffer | string | null = null
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  readAsArrayBuffer(file: Blob) {
    ;(file as Blob).arrayBuffer().then(
      (buf) => {
        this.result = buf
        this.onload?.()
      },
      () => {
        this.onerror?.()
      },
    )
  }
}
vi.stubGlobal('FileReader', FileReaderShim)

import { useTemplateStore } from '../../../store/templateStore.js'
// Multi-upload helper extracted into its own module so the Dev UI component
// stays thin and the behaviour is unit-testable without rendering React.
import { processFontFiles } from '../fontUpload'

/**
 * Build a valid TTF ArrayBuffer from magic bytes so the font-validation
 * branch accepts the file. The leading uint32 0x00010000 is the "TrueType"
 * version tag (see OpenType spec).
 */
function makeTtfBuffer(): ArrayBuffer {
  const buf = new ArrayBuffer(128)
  const view = new DataView(buf)
  view.setUint32(0, 0x00010000) // TrueType magic
  return buf
}

/** Construct a minimal File-like object acceptable to the upload helper. */
function makeFontFile(name: string): File {
  const buf = makeTtfBuffer()
  return new File([buf], name, { type: 'font/ttf' })
}

describe('FontManager — multi-file upload', () => {
  beforeEach(() => {
    // Reset store fonts before each test so the count assertions are deterministic.
    useTemplateStore.setState({
      fonts: [],
      fontBuffers: new Map(),
    })
  })

  it('processing a FileList of two fonts adds two entries with distinct IDs', async () => {
    const a = makeFontFile('Inter-Regular.ttf')
    const b = makeFontFile('Roboto-Regular.ttf')
    // Cast: real <input type="file"> returns a FileList; we mimic with an array.
    await processFontFiles([a, b])

    const fonts = useTemplateStore.getState().fonts
    expect(fonts).toHaveLength(2)
    const ids = new Set(fonts.map((f) => f.id))
    expect(ids.size).toBe(2)
  })

  it('each entry keeps the original base filename (sans .ttf)', async () => {
    await processFontFiles([makeFontFile('Inter-Regular.ttf'), makeFontFile('Roboto-Regular.ttf')])
    const names = useTemplateStore
      .getState()
      .fonts.map((f) => f.name)
      .sort()
    expect(names).toEqual(['Inter-Regular', 'Roboto-Regular'])
  })

  it('each entry has its own buffer stored under its font ID', async () => {
    const files = [makeFontFile('A.ttf'), makeFontFile('B.ttf')]
    await processFontFiles(files)
    const state = useTemplateStore.getState()
    for (const f of state.fonts) {
      expect(state.fontBuffers.get(f.id)).toBeDefined()
    }
  })

  it('empty FileList is a no-op', async () => {
    await processFontFiles([])
    expect(useTemplateStore.getState().fonts).toHaveLength(0)
  })
})
