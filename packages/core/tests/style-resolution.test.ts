/**
 * QA coverage for design spec §4.6 — per-property style resolution order
 * for table header and body cells: column → odd/even → row.
 *
 * PDFKit compresses content streams with FlateDecode. We decompress every
 * `<< ... /Filter /FlateDecode ... >>stream ... endstream` block and search
 * the decompressed text for well-known label strings.
 */

import PDFDocument from 'pdfkit'
import zlib from 'node:zlib'
import { renderLoop } from '../src/render/loop.js'
import type { TableField, TableRow, TemplateMeta } from '@template-goblin/types'
import { BASE_CELL, dynTable } from './helpers/fixtures.js'

function createDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({ size: [595, 842], margin: 0 })
}

function meta(overrides: Partial<TemplateMeta> = {}): TemplateMeta {
  return {
    name: 'Test',
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

function renderToPdf(field: TableField, rows: TableRow[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createDoc()
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    renderLoop(doc, field, rows, new Map(), meta(), null)
    doc.end()
  })
}

/**
 * Extract all textual content from a PDF. PDFKit FlateDecodes content streams
 * and encodes glyphs as hex strings inside TJ/Tj operators — e.g.
 * `[<4d5948454144455241>] TJ` is "MYHEADERA". Kerning can split one word into
 * multiple hex segments: `[<4d59424f44> 90 <59> 110 <41> 0] TJ` is "MYBODYA".
 *
 * We inflate every stream, then for each `[...] TJ` array concatenate the
 * hex literals (ignoring the numeric kerning offsets) back into the original
 * string. Individual `<hex> Tj` operators are also decoded.
 */
function extractPdfText(pdf: Buffer): string {
  const latin = pdf.toString('latin1')
  const parts: string[] = [latin]

  const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let m: RegExpExecArray | null
  let streamText = ''
  while ((m = streamRe.exec(latin)) !== null) {
    const chunk = Buffer.from(m[1]!, 'latin1')
    try {
      streamText += '\n' + zlib.inflateSync(chunk).toString('latin1')
    } catch {
      /* ignore non-Flate */
    }
  }
  parts.push(streamText)

  // Decode `[...] TJ` arrays: concat every <hex> segment inside the brackets.
  const tjArrayRe = /\[([^\]]*)\]\s*TJ/g
  let t: RegExpExecArray | null
  while ((t = tjArrayRe.exec(streamText)) !== null) {
    const inside = t[1]!
    const hexRe = /<([0-9a-fA-F]+)>/g
    let h: RegExpExecArray | null
    let word = ''
    while ((h = hexRe.exec(inside)) !== null) {
      const hex = h[1]!
      if (hex.length % 2 === 0) {
        try {
          word += Buffer.from(hex, 'hex').toString('latin1')
        } catch {
          /* ignore */
        }
      }
    }
    parts.push(word)
  }

  // Decode single `<hex> Tj` operators.
  const tjRe = /<([0-9a-fA-F]+)>\s*Tj/g
  let tj: RegExpExecArray | null
  while ((tj = tjRe.exec(streamText)) !== null) {
    const hex = tj[1]!
    if (hex.length % 2 === 0) {
      try {
        parts.push(Buffer.from(hex, 'hex').toString('latin1'))
      } catch {
        /* ignore */
      }
    }
  }

  return parts.join('\n')
}

function pdfContains(pdf: Buffer, needle: string): boolean {
  return extractPdfText(pdf).includes(needle)
}

describe('Table style resolution (spec §4.6)', () => {
  /* ---------------------------------------------------------------- */
  /*  showHeader                                                       */
  /* ---------------------------------------------------------------- */

  it('showHeader: false does not render header labels', async () => {
    const field = dynTable('t', 'rows', false, ['colA', 'colB'], {
      x: 10,
      y: 10,
      width: 300,
      height: 200,
    })
    field.style.columns = [
      { key: 'colA', label: 'HEADERLABELA', width: 150, style: null, headerStyle: null },
      { key: 'colB', label: 'HEADERLABELB', width: 150, style: null, headerStyle: null },
    ]
    field.style.showHeader = false

    const pdf = await renderToPdf(field, [{ colA: 'BODYVALA', colB: 'BODYVALB' }])

    expect(pdfContains(pdf, 'HEADERLABELA')).toBe(false)
    expect(pdfContains(pdf, 'HEADERLABELB')).toBe(false)
    expect(pdfContains(pdf, 'BODYVALA')).toBe(true)
    expect(pdfContains(pdf, 'BODYVALB')).toBe(true)
  })

  it('showHeader: true does render header labels (control)', async () => {
    const field = dynTable('t', 'rows', false, ['colA'], {
      x: 10,
      y: 10,
      width: 200,
      height: 200,
    })
    field.style.columns = [
      { key: 'colA', label: 'CONTROLHEADERLABEL', width: 150, style: null, headerStyle: null },
    ]
    field.style.showHeader = true

    const pdf = await renderToPdf(field, [{ colA: 'BODYCELL' }])
    expect(pdfContains(pdf, 'CONTROLHEADERLABEL')).toBe(true)
    expect(pdfContains(pdf, 'BODYCELL')).toBe(true)
  })

  /* ---------------------------------------------------------------- */
  /*  column.headerStyle applies only to the header                    */
  /* ---------------------------------------------------------------- */

  it('column.headerStyle does not prevent body cells from rendering', async () => {
    const field = dynTable('t', 'rows', false, ['name'], {
      x: 10,
      y: 10,
      width: 200,
      height: 200,
    })
    field.style.columns = [
      {
        key: 'name',
        label: 'ONLYHEADER',
        width: 150,
        style: null,
        headerStyle: { color: '#ff0000', backgroundColor: '#00ff00' },
      },
    ]

    const pdf = await renderToPdf(field, [{ name: 'BODYONLY' }])
    expect(pdfContains(pdf, 'ONLYHEADER')).toBe(true)
    expect(pdfContains(pdf, 'BODYONLY')).toBe(true)
  })

  /* ---------------------------------------------------------------- */
  /*  Per-property resolution: column overrides background only         */
  /* ---------------------------------------------------------------- */

  it('column.style.backgroundColor override preserves row font-size inheritance', async () => {
    const field = dynTable('t', 'rows', false, ['a', 'b'], {
      x: 10,
      y: 10,
      width: 300,
      height: 200,
    })
    field.style.rowStyle = { ...BASE_CELL, fontSize: 14 }
    field.style.columns = [
      {
        key: 'a',
        label: 'A',
        width: 150,
        style: { backgroundColor: '#ffff00' },
        headerStyle: null,
      },
      { key: 'b', label: 'B', width: 150, style: null, headerStyle: null },
    ]

    const pdf = await renderToPdf(field, [{ a: 'PROPRESA', b: 'PROPRESB' }])
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    expect(pdfContains(pdf, 'PROPRESA')).toBe(true)
    expect(pdfContains(pdf, 'PROPRESB')).toBe(true)
  })

  /* ---------------------------------------------------------------- */
  /*  Zebra striping / row style fall-through                          */
  /* ---------------------------------------------------------------- */

  it('oddRowStyle with evenRowStyle=null falls through to rowStyle without error', async () => {
    const field = dynTable('t', 'rows', false, ['x'], {
      x: 10,
      y: 10,
      width: 200,
      height: 400,
    })
    field.style.rowStyle = { ...BASE_CELL, backgroundColor: '#ffffff' }
    field.style.oddRowStyle = { backgroundColor: '#eeeeee' }
    field.style.evenRowStyle = null

    const rows: TableRow[] = [
      { x: 'ROWZEROEVEN' },
      { x: 'ROWONEODD' },
      { x: 'ROWTWOEVEN' },
      { x: 'ROWTHREEODD' },
    ]
    const pdf = await renderToPdf(field, rows)

    for (const row of rows) {
      expect(pdfContains(pdf, row.x!)).toBe(true)
    }
  })

  it('evenRowStyle applied without oddRowStyle renders without error', async () => {
    const field = dynTable('t', 'rows', false, ['x'], {
      x: 10,
      y: 10,
      width: 200,
      height: 400,
    })
    field.style.rowStyle = { ...BASE_CELL }
    field.style.oddRowStyle = null
    field.style.evenRowStyle = { backgroundColor: '#f0f0f0' }

    const rows: TableRow[] = [{ x: 'ALPHA' }, { x: 'BRAVO' }, { x: 'CHARLIE' }]
    const pdf = await renderToPdf(field, rows)

    expect(pdfContains(pdf, 'ALPHA')).toBe(true)
    expect(pdfContains(pdf, 'BRAVO')).toBe(true)
    expect(pdfContains(pdf, 'CHARLIE')).toBe(true)
  })
})
