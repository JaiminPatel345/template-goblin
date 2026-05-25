/**
 * Integration test for the cell-verticalAlign fix in loop.ts.
 *
 * The renderer sets rowHeight from the table-level `rowStyle`
 * (`cellRowHeight = fontSize + paddingTop + paddingBottom`). A per-
 * column override with a SMALLER fontSize leaves vertical slack
 * inside that column's cell — which is where `verticalAlign` becomes
 * observable. This test paints two columns: a tall one (fontSize 20)
 * that drives the row height, and a short one (fontSize 8) whose
 * cell has slack. We then flip the SHORT column's `verticalAlign`
 * and assert the captured text y changes accordingly.
 */
import PDFDocument from 'pdfkit'
import { renderLoop } from '../../src/render/loop.js'
import type { TableField, TableRow, TemplateMeta, VerticalAlign } from '@template-goblin/types'
import { BASE_CELL, dynTable } from '../helpers/fixtures.js'

function createMeta(): TemplateMeta {
  return {
    name: 'vAlign integration',
    width: 595,
    height: 842,
    unit: 'pt',
    pageSize: 'A4',
    locked: false,
    maxPages: 5,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  }
}

function buildField(shortColVAlign: VerticalAlign): TableField {
  const field = dynTable('vAlign-integration', 'items', false, ['short', 'tall'], {
    x: 0,
    y: 100,
    width: 400,
    height: 400,
    zIndex: 0,
  })
  // Row height is driven by `tall` style — fontSize 20 + paddings 4/4 = 28.
  // The `short` column overrides fontSize to 8, leaving 12 px of vertical
  // slack inside the same 28-tall row. verticalAlign on the short cell
  // chooses where inside that slack the 8 px text lands.
  field.style.rowStyle = { ...BASE_CELL, fontSize: 20, paddingTop: 4, paddingBottom: 4 }
  field.style.headerStyle = { ...BASE_CELL, fontSize: 20, paddingTop: 4, paddingBottom: 4 }
  field.style.showHeader = false
  field.style.columns = [
    {
      key: 'short',
      label: 'Short',
      width: 200,
      style: {
        fontSize: 8,
        paddingTop: 4,
        paddingBottom: 4,
        verticalAlign: shortColVAlign,
      },
      headerStyle: null,
    },
    { key: 'tall', label: 'Tall', width: 200, style: null, headerStyle: null },
  ]
  return field
}

async function captureShortCellY(vAlign: VerticalAlign): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    const field = buildField(vAlign)
    const doc = new PDFDocument({ size: [595, 842], margin: 0 })
    const found: number[] = []
    const origText = doc.text.bind(doc)
    ;(doc as unknown as { text: typeof origText }).text = function (...args: unknown[]) {
      const [text, , y] = args as [string, number, number]
      if (text === 'short cell' && typeof y === 'number') found.push(y)
      return (origText as unknown as (...a: unknown[]) => InstanceType<typeof PDFDocument>)(...args)
    }
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(found[0]))
    doc.on('error', reject)
    const rows: TableRow[] = [{ short: 'short cell', tall: 'tall cell' }]
    renderLoop(doc, field, rows, new Map(), createMeta(), null)
    doc.end()
  })
}

describe('renderLoop body cell verticalAlign — observable with row-height slack', () => {
  it('top < middle < bottom for the y of the short-font cell', async () => {
    const yTop = await captureShortCellY('top')
    const yMid = await captureShortCellY('middle')
    const yBot = await captureShortCellY('bottom')
    expect(yTop).toBeDefined()
    expect(yMid).toBeDefined()
    expect(yBot).toBeDefined()
    expect(yTop! < yMid!).toBe(true)
    expect(yMid! < yBot!).toBe(true)
  })

  it('top + bottom should bracket roughly the rowHeight - 2*padding - fontSize delta', async () => {
    // rowHeight = 28, padTop/Bottom = 4 each, short font = 8.
    // top    → startY + 4         (paddingTop)
    // bottom → startY + 28 - 4 - 8 = startY + 16
    // delta  → 12
    const yTop = await captureShortCellY('top')
    const yBot = await captureShortCellY('bottom')
    expect(yBot! - yTop!).toBeCloseTo(12, 1)
  })
})
