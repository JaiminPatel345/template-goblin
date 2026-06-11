/**
 * Master-QA regression suite — pins the fixes from the 2026-06 QA sweep:
 *
 *  1. `doc.addPage({ size })` must carry `margin: 0` — PDFKit's `addPage`
 *     REPLACES the constructor options, so pages after the first got 72pt
 *     default margins: content in the bottom strip triggered phantom
 *     auto-pagination and split clip q/Q pairs across pages.
 *  2. Band fields (#61) must be visible to validateData / preflight /
 *     loadTemplate — they render through the same `renderField` and data
 *     buckets as body fields.
 *  3. Per-page backgrounds must round-trip save → load (the writer used a
 *     synthetic `page-<index>.png` name while the loader resolves via
 *     `page.backgroundFilename`).
 *  4. `generateBatchPDF` must settle even when a worker dies without
 *     replying (only `exit` fires for an OS-killed child).
 *  5. Fields rendered after a multiPage table must land on their own page,
 *     not the table's last continuation page.
 *  6. `validateManifest` must tolerate legacy manifests without `pages`.
 */
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import type { LoadedTemplate, TemplateAssets, TemplateManifest } from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { generateBatchPDF } from '../src/batch.js'
import { validateData } from '../src/validate.js'
import { validateManifest } from '../src/validateManifest.js'
import { saveTemplate } from '../src/file/write.js'
import { loadTemplate } from '../src/load.js'
import { parsePdfGeometry, pageText } from './helpers/pdfGeometry.js'
import { dynText, dynTable, makeManifest, staticImage } from './helpers/fixtures.js'

// 1×1 red PNG — a real decodable image for static-asset checks.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const BAND_STYLE = {
  height: 50,
  backgroundColor: null,
  divider: null,
  paddingTop: 4,
  paddingBottom: 4,
  paddingLeft: 8,
  paddingRight: 8,
}

function loadedFrom(manifest: TemplateManifest, assets: Partial<LoadedTemplate> = {}): LoadedTemplate {
  return {
    manifest,
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
    ...assets,
  }
}

function twoPages() {
  return [
    {
      id: 'p0',
      index: 0,
      backgroundType: 'none' as const,
      backgroundColor: null,
      backgroundFilename: null,
    },
    {
      id: 'p1',
      index: 1,
      backgroundType: 'none' as const,
      backgroundColor: null,
      backgroundFilename: null,
    },
  ]
}

let tmpDir: string
beforeAll(() => {
  tmpDir = join(tmpdir(), `tgbl-qa-${randomUUID()}`)
  mkdirSync(tmpDir, { recursive: true })
})
afterAll(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

describe('addPage margins (phantom-page regression)', () => {
  it('content in the bottom 72pt of page 2 stays on page 2', async () => {
    const manifest = makeManifest({
      pages: twoPages(),
      fields: [
        { ...dynText('t0', 'a', false), pageId: 'p0', y: 10 },
        // Inside the bottom 72pt of an 842pt page — pre-fix this
        // auto-paginated onto a phantom page 3.
        { ...dynText('t1', 'b', false), pageId: 'p1', y: 800, height: 30 },
      ],
    })
    const pdf = await generatePDF(loadedFrom(manifest), {
      texts: { a: 'top text', b: 'bottom text' },
      images: {},
      tables: {},
    })
    const pages = await parsePdfGeometry(pdf)
    expect(pages).toHaveLength(2)
    expect(pageText(pages[1]!)).toContain('bottom text')
  })

  it('a multiPage table paginates by full page height (no 72pt dead strip)', async () => {
    const table = dynTable('tbl1', 'items', true)
    table.style.multiPage = true
    table.style.maxRows = 100
    table.pageId = 'p0'
    table.y = 700
    table.height = 120
    const manifest = makeManifest({
      pages: [twoPages()[0]!],
      fields: [table],
    })
    const rows = Array.from({ length: 20 }, (_, i) => ({ col: `row-${i}` }))
    const pdf = await generatePDF(loadedFrom(manifest), {
      texts: {},
      images: {},
      tables: { items: rows },
    })
    const pages = await parsePdfGeometry(pdf)
    // Every row present exactly once, regardless of page distribution.
    const all = pages.map((p) => pageText(p)).join('\n')
    for (let i = 0; i < 20; i++) {
      expect(all).toContain(`row-${i}`)
    }
    // And the continuation pages really were used (the table overflowed).
    expect(pages.length).toBeGreaterThan(1)
  })
})

describe('band fields are first-class in validate / preflight / load (#61)', () => {
  function manifestWithHeaderField(field: TemplateManifest['fields'][number]): TemplateManifest {
    // Body field placed BELOW the band zone — validateManifest enforces
    // body-outside-band.
    const manifest = makeManifest({ fields: [{ ...dynText('body', 'body_key', false), y: 100 }] })
    manifest.header = { enabled: true, style: BAND_STYLE, fields: [field] }
    return manifest
  }

  it('a required header text field missing from the data fails validateData', () => {
    const manifest = manifestWithHeaderField(dynText('h1', 'title', true))
    const result = validateData(loadedFrom(manifest), { texts: {}, images: {}, tables: {} })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.field === 'title')).toBe(true)
  })

  it('a static image in the header band loads from the archive and renders', async () => {
    const manifest = manifestWithHeaderField(staticImage('h-logo', 'logo.png'))
    const assets: TemplateAssets = {
      backgroundImage: null,
      pageBackgrounds: new Map(),
      fonts: new Map(),
      placeholders: new Map(),
      staticImages: new Map([['logo.png', TINY_PNG]]),
    }
    const path = join(tmpDir, 'band-logo.tgbl')
    await saveTemplate(manifest, assets, path)

    const loaded = await loadTemplate(path)
    // Pre-fix: loadTemplate skipped band fields → staticImages stayed empty
    // and the header logo rendered blank (or a re-save dropped the bytes).
    expect(loaded.staticImages.get('logo.png')).toEqual(TINY_PNG)

    // And the full render passes preflight + draws without throwing.
    const pdf = await generatePDF(loaded, { texts: {}, images: {}, tables: {} })
    expect(pdf.length).toBeGreaterThan(0)
  })
})

describe('per-page background filename round-trip', () => {
  it('writes backgrounds under page.backgroundFilename so loadTemplate finds them', async () => {
    const manifest = makeManifest({
      pages: [
        {
          id: 'page-abc',
          index: 0,
          backgroundType: 'image' as const,
          backgroundColor: null,
          backgroundFilename: 'backgrounds/page-abc.png',
        },
      ],
      fields: [],
    })
    const assets: TemplateAssets = {
      backgroundImage: null,
      pageBackgrounds: new Map([['page-abc', TINY_PNG]]),
      fonts: new Map(),
      placeholders: new Map(),
      staticImages: new Map(),
    }
    const path = join(tmpDir, 'bg-roundtrip.tgbl')
    await saveTemplate(manifest, assets, path)

    const loaded = await loadTemplate(path)
    expect(loaded.pageBackgrounds.get('page-abc')).toEqual(TINY_PNG)
  })
})

describe('generateBatchPDF worker death', () => {
  it('settles with a failure result instead of hanging when the worker exits silently', async () => {
    const deadWorker = join(tmpDir, 'dead-worker.cjs')
    writeFileSync(deadWorker, 'process.exit(3)\n')

    const manifest = makeManifest({ fields: [dynText('t', 'a', false)] })
    const input = { texts: {}, images: {}, tables: {} }
    const results = await Promise.race([
      generateBatchPDF(loadedFrom(manifest), [input, input], {
        workerPath: deadWorker,
        concurrency: 2,
      }),
      new Promise<'timeout'>((r) => setTimeout(() => r('timeout'), 15_000)),
    ])

    expect(results).not.toBe('timeout')
    const batch = results as Awaited<ReturnType<typeof generateBatchPDF>>
    expect(batch).toHaveLength(2)
    for (const r of batch) {
      expect(r.success).toBe(false)
      expect(r.error).toContain('exited before replying')
    }
  }, 20_000)
})

describe('fields after a multiPage table render on their own page', () => {
  it('a text field on page 1 stays there while the table overflows', async () => {
    const table = dynTable('tbl1', 'items', true)
    table.style.multiPage = true
    table.style.maxRows = 100
    table.pageId = 'p0'
    table.y = 600
    table.height = 200
    table.zIndex = 0
    const marker = { ...dynText('after', 'marker', false), pageId: 'p0', y: 40, zIndex: 5 }
    const manifest = makeManifest({ pages: twoPages(), fields: [table, marker] })

    const rows = Array.from({ length: 30 }, (_, i) => ({ col: `r${i}` }))
    const pdf = await generatePDF(loadedFrom(manifest), {
      texts: { marker: 'MARKER-TEXT' },
      images: {},
      tables: { items: rows },
    })
    const pages = await parsePdfGeometry(pdf)
    expect(pages.length).toBeGreaterThan(2) // the table really overflowed
    // Pre-fix the marker rendered on the table's LAST continuation page.
    expect(pageText(pages[0]!)).toContain('MARKER-TEXT')
    expect(pageText(pages[pages.length - 1]!)).not.toContain('MARKER-TEXT')
  })
})

describe('legacy manifests without pages', () => {
  it('validateManifest does not crash on a manifest with no pages array', () => {
    const manifest = makeManifest({ fields: [dynText('t', 'a', false)] })
    delete (manifest as Partial<TemplateManifest>).pages
    expect(() => validateManifest(manifest)).not.toThrow(TypeError)
  })
})
