import type PDFDocument from 'pdfkit'
import type { TextDecoration, TextAlign } from '@template-goblin/types'

/**
 * Paint underline / line-through for a single rendered text line.
 *
 * PDFKit doesn't expose a text-decoration option, so we paint the line
 * manually after `doc.text(...)`. Both renderers (text.ts +
 * loop.ts) call this so the editor's Underline / Strikethrough
 * toggles reach the PDF.
 *
 * Coordinates expect the line was drawn at (lineX, lineY) inside a box
 * `width` wide using `align`. We measure the actual painted width with
 * `doc.widthOfString` and offset within the box so the decoration
 * tracks the visible glyphs (otherwise a centred or right-aligned
 * single-line cell would have its underline floating in the empty gap).
 */
export function paintTextDecoration(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  decoration: TextDecoration,
  options: {
    x: number
    y: number
    width: number
    align: TextAlign
    fontSize: number
    color: string
  },
): void {
  if (decoration === 'none') return
  if (!text) return

  const measured = Math.min(doc.widthOfString(text), options.width)
  // Horizontal start of the painted glyph run.
  let startX = options.x
  if (options.align === 'center') startX = options.x + (options.width - measured) / 2
  else if (options.align === 'right') startX = options.x + options.width - measured

  // PDFKit's baseline sits roughly at y + ~0.8*fontSize. We paint
  // underline slightly below the baseline and line-through near the
  // centre of the line so both decorations read as expected without
  // touching glyphs.
  const lineY =
    decoration === 'underline'
      ? options.y + options.fontSize + 1
      : options.y + options.fontSize * 0.55

  doc.save()
  doc.strokeColor(options.color).lineWidth(Math.max(0.5, options.fontSize * 0.06))
  doc
    .moveTo(startX, lineY)
    .lineTo(startX + measured, lineY)
    .stroke()
  doc.restore()
}
