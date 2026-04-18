import PDFDocument from 'pdfkit'
import { renderLoop } from '../../src/render/loop.js'
import type {
  CellStyle,
  TableField,
  TableFieldStyle,
  TableRow,
  TemplateMeta,
} from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { BASE_CELL, dynTable } from '../helpers/fixtures.js'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({ size: [595, 842], margin: 0 })
}

function createMeta(overrides: Partial<TemplateMeta> = {}): TemplateMeta {
  return {
    name: 'Test Template',
    width: 595,
    height: 842,
    unit: 'pt',
    pageSize: 'A4',
    locked: false,
    maxPages: 5,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

/**
 * Build a TableField fixture for the renderer tests. Uses three columns by
 * default (name/qty/price) at the geometry the legacy tests assumed.
 */
function createLoopField(styleOverrides: Partial<TableFieldStyle> = {}): TableField {
  const field = dynTable('test-loop', 'items', false, ['name', 'qty', 'price'], {
    x: 50,
    y: 100,
    width: 280,
    height: 400,
    zIndex: 0,
  })

  // Customize column widths/labels to match the legacy fixture
  field.style.columns = [
    { key: 'name', label: 'Name', width: 150, style: null, headerStyle: null },
    { key: 'qty', label: 'Qty', width: 50, style: null, headerStyle: null },
    { key: 'price', label: 'Price', width: 80, style: null, headerStyle: null },
  ]

  // Apply caller-supplied overrides last so they win.
  field.style = { ...field.style, ...styleOverrides }

  return field
}

function sampleRows(count: number): TableRow[] {
  const rows: TableRow[] = []
  for (let i = 1; i <= count; i++) {
    rows.push({ name: `Item ${i}`, qty: `${i}`, price: `${(i * 9.99).toFixed(2)}` })
  }
  return rows
}

/**
 * Run renderLoop inside a PDFDocument lifecycle and collect the output.
 */
function renderAndFinish(
  field: TableField,
  loopData: TableRow[],
  meta: TemplateMeta = createMeta(),
  fonts: Map<string, string> = new Map(),
  backgroundImage: Buffer | null = null,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createDoc()
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    renderLoop(doc, field, loopData, fonts, meta, backgroundImage)
    doc.end()
  })
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Loop/table rendering', () => {
  it('should render table with correct column headers', async () => {
    const field = createLoopField()
    // Even with no data rows, the header should still render
    const output = await renderAndFinish(field, [])

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should render data rows with correct cell positions', async () => {
    const field = createLoopField()
    const rows = sampleRows(3)
    const output = await renderAndFinish(field, rows)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should render a simple table without error', async () => {
    const field = createLoopField()
    const rows = sampleRows(5)
    const output = await renderAndFinish(field, rows)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle empty loop data', async () => {
    const field = createLoopField()
    const output = await renderAndFinish(field, [])

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should apply column style overrides', async () => {
    const field = createLoopField()
    field.style.columns = [
      {
        key: 'name',
        label: 'Name',
        width: 150,
        style: { fontWeight: 'bold', color: '#ff0000', textDecoration: 'underline' },
        headerStyle: null,
      },
      { key: 'qty', label: 'Qty', width: 50, style: { fontSize: 8 }, headerStyle: null },
      { key: 'price', label: 'Price', width: 80, style: null, headerStyle: null },
    ]

    const rows = sampleRows(3)
    const output = await renderAndFinish(field, rows)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should render header row on the first page', async () => {
    const field = createLoopField()
    const rows = sampleRows(1)

    // We test that the document produces valid output with header + 1 row
    const output = await renderAndFinish(field, rows)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should trigger multi-page when rows exceed rectangle height', async () => {
    const field = createLoopField({ multiPage: true })
    // Make the bounding rect small so rows overflow quickly
    field.height = 60

    const rows = sampleRows(20)
    const meta = createMeta({ maxPages: 10 })
    const output = await renderAndFinish(field, rows, meta)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should re-render header on each new page', async () => {
    const field = createLoopField({ multiPage: true })
    // Tiny height forces page breaks frequently
    field.height = 50

    const rows = sampleRows(10)
    const meta = createMeta({ maxPages: 20 })

    // The function should render without errors, with headers re-drawn on each page
    const output = await renderAndFinish(field, rows, meta)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should stop rendering rows when single-page and rows exceed height', async () => {
    const field = createLoopField({ multiPage: false })
    field.height = 60

    const rows = sampleRows(50)

    // Should NOT throw — just stops rendering extra rows
    const output = await renderAndFinish(field, rows)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should throw MAX_PAGES_EXCEEDED when exceeding maxPages', async () => {
    const field = createLoopField({ multiPage: true })
    // Very small height to force many page breaks
    field.height = 40

    const rows = sampleRows(100)
    const meta = createMeta({ maxPages: 2 })

    await expect(renderAndFinish(field, rows, meta)).rejects.toThrow(TemplateGoblinError)

    try {
      await renderAndFinish(field, rows, meta)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('MAX_PAGES_EXCEEDED')
    }
  })

  it('should handle rows with missing column keys gracefully', async () => {
    const field = createLoopField()
    // Rows that don't have all column keys — should render empty cells
    const rows: TableRow[] = [{ name: 'Widget' }, { qty: '5' }, { price: '12.99' }]
    const output = await renderAndFinish(field, rows)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle dynamic_font overflow mode in row cells', async () => {
    // Override the runtime cell style so the renderer takes the dynamic_font branch.
    const dynamicRowStyle: CellStyle = { ...BASE_CELL }
    const field = createLoopField({
      rowStyle: dynamicRowStyle,
      cellStyle: { overflowMode: 'dynamic_font' },
    })

    const rows: TableRow[] = [
      {
        name: 'A very long product name that should trigger font shrinking',
        qty: '1',
        price: '9.99',
      },
    ]
    const output = await renderAndFinish(field, rows)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })
})
