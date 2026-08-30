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

  const lineHeightFactor = style.lineHeight > 0 ? style.lineHeight : 1.2
  const maxStyleRows = typeof style.maxRows === 'number' && style.maxRows > 0 ? style.maxRows : 3

  const shouldTrim = style.trim !== false
  const textValue = shouldTrim ? value.trim() : value

  if (style.overflowMode === 'dynamic_font') {
    // GH #91: shrink `fontSize` to `fontSizeMin` until the text fits.
    // If it still doesn't fit at min, fall through to a character-
    // boundary truncation (no ellipsis — that was the pre-#91 behaviour
    // the user explicitly didn't want).
    const result = fitTextDynamic(
      doc,
      textValue,
      fontSize,
      style.fontSizeMin,
      width,
      maxStyleRows,
      height,
      lineHeightFactor,
    )
    fontSize = result.fontSize
    lines = result.lines
    if (!result.fits) {
      doc.fontSize(fontSize)
      const lineHeightPt = fontSize * lineHeightFactor
      const maxLinesByBox = Math.floor(height / lineHeightPt)
      const effectiveMaxRows = Math.min(maxStyleRows, Math.max(0, maxLinesByBox))
      lines = truncateLines(doc, lines, effectiveMaxRows, width)
    }
  } else {
    // GH #91: 'truncate' mode — fixed `fontSize`, cut characters from the
    // end at a character boundary until the content fits.
    doc.fontSize(fontSize)
    const lineHeightPt = fontSize * lineHeightFactor
    const maxLinesByBox = Math.floor(height / lineHeightPt)
    const effectiveMaxRows = Math.min(maxStyleRows, Math.max(0, maxLinesByBox))
    const result = measureText(doc, textValue, fontSize, width, effectiveMaxRows)
    lines = result.fits ? result.lines : truncateLines(doc, result.lines, effectiveMaxRows, width)
  }

  // Cap the rendered lines to those that FIT the box height (like the editor
  // canvas's `pushTextLabel`, which keeps `floor(height / lineHeight)` lines
  // and centres that block). Without this the PDF wraps to `maxRows` lines,
  // the block overflows the box, and the vertical-align maths below pushes it
  // off the top — so a centred field on the canvas rendered at the top (or
  // empty) in the PDF. Capping first means a `middle` / `bottom` block stays
  // inside the rect and is genuinely centred / bottom-anchored.
  // NOTE: the canvas now measures against the FULL box height (matching this
  // path); the residual WYSIWYG gap is only that PDFKit's `widthOfString`
  // and the browser's `ctx.measureText` can choose a wrap point a word apart
  // for the same font — a metrics-engine difference, not a padding mismatch.
  // Guard a malformed `lineHeight` (0 / negative / NaN) — otherwise the cap
  // below divides to Infinity/NaN, no-ops, and the overflow bug returns. The
  // canvas applies the same 1.2 fallback.
  const lineHeightPt = fontSize * lineHeightFactor
  const maxLinesByHeight = Math.floor(height / lineHeightPt)
  const effectiveMaxRows = Math.min(maxStyleRows, Math.max(0, maxLinesByHeight))
  if (lines.length > effectiveMaxRows) {
    lines = lines.slice(0, effectiveMaxRows)
  }

  // Font ascent (the y we pass to `doc.text` is the line top; PDFKit places
  // the baseline `ascent` below it — measured to equal `ascender/1000 *
  // fontSize`). Used to centre the glyph WITHIN its line slot.
  const fontMetrics = doc as unknown as { _font?: { ascender?: number } }
  const ascent = ((fontMetrics._font?.ascender ?? 750) / 1000) * fontSize
  // Half the line-height leading. The editor canvas (Fabric) distributes the
  // (lineHeight − glyph) space around the glyph, so the glyph sits in the
  // MIDDLE of its slot; PDFKit draws it at the slot TOP. Adding `leadingHalf`
  // to each line's y reproduces the canvas's optical centring — without it a
  // vertically-centred field renders visibly high in the PDF.
  const leadingHalf = (lineHeightPt - ascent) / 2

  // Position the block of line slots; per-line glyphs are centred in their
  // slot below. `middle` centres the block, `bottom` bottom-anchors it.
  const blockHeight = lines.length * lineHeightPt
  let blockTop: number
  switch (style.verticalAlign) {
    case 'middle':
      blockTop = y + (height - blockHeight) / 2
      break
    case 'bottom':
      blockTop = y + height - blockHeight
      break
    case 'top':
    default:
      blockTop = y
      break
  }

  // Clip to the field rect so text can NEVER cross its bounding box (REQ /
  // Hard Rule #10) — even a single line whose font is taller than the whole
  // box. The clip is a no-op for content that already fits.
  doc.save()
  doc.rect(x, y, width, height).clip()
  doc.fontSize(fontSize)
  for (let i = 0; i < lines.length; i++) {
    const slotTop = blockTop + i * lineHeightPt
    // Skip a slot that falls entirely outside the rect (defensive — capping
    // above keeps the common case inside).
    if (slotTop + lineHeightPt <= y || slotTop >= y + height) continue

    const lineY = slotTop + leadingHalf
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
  doc.restore()
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
  maxStyleRows: number,
  height: number,
  lineHeightFactor: number,
): { lines: string[]; fits: boolean; fontSize: number } {
  let fontSize = startFontSize

  while (fontSize >= minFontSize) {
    doc.fontSize(fontSize)
    const lineHeightPt = fontSize * lineHeightFactor
    const maxLinesByBox = Math.floor(height / lineHeightPt)
    const effectiveMaxRows = Math.min(maxStyleRows, Math.max(0, maxLinesByBox))

    const result = measureText(doc, text, fontSize, maxWidth, effectiveMaxRows)
    if (result.fits) {
      return { lines: result.lines, fits: true, fontSize }
    }
    fontSize -= 1
  }

  // At minimum font size, return what we have (caller will truncate)
  fontSize = minFontSize
  doc.fontSize(fontSize)
  const lineHeightPt = fontSize * lineHeightFactor
  const maxLinesByBox = Math.floor(height / lineHeightPt)
  const effectiveMaxRows = Math.min(maxStyleRows, Math.max(0, maxLinesByBox))
  const result = measureText(doc, text, fontSize, maxWidth, effectiveMaxRows)
  return { lines: result.lines, fits: result.fits, fontSize }
}
