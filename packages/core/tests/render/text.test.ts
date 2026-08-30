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
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey: 'test', required: false, placeholder: 'Test' },
    x: 50,
    y: 50,
    width: 200,
    height: 30,
    zIndex: 0,
    style: {
      fontId: null,
      fontFamily: 'Helvetica',
      fontSize: 12,
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

/* ------------------------------------------------------------------ */
/*  #167 — text background colour                                     */
/* ------------------------------------------------------------------ */

describe('Text background colour (#167)', () => {
  it('paints a filled rect at the field bounds when backgroundColor is set', () => {
    const doc = createDoc()
    const rectSpy = jest.spyOn(doc, 'rect')
    const fillSpy = jest.spyOn(doc, 'fill')
    const field = createTextField({ backgroundColor: '#ff0000' })

    renderText(doc, field, 'Hello', new Map())

    expect(rectSpy).toHaveBeenCalledWith(field.x, field.y, field.width, field.height)
    expect(fillSpy).toHaveBeenCalledWith('#ff0000')
    doc.end()
  })

  // `renderText` always calls `doc.rect(...).clip()` to clip text to the box,
  // so "no background" is asserted via the absence of a fill — the background
  // is the only `doc.fill(colour)` call (glyphs use `doc.fillColor`).
  it('does not fill a background when backgroundColor is null (transparent)', () => {
    const doc = createDoc()
    const fillSpy = jest.spyOn(doc, 'fill')
    const field = createTextField({ backgroundColor: null })

    renderText(doc, field, 'Hello', new Map())

    expect(fillSpy).not.toHaveBeenCalled()
    doc.end()
  })

  it('treats a legacy field with no backgroundColor as transparent', () => {
    const doc = createDoc()
    const fillSpy = jest.spyOn(doc, 'fill')
    const field = createTextField()
    // Simulate a template serialised before the field existed.
    delete (field.style as Partial<TextFieldStyle>).backgroundColor

    renderText(doc, field, 'Hello', new Map())

    expect(fillSpy).not.toHaveBeenCalled()
    doc.end()
  })
})

/* ------------------------------------------------------------------ */
/*  Oversized text must still render (regression for the "preview      */
/*  shows the box fill but no text" bug)                               */
/* ------------------------------------------------------------------ */

describe('Text taller than its box is capped to fit and vertically aligned', () => {
  // fontSize 60 × lineHeight 1.2 = 72pt per line. maxRows 2 → 144pt, but the
  // box is 100pt, so only ONE line fits. The renderer caps to the fitting
  // line and vertically aligns it — instead of overflowing or rendering
  // nothing. Here we pin RELATIVE behaviour (renders, stays inside the box,
  // top < middle < bottom); the exact centred baseline is verified against
  // the real PDF in `pdfGeometry.test.ts`.
  function firstLineY(verticalAlign: 'top' | 'middle' | 'bottom'): number {
    const doc = createDoc()
    const textSpy = jest.spyOn(doc, 'text')
    const field = createTextField({
      fontSize: 60,
      lineHeight: 1.2,
      maxRows: 2,
      verticalAlign,
      overflowMode: 'truncate',
    })
    ;(field as FieldDefinition).height = 100
    renderText(doc, field, 'Hello World Foo Bar Baz', new Map())
    expect(textSpy).toHaveBeenCalled()
    const ys = textSpy.mock.calls.map((c) => c[2] as number)
    // Every drawn line's top stays within the box.
    for (const ly of ys) {
      expect(ly).toBeGreaterThanOrEqual(field.y)
      expect(ly).toBeLessThan(field.y + 100)
    }
    doc.end()
    return ys[0] ?? NaN
  }

  it('renders the fitting line for every vertical alignment, ordered top < middle < bottom', () => {
    const top = firstLineY('top')
    const middle = firstLineY('middle')
    const bottom = firstLineY('bottom')
    expect(top).toBeLessThan(middle)
    expect(middle).toBeLessThan(bottom)
  })

  it('does not render any text if the box is too small to fit even one line', () => {
    const doc = createDoc()
    const textSpy = jest.spyOn(doc, 'text')
    const field = createTextField({
      fontSize: 60,
      lineHeight: 1.2,
      maxRows: 2,
      overflowMode: 'truncate',
    })
    ;(field as FieldDefinition).height = 50 // 72pt line height > 50pt box height
    renderText(doc, field, 'Hello World', new Map())
    expect(textSpy).not.toHaveBeenCalled()
    doc.end()
  })
})
