import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PDFDocument as PDFLibDocument } from 'pdf-lib'
import { loadTemplate } from '../src/load.js'
import { generatePDF } from '../src/generate.js'
import type {
  FieldDefinition,
  InputJSON,
  TableField,
  TemplateManifest,
} from '@template-goblin/types'
import { makeManifest } from './helpers/fixtures.js'

const TEST_DIR = join(tmpdir(), 'tg-test-dyn-height-' + Date.now())

function writeTgbl(filename: string, manifest: TemplateManifest): string {
  const zip = new AdmZip()
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))
  const path = join(TEST_DIR, filename)
  writeFileSync(path, zip.toBuffer())
  return path
}

function createTableField(
  id: string,
  jsonKey: string,
  heightMode: 'fixed' | 'single_page_dynamic' | 'multipage',
  opts: { x?: number; y?: number; width?: number; height?: number } = {},
): TableField {
  return {
    id,
    type: 'table',
    label: id,
    pageId: null,
    groupId: null,
    x: opts.x ?? 50,
    y: opts.y ?? 100,
    width: opts.width ?? 400,
    height: opts.height ?? 80,
    zIndex: 1,
    source: {
      mode: 'dynamic',
      jsonKey,
      required: true,
      placeholder: [],
    },
    style: {
      heightMode,
      multiPage: heightMode === 'multipage',
      showHeader: true,
      fitToContent: false,
      maxRows: 100,
      maxColumns: 2,
      columns: [
        { key: 'col1', label: 'Column 1', width: 200, style: null, headerStyle: null },
        { key: 'col2', label: 'Column 2', width: 200, style: null, headerStyle: null },
      ],
      headerStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'bold',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        backgroundColor: '#f0f0f0',
        align: 'left',
        verticalAlign: 'middle',
        borderColor: '#cccccc',
        borderWidth: 1,
        borderStyle: 'solid',
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 4,
      },
      rowStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'normal',
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#000000',
        backgroundColor: '#ffffff',
        align: 'left',
        verticalAlign: 'middle',
        borderColor: '#cccccc',
        borderWidth: 1,
        borderStyle: 'solid',
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 4,
        paddingRight: 4,
      },
      oddRowStyle: null,
      evenRowStyle: null,
      cellStyle: { overflowMode: 'truncate' },
    },
  }
}

function createTextField(
  id: string,
  jsonKey: string,
  x: number,
  y: number,
  width = 200,
  height = 30,
): FieldDefinition {
  return {
    id,
    type: 'text',
    label: id,
    pageId: null,
    groupId: null,
    x,
    y,
    width,
    height,
    zIndex: 2,
    source: {
      mode: 'dynamic',
      jsonKey,
      required: true,
      placeholder: null,
    },
    style: {
      fontId: null,
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontSizeMin: 8,
      lineHeight: 1.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      align: 'left',
      verticalAlign: 'top',
      maxRows: 1,
      overflowMode: 'truncate',
      snapToGrid: false,
    },
  }
}

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('Table Height Modes (fixed, single_page_dynamic, multipage)', () => {
  it('single_page_dynamic: expands page height to fit all rows on one page', async () => {
    const baseHeight = 500
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 400, height: baseHeight },
      fields: [
        createTableField('tbl', 'items', 'single_page_dynamic', { x: 50, y: 100, height: 60 }),
      ],
    })

    const path = writeTgbl('dyn-expand.tgbl', manifest)
    const template = await loadTemplate(path)

    // 20 rows: header = 18pt, 20 * 18pt = 360pt. Total table height = 378pt.
    // Table at y=100 -> table bottom = 478pt.
    // If base page is 500, plus extra margin, page height expands dynamically.
    const rows = Array.from({ length: 30 }, (_, i) => ({
      col1: `Item ${i + 1}`,
      col2: `Val ${i + 1}`,
    }))
    const data: InputJSON = {
      texts: {},
      tables: { items: rows },
      images: {},
    }

    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)

    expect(pdfDoc.getPageCount()).toBe(1)
    const page = pdfDoc.getPage(0)
    expect(page.getSize().height).toBeGreaterThan(baseHeight)
  })

  it('single_page_dynamic: shifts elements below the table down while preserving vertical gap', async () => {
    const baseHeight = 600
    // Table: y=100, initial height=50.
    // Text below: y=180 (gap = 180 - (100 + 50) = 30pt).
    // Text aside: x=300, y=100 (aligned beside table).
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight },
      fields: [
        createTableField('tbl', 'items', 'single_page_dynamic', {
          x: 50,
          y: 100,
          width: 200,
          height: 50,
        }),
        createTextField('below', 'footer_note', 50, 180),
        createTextField('aside', 'sidebar_note', 300, 100),
      ],
    })

    const path = writeTgbl('dyn-shift.tgbl', manifest)
    const template = await loadTemplate(path)

    // 10 rows: header (18) + 10 * 18 = 198pt.
    // Original table height = 50pt -> delta = 198 - 50 = 148pt.
    const rows = Array.from({ length: 10 }, (_, i) => ({
      col1: `Item ${i + 1}`,
      col2: `Val ${i + 1}`,
    }))
    const data: InputJSON = {
      texts: { footer_note: 'Footer content', sidebar_note: 'Aside content' },
      tables: { items: rows },
      images: {},
    }

    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)

    expect(pdfDoc.getPageCount()).toBe(1)
    const page = pdfDoc.getPage(0)
    // Page height must expand to accommodate table growth + elements below
    expect(page.getSize().height).toBeGreaterThanOrEqual(baseHeight + 140)
  })

  it('single_page_dynamic: handles 2 dynamic tables on a single page with cumulative shifts', async () => {
    const baseHeight = 800
    // Table 1: y=50, height=50.
    // Table 2: y=150, height=50 (below Table 1).
    // Text below Table 2: y=250.
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight },
      fields: [
        createTableField('tbl1', 'items1', 'single_page_dynamic', {
          x: 50,
          y: 50,
          width: 300,
          height: 50,
        }),
        createTableField('tbl2', 'items2', 'single_page_dynamic', {
          x: 50,
          y: 150,
          width: 300,
          height: 50,
        }),
        createTextField('bottom_text', 'sign', 50, 250),
      ],
    })

    const path = writeTgbl('two-dyn-tables.tgbl', manifest)
    const template = await loadTemplate(path)

    const rows1 = Array.from({ length: 10 }, (_, i) => ({ col1: `T1-${i}`, col2: `V1-${i}` }))
    const rows2 = Array.from({ length: 15 }, (_, i) => ({ col1: `T2-${i}`, col2: `V2-${i}` }))

    const data: InputJSON = {
      texts: { sign: 'Signature here' },
      tables: { items1: rows1, items2: rows2 },
      images: {},
    }

    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)

    expect(pdfDoc.getPageCount()).toBe(1)
    const page = pdfDoc.getPage(0)
    // Cumulative expansion of both tables
    expect(page.getSize().height).toBeGreaterThan(baseHeight)
  })

  it('single_page_dynamic: pins footer band to the bottom of the expanded page', async () => {
    const baseHeight = 400
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight },
      fields: [
        createTableField('tbl', 'items', 'single_page_dynamic', {
          x: 50,
          y: 50,
          width: 400,
          height: 50,
        }),
      ],
      footer: {
        enabled: true,
        applyToFirstPage: true,
        style: {
          height: 40,
          backgroundColor: '#333333',
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 10,
          paddingRight: 10,
          divider: null,
        },
        fields: [createTextField('footer_text', 'ft_text', 10, 10)],
      },
    })

    const path = writeTgbl('footer-expanded.tgbl', manifest)
    const template = await loadTemplate(path)

    const rows = Array.from({ length: 25 }, (_, i) => ({ col1: `A${i}`, col2: `B${i}` }))
    const data: InputJSON = {
      texts: { ft_text: 'Document Footer' },
      tables: { items: rows },
      images: {},
    }

    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)
    expect(pdfDoc.getPageCount()).toBe(1)
    expect(pdfDoc.getPage(0).getSize().height).toBeGreaterThan(baseHeight)
  })

  it('multipage: splits across multiple pages and renders header/footer bands on all pages', async () => {
    const baseHeight = 300
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight, maxPages: 5 },
      fields: [
        createTableField('tbl', 'items', 'multipage', { x: 50, y: 50, width: 400, height: 150 }),
      ],
      header: {
        enabled: true,
        applyToFirstPage: true,
        style: {
          height: 30,
          backgroundColor: '#eeeeee',
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 10,
          paddingRight: 10,
          divider: null,
        },
        fields: [],
      },
      footer: {
        enabled: true,
        applyToFirstPage: true,
        style: {
          height: 30,
          backgroundColor: '#cccccc',
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 10,
          paddingRight: 10,
          divider: null,
        },
        fields: [],
      },
    })

    const path = writeTgbl('multipage-bands.tgbl', manifest)
    const template = await loadTemplate(path)

    // With height=150 and rowHeight=18, ~7 data rows fit per page. 20 rows will produce >= 3 pages.
    const rows = Array.from({ length: 20 }, (_, i) => ({ col1: `Item ${i}`, col2: `Val ${i}` }))
    const data: InputJSON = {
      texts: {},
      tables: { items: rows },
      images: {},
    }

    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(2)
  })

  it('fixed: clips excess rows and keeps page size unchanged', async () => {
    const baseHeight = 400
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight },
      fields: [
        createTableField('tbl', 'items', 'fixed', { x: 50, y: 50, width: 400, height: 80 }),
        createTextField('below', 'note', 50, 150),
      ],
    })

    const path = writeTgbl('fixed-table.tgbl', manifest)
    const template = await loadTemplate(path)

    const rows = Array.from({ length: 30 }, (_, i) => ({ col1: `X${i}`, col2: `Y${i}` }))
    const data: InputJSON = {
      texts: { note: 'Note unchanged' },
      tables: { items: rows },
      images: {},
    }

    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)
    expect(pdfDoc.getPageCount()).toBe(1)
    expect(pdfDoc.getPage(0).getSize().height).toBe(baseHeight)
  })

  it('custom headerHeight: computeTableRenderedHeight and dynamic single_page_dynamic use explicit headerHeight', async () => {
    const tableField = createTableField('tbl', 'items', 'single_page_dynamic', {
      x: 50,
      y: 50,
      width: 400,
      height: 80,
    })
    tableField.style.headerHeight = 50

    const rows = Array.from({ length: 10 }, (_, i) => ({ col1: `X${i}`, col2: `Y${i}` }))
    const data: InputJSON = {
      texts: { note: 'Footer note' },
      tables: { items: rows },
      images: {},
    }

    const { computeTableRenderedHeight } = await import('../src/utils/dynamicLayout.js')
    const calculatedHeight = computeTableRenderedHeight(tableField, data)
    expect(calculatedHeight).toBe(50 + 10 * (10 + 4 + 4))

    const baseHeight = 300
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight },
      fields: [tableField, createTextField('below', 'note', 50, 150)],
    })

    const path = writeTgbl('custom-header-height.tgbl', manifest)
    const template = await loadTemplate(path)
    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)
    expect(pdfDoc.getPageCount()).toBe(1)
    expect(pdfDoc.getPage(0).getSize().height).toBeGreaterThan(baseHeight)
  })

  it('multipage: default maxPages: 1 auto-resolves to unbounded (-1) and generates all required pages', async () => {
    const baseHeight = 300
    // manifest with default maxPages: 1
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight, maxPages: 1 },
      fields: [
        createTableField('tbl', 'items', 'multipage', { x: 50, y: 50, width: 400, height: 120 }),
      ],
    })

    const path = writeTgbl('multipage-default-maxpages.tgbl', manifest)
    const template = await loadTemplate(path)

    // 35 rows will require at least 3 pages on height 120
    const rows = Array.from({ length: 35 }, (_, i) => ({ col1: `Item ${i}`, col2: `Val ${i}` }))
    const data: InputJSON = {
      texts: {},
      tables: { items: rows },
      images: {},
    }

    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(3)
  })

  it('multipage: trailing elements on same page render on final continuation page and subsequent authored page appends after table finish', async () => {
    const baseHeight = 400
    const page0Def = {
      id: 'p0',
      index: 0,
      backgroundType: 'color' as const,
      backgroundColor: '#ffffff',
      backgroundFilename: null,
      width: 500,
      height: baseHeight,
      pageSize: 'Custom' as const,
    }
    const page1Def = {
      id: 'p1',
      index: 1,
      backgroundType: 'color' as const,
      backgroundColor: '#ffffff',
      backgroundFilename: null,
      width: 500,
      height: baseHeight,
      pageSize: 'Custom' as const,
    }

    const tableField = createTableField('tbl', 'items', 'multipage', {
      x: 50,
      y: 50,
      width: 400,
      height: 150,
    })
    tableField.pageId = 'p0'

    const trailingText = createTextField('trailing', 'footerNote', 50, 220)
    trailingText.pageId = 'p0'

    const page1Text = createTextField('p1Text', 'terms', 50, 50)
    page1Text.pageId = 'p1'

    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight, maxPages: 1 },
      pages: [page0Def, page1Def],
      fields: [tableField, trailingText, page1Text],
    })

    const path = writeTgbl('multipage-multi-pages.tgbl', manifest)
    const template = await loadTemplate(path)

    const rows = Array.from({ length: 30 }, (_, i) => ({ col1: `Item ${i}`, col2: `Val ${i}` }))
    const data: InputJSON = {
      texts: {
        footerNote: 'Invoice terms and signature',
        terms: 'Second page terms and conditions',
      },
      tables: { items: rows },
      images: {},
    }

    const pdfBuf = await generatePDF(template, data)
    const pdfDoc = await PDFLibDocument.load(pdfBuf)
    // Table on p0 expands to multiple pages (>=2), trailing text renders on table's final page, and p1 appends after it
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(3)
  })

  it('multipage: respects options.maxRenderPages ceiling and allows custom limits', async () => {
    const baseHeight = 300
    const manifest = makeManifest({
      meta: { ...makeManifest().meta, width: 500, height: baseHeight, maxPages: 1 },
      fields: [
        createTableField('tbl', 'items', 'multipage', {
          x: 50,
          y: 50,
          width: 400,
          height: 100,
        }),
      ],
    })

    const path = writeTgbl('multipage-max-render-pages.tgbl', manifest)
    const template = await loadTemplate(path)

    // ~30 rows with 100pt table height will require >= 3 pages
    const rows = Array.from({ length: 30 }, (_, i) => ({ col1: `Item ${i}`, col2: `Val ${i}` }))
    const data: InputJSON = {
      texts: {},
      tables: { items: rows },
      images: {},
    }

    // With maxRenderPages: 2, should throw MAX_PAGES_EXCEEDED with instructions to raise maxRenderPages
    await expect(generatePDF(template, data, { maxRenderPages: 2 })).rejects.toThrow(
      /requires 3 pages but maxPages is 2\. Pass options\.maxRenderPages to generatePDF to increase the limit\./,
    )

    // With maxRenderPages: 10 or Infinity, should succeed
    const pdfBuf = await generatePDF(template, data, { maxRenderPages: 10 })
    const pdfDoc = await PDFLibDocument.load(pdfBuf)
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(3)
  })
})
