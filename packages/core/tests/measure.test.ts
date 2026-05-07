import PDFDocument from 'pdfkit'
import { wrapText, measureText, truncateLines } from '../src/utils/measure.js'

function createDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({ size: [595, 842], margin: 0 })
}

describe('wrapText', () => {
  it('should return a single line for short text', () => {
    const doc = createDoc()
    doc.fontSize(12)
    const lines = wrapText(doc, 'Hello', 500)
    expect(lines).toEqual(['Hello'])
  })

  it('should wrap long text at word boundaries', () => {
    const doc = createDoc()
    doc.fontSize(12)
    // Use a very narrow width to force wrapping
    const lines = wrapText(doc, 'The quick brown fox jumps over the lazy dog', 80)
    expect(lines.length).toBeGreaterThan(1)
    // Each line should be a substring composed of complete words
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(0)
    }
    // Joined lines should reconstruct the original text
    expect(lines.join(' ')).toBe('The quick brown fox jumps over the lazy dog')
  })

  it('should break a single long word mid-word', () => {
    const doc = createDoc()
    doc.fontSize(12)
    const longWord = 'Supercalifragilisticexpialidocious'
    const lines = wrapText(doc, longWord, 60)
    expect(lines.length).toBeGreaterThan(1)
    // Concatenating all fragments should reconstruct the original word
    expect(lines.join('')).toBe(longWord)
  })

  it('should create multiple paragraphs from newlines', () => {
    const doc = createDoc()
    doc.fontSize(12)
    const lines = wrapText(doc, 'Line one\nLine two\nLine three', 500)
    expect(lines).toEqual(['Line one', 'Line two', 'Line three'])
  })

  it('should return [""] for empty string', () => {
    const doc = createDoc()
    doc.fontSize(12)
    const lines = wrapText(doc, '', 500)
    expect(lines).toEqual([''])
  })
})

describe('measureText', () => {
  it('should return fits:true when text fits within maxRows', () => {
    const doc = createDoc()
    const result = measureText(doc, 'Hello', 12, 500, 5)
    expect(result.fits).toBe(true)
    expect(result.lines).toEqual(['Hello'])
    expect(result.fontSize).toBe(12)
  })

  it('should return fits:false when text overflows maxRows', () => {
    const doc = createDoc()
    // Very narrow width + 1 maxRow should cause overflow for longer text
    const result = measureText(doc, 'The quick brown fox jumps over the lazy dog', 12, 50, 1)
    expect(result.fits).toBe(false)
    expect(result.lines.length).toBeGreaterThan(1)
  })

  it('should return correct line count', () => {
    const doc = createDoc()
    const result = measureText(doc, 'Line one\nLine two\nLine three', 12, 500, 10)
    expect(result.lines.length).toBe(3)
    expect(result.fits).toBe(true)
  })
})

describe('truncateLines', () => {
  it('should return lines unchanged when lines <= maxRows', () => {
    const doc = createDoc()
    doc.fontSize(12)
    const lines = ['Line one', 'Line two']
    const result = truncateLines(doc, lines, 5, 500)
    expect(result).toEqual(['Line one', 'Line two'])
  })

  // GH #91 \u2014 `truncateLines` no longer appends `\u2026`. The last visible line
  // is cut at a character boundary so it fits the rect width; if every
  // line already fits, it's returned verbatim (no synthetic suffix).
  it('truncates to maxRows and never appends an ellipsis', () => {
    const doc = createDoc()
    doc.fontSize(12)
    const lines = ['Line one', 'Line two', 'Line three', 'Line four']
    const result = truncateLines(doc, lines, 2, 500)
    expect(result.length).toBe(2)
    expect(result[0]).toBe('Line one')
    expect(result[1]).toBe('Line two')
    expect(result[1]).not.toMatch(/\u2026$/)
  })

  it('cuts the last visible line at a character boundary when too wide', () => {
    const doc = createDoc()
    doc.fontSize(12)
    // Pick a width so narrow that even "First line" (10 chars) overflows;
    // truncateLines should chop characters off the end until it fits.
    const lines = ['First line', 'Second line']
    const result = truncateLines(doc, lines, 1, 20)
    expect(result.length).toBe(1)
    const last = result[0] ?? ''
    expect(last).not.toMatch(/\u2026$/)
    expect('First line'.startsWith(last)).toBe(true)
    expect(doc.widthOfString(last)).toBeLessThanOrEqual(20)
  })

  it('keeps the last visible line whole when it already fits', () => {
    const doc = createDoc()
    doc.fontSize(12)
    const lines = ['First line', 'Second line']
    const result = truncateLines(doc, lines, 1, 500)
    expect(result).toEqual(['First line'])
  })
})
