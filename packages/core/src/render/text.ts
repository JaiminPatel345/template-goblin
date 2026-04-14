import type PDFDocument from 'pdfkit'
import type { FieldDefinition, TextFieldStyle } from '@template-goblin/types'
import { measureText, truncateLines } from '../utils/measure.js'

/**
 * Render a text field onto a PDFKit document within its bounding rectangle.
 *
 * Handles overflow modes (dynamic_font, truncate) and vertical alignment.
 * Text NEVER overflows outside the bounding rectangle (REQ from spec 003).
 *
 * @param doc - PDFKit document
 * @param field - Field definition with position and dimensions
 * @param value - The text string to render
 * @param fonts - Map of fontId → registered font name
 */
export function renderText(
  doc: InstanceType<typeof PDFDocument>,
  field: FieldDefinition,
  value: string,
  fonts: Map<string, string>,
): void {
  const style = field.style as TextFieldStyle
  const { x, y, width, height } = field

  // Set font
  const fontName = (style.fontId && fonts.get(style.fontId)) ?? style.fontFamily
  doc.font(fontName)

  // Set text color
  doc.fillColor(style.color)

  let fontSize = style.fontSize
  let lines: string[]

  if (style.overflowMode === 'dynamic_font' && style.fontSizeDynamic) {
    // REQ: Dynamic font mode — shrink fontSize until text fits or fontSizeMin reached
    const result = fitTextDynamic(doc, value, fontSize, style.fontSizeMin, width, style.maxRows)
    fontSize = result.fontSize
    lines = result.lines

    // REQ: If still doesn't fit at fontSizeMin, truncate with ellipsis
    if (!result.fits) {
      doc.fontSize(fontSize)
      lines = truncateLines(doc, lines, style.maxRows, width)
    }
  } else {
    // REQ: Truncate mode — fixed fontSize, cut off excess
    doc.fontSize(fontSize)
    const result = measureText(doc, value, fontSize, width, style.maxRows)
    lines = result.fits ? result.lines : truncateLines(doc, result.lines, style.maxRows, width)
  }

  // Calculate actual line height and total text block height
  const lineHeightPt = fontSize * style.lineHeight
  const textBlockHeight = lines.length * lineHeightPt

  // REQ: Vertical alignment within bounding rectangle
  let startY: number
  switch (style.verticalAlign) {
    case 'middle':
      startY = y + (height - textBlockHeight) / 2
      break
    case 'bottom':
      startY = y + height - textBlockHeight
      break
    case 'top':
    default:
      startY = y
      break
  }

  // Render each line
  doc.fontSize(fontSize)
  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineHeightPt

    // Skip if line would be outside bounding rect
    if (lineY + lineHeightPt > y + height) break
    if (lineY < y) continue

    doc.text(lines[i] ?? '', x, lineY, {
      width,
      align: style.align,
      lineBreak: false,
    })
  }
}

/**
 * Try fitting text by reducing font size from start down to min.
 *
 * @returns The best fit result (smallest fontSize that fits, or min if none fits)
 */
function fitTextDynamic(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  startFontSize: number,
  minFontSize: number,
  maxWidth: number,
  maxRows: number,
): { lines: string[]; fits: boolean; fontSize: number } {
  let fontSize = startFontSize

  while (fontSize >= minFontSize) {
    doc.fontSize(fontSize)
    const result = measureText(doc, text, fontSize, maxWidth, maxRows)
    if (result.fits) {
      return { lines: result.lines, fits: true, fontSize }
    }
    fontSize -= 1
  }

  // At minimum font size, return what we have (caller will truncate)
  fontSize = minFontSize
  doc.fontSize(fontSize)
  const result = measureText(doc, text, fontSize, maxWidth, maxRows)
  return { lines: result.lines, fits: result.fits, fontSize }
}
