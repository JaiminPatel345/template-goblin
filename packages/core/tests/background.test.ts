import PDFDocument from 'pdfkit'
import type { TemplateMeta } from '@template-goblin/types'
import { renderBackground, renderColorBackground } from '../src/render/background.js'

function createDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({ size: [595, 842], margin: 0 })
}

const meta: TemplateMeta = {
  name: 'Test',
  width: 595,
  height: 842,
  unit: 'pt',
  pageSize: 'A4',
  locked: false,
  maxPages: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

/**
 * Helper: call a render function on a PDFKit doc, end it, and collect the output.
 * Returns the full PDF buffer so we can verify the doc still produces valid output.
 */
function renderAndFinish(fn: (doc: InstanceType<typeof PDFDocument>) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createDoc()
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    fn(doc)
    doc.end()
  })
}

describe('renderBackground', () => {
  it('should do nothing when backgroundImage is null and still produce valid PDF', async () => {
    const pdf = await renderAndFinish((doc) => {
      renderBackground(doc, null, meta)
    })
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should render an image buffer without error', async () => {
    // Create a minimal valid PNG (1x1 white pixel)
    const pngBuffer = createMinimalPng()

    const pdf = await renderAndFinish((doc) => {
      renderBackground(doc, pngBuffer, meta)
    })
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })
})

describe('renderColorBackground', () => {
  it('should render a hex color without error', async () => {
    const pdf = await renderAndFinish((doc) => {
      renderColorBackground(doc, '#ff0000', meta)
    })
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should render white color without error', async () => {
    const pdf = await renderAndFinish((doc) => {
      renderColorBackground(doc, '#ffffff', meta)
    })
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })
})

describe('renderBackground + renderColorBackground produce valid output', () => {
  it('should produce valid PDF after both functions', async () => {
    const pngBuffer = createMinimalPng()

    const pdf = await renderAndFinish((doc) => {
      renderColorBackground(doc, '#cccccc', meta)
      renderBackground(doc, pngBuffer, meta)
    })
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })
})

/**
 * Create a minimal valid 1x1 white PNG buffer.
 * This is the smallest valid PNG file: 8-byte signature + IHDR + IDAT + IEND.
 */
function createMinimalPng(): Buffer {
  // Minimal 1x1 white pixel PNG
  return Buffer.from(
    '89504e470d0a1a0a' + // PNG signature
      '0000000d49484452' + // IHDR length + type
      '00000001' + // width: 1
      '00000001' + // height: 1
      '0802' + // bit depth: 8, color type: 2 (RGB)
      '000000' + // compression, filter, interlace
      '907753de' + // IHDR CRC
      '0000000c4944415478' + // IDAT length + type + zlib header
      '9c6260f8cf0000000201' + // compressed data
      '01e221bc33' + // IDAT CRC
      '0000000049454e44ae426082', // IEND
    'hex',
  )
}
