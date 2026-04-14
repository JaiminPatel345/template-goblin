import PDFDocument from 'pdfkit'
import { renderImage } from '../../src/render/image.js'
import type { FieldDefinition, ImageFieldStyle } from '@template-goblin/types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Minimal valid 1x1 PNG buffer. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

/** The same tiny PNG as a base64 string (not yet decoded). */
const TINY_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function createDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({ size: [595, 842], margin: 0 })
}

function createImageField(fit: 'fill' | 'contain' | 'cover'): FieldDefinition {
  return {
    id: 'test-img',
    type: 'image',
    groupId: null,
    required: false,
    jsonKey: 'images.test',
    placeholder: null,
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    zIndex: 0,
    style: {
      fit,
      placeholderFilename: null,
    } satisfies ImageFieldStyle,
  }
}

/**
 * Run renderImage inside a PDFDocument lifecycle and collect the output
 * to verify the document is still valid after rendering.
 */
function renderAndFinish(field: FieldDefinition, value: Buffer | string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createDoc()
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    renderImage(doc, field, value)
    doc.end()
  })
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Image rendering', () => {
  it('should render image from Buffer with fit=fill', async () => {
    const field = createImageField('fill')
    const output = await renderAndFinish(field, TINY_PNG)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should render image from Buffer with fit=contain', async () => {
    const field = createImageField('contain')
    const output = await renderAndFinish(field, TINY_PNG)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should render image from Buffer with fit=cover', async () => {
    const field = createImageField('cover')
    const output = await renderAndFinish(field, TINY_PNG)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should render image from base64 string', async () => {
    const field = createImageField('fill')
    const output = await renderAndFinish(field, TINY_PNG_B64)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle base64 string with contain fit', async () => {
    const field = createImageField('contain')
    const output = await renderAndFinish(field, TINY_PNG_B64)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle base64 string with cover fit', async () => {
    const field = createImageField('cover')
    const output = await renderAndFinish(field, TINY_PNG_B64)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle empty buffer gracefully', async () => {
    const field = createImageField('fill')

    // An empty buffer is not a valid image — PDFKit may throw.
    // We verify the function propagates the error rather than silently failing.
    await expect(renderAndFinish(field, Buffer.alloc(0))).rejects.toThrow()
  })

  it('should render a non-square image with contain fit (landscape box)', async () => {
    const field = createImageField('contain')
    // Landscape bounding box
    field.width = 300
    field.height = 100

    const output = await renderAndFinish(field, TINY_PNG)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should render a non-square image with cover fit (landscape box)', async () => {
    const field = createImageField('cover')
    // Landscape bounding box
    field.width = 300
    field.height = 100

    const output = await renderAndFinish(field, TINY_PNG)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })
})
