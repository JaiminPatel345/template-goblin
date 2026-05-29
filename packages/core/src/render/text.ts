import type PDFDocument from 'pdfkit'
import type { FieldDefinition, TextFieldStyle } from '@template-goblin/types'
import { measureText, truncateLines } from '../utils/measure.js'
import { resolvePdfFontName } from './pdfFontResolver.js'
import { paintTextDecoration } from './textDecoration.js'

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

  // #167 — paint the text-box background fill (if any) before the glyphs,
  // exactly like the cell-background pass in `loop.ts`. `backgroundColor`
  // is `null` for a transparent box and may be `undefined` on a legacy
  // template saved before the field existed — both skip the fill. The
  // rect is drawn in the field's (already-rotated, see `renderField`)
  // coordinate space so it tracks the field's rotation for free.
  const backgroundColor = style.backgroundColor ?? null
  if (backgroundColor) {
    doc.rect(x, y, width, height).fill(backgroundColor)
  }

  // Set font. Resolves fontFamily + fontWeight + fontStyle into the
  // PDFKit name (Helvetica-BoldOblique, Times-BoldItalic, …) so the
  // bold/italic toggles in the editor actually reach the PDF. Custom
  // uploaded fonts win — they're registered with their own name and
  // bold/italic variants must come from separately uploaded files.
  const customFontName = style.fontId ? (fonts.get(style.fontId) ?? null) : null
  const fontName = resolvePdfFontName(
    style.fontFamily,
    style.fontWeight,
    style.fontStyle,
    customFontName,
  )
  doc.font(fontName)

  // Set text color
  doc.fillColor(style.color)

  let fontSize = style.fontSize
  let lines: string[]

  if (style.overflowMode === 'dynamic_font') {
    // GH #91: shrink `fontSize` to `fontSizeMin` until the text fits.
    // If it still doesn't fit at min, fall through to a character-
    // boundary truncation (no ellipsis — that was the pre-#91 behaviour
    // the user explicitly didn't want).
    const result = fitTextDynamic(doc, value, fontSize, style.fontSizeMin, width, style.maxRows)
    fontSize = result.fontSize
    lines = result.lines
    if (!result.fits) {
      doc.fontSize(fontSize)
      lines = truncateLines(doc, lines, style.maxRows, width)
    }
  } else {
    // GH #91: 'truncate' mode — fixed `fontSize`, cut characters from the
    // end at a character boundary until the content fits.
    doc.fontSize(fontSize)
    const result = measureText(doc, value, fontSize, width, style.maxRows)
    lines = result.fits ? result.lines : truncateLines(doc, result.lines, style.maxRows, width)
  }

  // Cap the rendered lines to those that FIT the box height — exactly what
  // the editor canvas does (`pushTextLabel` keeps `floor(height / lineHeight)`
  // lines, then centres that block). Without this the PDF wraps to `maxRows`
  // lines, the block overflows the box, and the vertical-align maths below
  // pushes it off the top — so a centred field on the canvas rendered at the
  // top (or empty) in the PDF. Capping first means a `middle` / `bottom`
  // block stays inside the rect and is genuinely centred / bottom-anchored,
  // matching the canvas.
  const lineHeightPt = fontSize * style.lineHeight
  const maxLinesByHeight = Math.max(1, Math.floor(height / lineHeightPt))
  if (lines.length > maxLinesByHeight) {
    lines = lines.slice(0, maxLinesByHeight)
  }
  const textBlockHeight = lines.length * lineHeightPt

  // REQ: Vertical alignment within bounding rectangle. The block now fits
  // (≤ box height for the common case), so `middle` centres it and `bottom`
  // bottom-anchors it inside the rect — same as the canvas. The per-line clip
  // below is the residual guard for a single line taller than the whole box.
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

    const line = lines[i] ?? ''
    doc.text(line, x, lineY, {
      width,
      align: style.align,
      lineBreak: false,
    })
    // Underline / line-through — was silently dropped pre-fix.
    paintTextDecoration(doc, line, style.textDecoration, {
      x,
      y: lineY,
      width,
      align: style.align,
      fontSize,
      color: style.color,
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
