/**
 * Edge case test suite for preparedTemplate, generatePreparedPDF, and worker pool.
 */
import { join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import type { LoadedTemplate, PageDefinition, TemplateManifest } from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { prepareTemplate } from '../src/prepare.js'
import { generatePreparedPDF } from '../src/generatePrepared.js'
import { generateBatchPDF } from '../src/batch.js'
import { parsePdfGeometry, pageText } from './helpers/pdfGeometry.js'
import {
  dynText,
  dynTable,
  dynImage,
  makeManifest,
  staticImage,
  staticText,
} from './helpers/fixtures.js'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)
const TINY_DATA_URL = `data:image/png;base64,${TINY_PNG.toString('base64')}`

const TEST_WORKER = join(__dirname, 'helpers/mockWorker.cjs')

function loaded(manifest: TemplateManifest, over: Partial<LoadedTemplate> = {}): LoadedTemplate {
  return {
    manifest,
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
    ...over,
  }
}

describe('Prepared Template Edge Cases', () => {
  it('header band z-order interleaving makes template ineligible', async () => {
    const manifest = makeManifest({ fields: [] })
    manifest.header = {
      enabled: true,
      applyToFirstPage: true,
      style: {
        height: 40,
        backgroundColor: '#f0f0f0',
        divider: null,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 8,
        paddingRight: 8,
      },
      fields: [
        { ...staticText('h_stat', 'Header Static'), zIndex: 10 },
        { ...dynText('h_dyn', 'header_key', false), zIndex: 2 },
      ],
    }
    const res = await prepareTemplate(loaded(manifest))
    expect(res.eligible).toBe(false)
    expect(res.reason).toMatch(/header fields interleave z-order/i)
  })

  it('footer band z-order interleaving makes template ineligible', async () => {
    const manifest = makeManifest({ fields: [] })
    manifest.footer = {
      enabled: true,
      applyToFirstPage: true,
      style: {
        height: 40,
        backgroundColor: '#f0f0f0',
        divider: null,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 8,
        paddingRight: 8,
      },
      fields: [
        { ...staticText('f_stat', 'Footer Static'), zIndex: 10 },
        { ...dynText('f_dyn', 'footer_key', false), zIndex: 2 },
      ],
    }
    const res = await prepareTemplate(loaded(manifest))
    expect(res.eligible).toBe(false)
    expect(res.reason).toMatch(/footer fields interleave z-order/i)
  })

  it('handles all data types (text, image, table) in dynamic overlay', async () => {
    const manifest = makeManifest({
      fields: [
        staticImage('logo', 'logo.png', { x: 20, y: 20, width: 80, height: 60, zIndex: 0 }),
        { ...dynText('t1', 'title', false), x: 20, y: 100, width: 200, height: 30, zIndex: 1 },
        { ...dynImage('img1', 'avatar', false), x: 20, y: 140, width: 100, height: 100, zIndex: 1 },
        {
          ...dynTable('tbl1', 'rows', false, ['col1']),
          x: 20,
          y: 250,
          width: 200,
          height: 100,
          zIndex: 1,
        },
      ],
    })

    const tpl = loaded(manifest, { staticImages: new Map([['logo.png', TINY_PNG]]) })
    const prepared = await prepareTemplate(tpl)
    expect(prepared.eligible).toBe(true)

    const data = {
      texts: { title: 'Dynamic Title' },
      images: { avatar: TINY_DATA_URL },
      tables: { rows: [{ col1: 'Row 1' }] },
      links: {},
    }

    const fast = await generatePreparedPDF(prepared, data)
    const full = await generatePDF(tpl, data)

    const fastGeo = await parsePdfGeometry(fast)
    const fullGeo = await parsePdfGeometry(full)

    expect(fastGeo.length).toBe(1)
    expect(fullGeo.length).toBe(1)
    expect(pageText(fastGeo[0]!)).toContain('Dynamic Title')
    expect(pageText(fastGeo[0]!)).toContain('Row 1')
  })

  it('supports per-page background colors and images in static base', async () => {
    const page0: PageDefinition = {
      id: 'p0',
      index: 0,
      backgroundType: 'color',
      backgroundColor: '#ffaaaa',
      backgroundFilename: null,
      width: 595,
      height: 842,
      pageSize: 'A4',
    }
    const manifest = makeManifest({
      pages: [page0],
      fields: [
        staticText('s1', 'Static On Colored Bg'),
        { ...dynText('d1', 'dyn_field', false), zIndex: 5 },
      ],
    })

    const prepared = await prepareTemplate(loaded(manifest))
    expect(prepared.eligible).toBe(true)

    const pdf = await generatePreparedPDF(prepared, {
      texts: { dyn_field: 'Dynamic On Red' },
      images: {},
      tables: {},
      links: {},
    })
    expect(pdf.length).toBeGreaterThan(0)
    const geo = await parsePdfGeometry(pdf)
    expect(pageText(geo[0]!)).toContain('Static On Colored Bg')
    expect(pageText(geo[0]!)).toContain('Dynamic On Red')
  })

  it('multi-page template with distinct per-page sizes renders matching viewports', async () => {
    const page0: PageDefinition = {
      id: 'p0',
      index: 0,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundFilename: null,
      width: 595,
      height: 842,
      pageSize: 'A4',
    }
    const page1: PageDefinition = {
      id: 'p1',
      index: 1,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundFilename: null,
      width: 842,
      height: 1191,
      pageSize: 'A3',
    }

    const manifest: TemplateManifest = {
      ...makeManifest({
        fields: [
          { ...staticText('s0', 'Page 0 Header'), pageId: 'p0', zIndex: 0 },
          { ...dynText('d0', 'val0', false), pageId: 'p0', zIndex: 1 },
          { ...staticText('s1', 'Page 1 Header'), pageId: 'p1', zIndex: 0 },
          { ...dynText('d1', 'val1', false), pageId: 'p1', zIndex: 1 },
        ],
      }),
      pages: [page0, page1],
    }

    const prepared = await prepareTemplate(loaded(manifest))
    expect(prepared.eligible).toBe(true)

    const pdf = await generatePreparedPDF(prepared, {
      texts: { val0: 'Val Page 0', val1: 'Val Page 1' },
      images: {},
      tables: {},
      links: {},
    })

    const doc = await PDFDocument.load(pdf)
    expect(doc.getPageCount()).toBe(2)
    expect(doc.getPage(0).getWidth()).toBe(595)
    expect(doc.getPage(0).getHeight()).toBe(842)
    expect(doc.getPage(1).getWidth()).toBe(842)
    expect(doc.getPage(1).getHeight()).toBe(1191)
  })
})

describe('Batch Parallel Worker Pool Edge Cases', () => {
  it('runs parallel batch PDF generation with concurrency = 2', async () => {
    const manifest = makeManifest({
      fields: [
        staticImage('logo', 'logo.png', { x: 0, y: 0, width: 50, height: 50, zIndex: 0 }),
        { ...dynText('d1', 'name', true), zIndex: 1 },
      ],
    })
    const tpl = loaded(manifest, { staticImages: new Map([['logo.png', TINY_PNG]]) })

    const batchData = [
      { texts: { name: 'Item 1' }, images: {}, tables: {}, links: {} },
      { texts: { name: 'Item 2' }, images: {}, tables: {}, links: {} },
      { texts: { name: 'Item 3' }, images: {}, tables: {}, links: {} },
      { texts: { name: 'Item 4' }, images: {}, tables: {}, links: {} },
    ]

    const results = await generateBatchPDF(tpl, batchData, {
      parallel: true,
      concurrency: 2,
      workerPath: TEST_WORKER,
    })

    expect(results).toHaveLength(4)
    for (const r of results) {
      expect(r.success).toBe(true)
      expect(r.pdf).toBeInstanceOf(Buffer)
      expect(r.pdf!.toString('utf-8', 0, 5)).toBe('%PDF-')
    }
  }, 20_000)

  it('parallel worker pool handles mixed valid and error inputs gracefully', async () => {
    const manifest = makeManifest({
      fields: [{ ...dynText('d1', 'name', true), zIndex: 1 }],
    })
    const tpl = loaded(manifest)

    const batchData = [
      { texts: { name: 'Valid 1' }, images: {}, tables: {}, links: {} },
      { texts: {}, images: {}, tables: {}, links: {} }, // Invalid (missing name)
      { texts: { name: 'Valid 2' }, images: {}, tables: {}, links: {} },
    ]

    const results = await generateBatchPDF(tpl, batchData, {
      parallel: true,
      concurrency: 2,
      workerPath: TEST_WORKER,
    })

    expect(results).toHaveLength(3)
    expect(results[0]!.success).toBe(true)
    expect(results[1]!.success).toBe(false)
    expect(results[1]!.error).toBeDefined()
    expect(results[2]!.success).toBe(true)
  }, 20_000)
})
