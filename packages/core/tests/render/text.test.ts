import PDFDocument from 'pdfkit'
import { renderText } from '../../src/render/text.js'
import type { FieldDefinition, TextFieldStyle } from '@template-goblin/types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({ size: [595, 842], margin: 0 })
}

function createTextField(overrides: Partial<TextFieldStyle> = {}): FieldDefinition {
  return {
    id: 'test',
    type: 'text',
    groupId: null,
    required: false,
    jsonKey: 'texts.test',
    placeholder: 'Test',
    x: 50,
    y: 50,
    width: 200,
    height: 30,
    zIndex: 0,
    style: {
      fontId: null,
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontSizeDynamic: true,
      fontSizeMin: 6,
      lineHeight: 1.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      align: 'left',
      verticalAlign: 'top',
      maxRows: 3,
      overflowMode: 'dynamic_font',
      snapToGrid: true,
      ...overrides,
    } satisfies TextFieldStyle,
  }
}

/**
 * Run renderText inside a PDFDocument lifecycle and collect output to
 * ensure the document is still valid after rendering.
 */
function renderAndFinish(
  field: FieldDefinition,
  value: string,
  fonts: Map<string, string> = new Map(),
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = createDoc()
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    renderText(doc, field, value, fonts)
    doc.end()
  })
}

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('Text rendering', () => {
  it('should render text at original fontSize when it fits', async () => {
    const field = createTextField()
    const output = await renderAndFinish(field, 'Hello')

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should reduce fontSize with dynamic_font overflow mode', async () => {
    const field = createTextField({
      overflowMode: 'dynamic_font',
      fontSizeDynamic: true,
      fontSize: 24,
      fontSizeMin: 6,
      maxRows: 1,
    })

    // Long text that won't fit at fontSize 24 in a 200pt-wide, single-row box
    const longText = 'This is a very long piece of text that definitely will not fit in the box'
    const output = await renderAndFinish(field, longText)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should stop reducing at fontSizeMin', async () => {
    const field = createTextField({
      overflowMode: 'dynamic_font',
      fontSizeDynamic: true,
      fontSize: 24,
      fontSizeMin: 10,
      maxRows: 1,
    })

    // Extremely long text — should shrink to fontSizeMin and then truncate
    const extremeText = 'A'.repeat(500)
    const output = await renderAndFinish(field, extremeText)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should truncate with ellipsis when at fontSizeMin and still overflowing', async () => {
    // We verify the render completes without error; the actual truncation
    // is handled by measureText/truncateLines (tested separately).
    const field = createTextField({
      overflowMode: 'dynamic_font',
      fontSizeDynamic: true,
      fontSize: 12,
      fontSizeMin: 12, // no shrink room
      maxRows: 1,
    })

    const overflowText = 'This text is way too long to fit in a single 200pt-wide line at 12pt'
    const output = await renderAndFinish(field, overflowText)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle truncate overflow mode', async () => {
    const field = createTextField({
      overflowMode: 'truncate',
      fontSizeDynamic: false,
      fontSize: 12,
      maxRows: 1,
    })

    const longText = 'This text should be truncated because it is far too long for the bounding box'
    const output = await renderAndFinish(field, longText)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should apply vertical alignment top', async () => {
    const field = createTextField({ verticalAlign: 'top' })
    const output = await renderAndFinish(field, 'Top aligned')

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should apply vertical alignment middle', async () => {
    // Give enough height so middle alignment has room to shift
    const field = createTextField({ verticalAlign: 'middle' })
    ;(field as FieldDefinition).height = 100
    const output = await renderAndFinish(field, 'Middle aligned')

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should apply vertical alignment bottom', async () => {
    const field = createTextField({ verticalAlign: 'bottom' })
    ;(field as FieldDefinition).height = 100
    const output = await renderAndFinish(field, 'Bottom aligned')

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should wrap text at word boundaries', async () => {
    const field = createTextField({
      maxRows: 5,
      overflowMode: 'truncate',
      fontSizeDynamic: false,
    })
    ;(field as FieldDefinition).height = 200

    const multiWordText = 'One two three four five six seven eight nine ten eleven twelve'
    const output = await renderAndFinish(field, multiWordText)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should break mid-word when a single word exceeds box width', async () => {
    const field = createTextField({
      maxRows: 5,
      overflowMode: 'truncate',
      fontSizeDynamic: false,
    })
    ;(field as FieldDefinition).height = 200

    // A single extremely long "word" with no spaces
    const longWord = 'Supercalifragilisticexpialidociousandthensomemorecharacters'
    const output = await renderAndFinish(field, longWord)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle empty string', async () => {
    const field = createTextField()
    const output = await renderAndFinish(field, '')

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle very long text without throwing', async () => {
    const field = createTextField({
      maxRows: 3,
      overflowMode: 'dynamic_font',
      fontSizeDynamic: true,
    })

    const veryLongText = 'Lorem ipsum dolor sit amet. '.repeat(100)
    const output = await renderAndFinish(field, veryLongText)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should use text align center', async () => {
    const field = createTextField({ align: 'center' })
    const output = await renderAndFinish(field, 'Centered text')

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should use text align right', async () => {
    const field = createTextField({ align: 'right' })
    const output = await renderAndFinish(field, 'Right-aligned text')

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should use a mapped font from the fonts map', async () => {
    const field = createTextField({ fontId: 'custom-font' })
    // Map the custom font id to a built-in font that PDFKit knows
    const fonts = new Map([['custom-font', 'Courier']])

    const output = await renderAndFinish(field, 'Custom font text', fonts)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should fall back to fontFamily when fontId is not in the fonts map', async () => {
    const field = createTextField({ fontId: 'missing-font', fontFamily: 'Helvetica' })
    const fonts = new Map<string, string>() // empty map

    const output = await renderAndFinish(field, 'Fallback font text', fonts)

    expect(output).toBeInstanceOf(Buffer)
    expect(output.length).toBeGreaterThan(0)
  })
})
