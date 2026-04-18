/**
 * QA tests for the UI's `openTemplate` flow — security hardening.
 *
 * QA brief Part 4a: does the UI's open flow route manifest validation through
 * the core `validateManifest` (which rejects unsafe `source.jsonKey`), or does
 * it ship its own permissive validator?
 *
 * QA brief Part 4b: can a hostile `.tgbl` with `__proto__` as an object key
 * pollute Object.prototype via the load path?
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

// Browser globals that openTemplate uses but don't exist in happy-dom's jsdom
// equivalent here (vitest default is node). We stub them minimally.
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

// Build a minimal .tgbl File-like object for the test.
async function buildTgbl(manifest: unknown): Promise<File> {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest))
  const blob = await zip.generateAsync({ type: 'arraybuffer' })
  // File is required; vitest/node has File since Node 20.
  return new File([blob], 'hostile.tgbl', { type: 'application/zip' })
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('openTemplate — prototype pollution via manifest', () => {
  it('a manifest containing __proto__ does not pollute Object.prototype', async () => {
    // Stringify a manifest with a literal `__proto__` JSON key.
    // (JSON.parse keeps `__proto__` as a normal key, not the prototype slot,
    // so the sanitizeJson stripping pass is what's under test here.)
    const hostileJson = `{
      "version": "1.0",
      "meta": { "name": "x", "width": 595, "height": 842, "unit": "pt",
                "pageSize": "A4", "locked": false, "maxPages": 1,
                "createdAt": "2026-01-01T00:00:00Z",
                "updatedAt": "2026-01-01T00:00:00Z" },
      "fonts": [], "groups": [], "pages": [], "fields": [],
      "__proto__": { "polluted": "yes" }
    }`
    const zip = new JSZip()
    zip.file('manifest.json', hostileJson)
    const blob = await zip.generateAsync({ type: 'arraybuffer' })
    const file = new File([blob], 'p.tgbl')

    try {
      await openTemplate(file)
    } catch {
      // Opening may fail for unrelated reasons in node; we don't care.
    }

    // The real assertion: prototype not polluted regardless of open outcome.
    const probe: Record<string, unknown> = {}
    expect(probe.polluted).toBeUndefined()
  })

  it('a manifest with an unsafe jsonKey is rejected at open time', async () => {
    // Per spec 023 / validateManifest in core, `source.jsonKey` must pass
    // `isSafeKey`. Fix for BUG-004: openTemplate now routes the manifest
    // through the core `validateManifest`, so a hostile manifest with an
    // unsafe jsonKey is rejected up front rather than surfacing as a silent
    // runtime failure at PDF generation time.
    const manifest = {
      version: '1.0',
      meta: {
        name: 'x',
        width: 595,
        height: 842,
        unit: 'pt',
        pageSize: 'A4',
        locked: false,
        maxPages: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      fonts: [],
      groups: [],
      pages: [],
      fields: [
        {
          id: 'f1',
          type: 'text',
          groupId: null,
          pageId: null,
          label: '',
          source: { mode: 'dynamic', jsonKey: '__proto__', required: true, placeholder: null },
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
          },
        },
      ],
    }
    const file = await buildTgbl(manifest)
    let rejected = false
    let errMessage = ''
    try {
      await openTemplate(file)
    } catch (err) {
      rejected = true
      errMessage = err instanceof Error ? err.message : String(err)
    }

    expect(rejected).toBe(true)
    // Error message should reference the unsafe-jsonKey error code emitted by
    // `validateManifest` (INVALID_DYNAMIC_SOURCE per spec 023).
    expect(errMessage).toMatch(/INVALID_DYNAMIC_SOURCE/)
    // And nothing was loaded into the store.
    const fields = useTemplateStore.getState().fields
    expect(fields).toHaveLength(0)
  })
})
