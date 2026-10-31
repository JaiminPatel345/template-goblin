/**
 * Page-number stamp helper (#61).
 *
 * Draws the formatted page number inside a band's padding-respecting rect.
 * Used by `stampBands`; isolated so it can be unit-tested without standing
 * up a full PDFDocument render pipeline.
 *
 * Vertical alignment is always "middle of band" — matches Word / Pages
 * behaviour where page numbers sit centred in the header/footer band. If
 * users ever ask for top/bottom variants we add it then.
 */
import type PDFDocument from 'pdfkit'
import type { PageBandStyle, PageNumberConfig } from '@template-goblin/types'
import { formatPageNumber } from '@template-goblin/types'
import { resolvePdfFontName } from './pdfFontResolver.js'

interface StampOptions {
  config: PageNumberConfig
  bandStyle: PageBandStyle
  /** Y of the band's top edge on the page. */
  bandTop: number
  pageWidth: number
  pageIndex1Based: number
}

/** Stamp the page number into the band, honouring align / padding / colour. */
export function stampPageNumber(doc: InstanceType<typeof PDFDocument>, opts: StampOptions): void {
  const { config, bandStyle, bandTop, pageWidth, pageIndex1Based } = opts
  const text = formatPageNumber(pageIndex1Based, config.numeralStyle)
  if (!text) return

  const innerX = bandStyle.paddingLeft
  const innerY = bandTop + bandStyle.paddingTop
  const innerW = Math.max(0, pageWidth - bandStyle.paddingLeft - bandStyle.paddingRight)
  const innerH = Math.max(0, bandStyle.height - bandStyle.paddingTop - bandStyle.paddingBottom)
  if (innerW <= 0 || innerH <= 0) return

  doc.save()
  // Route through the standard-family resolver (same as text fields) so a
  // family like 'Helvetica' maps to a real PDF font name instead of being
  // passed raw to `doc.font` — which threw for any non-exact spelling.
  doc.font(resolvePdfFontName(config.fontFamily, undefined, undefined))
  doc.fontSize(config.fontSize).fillColor(config.color)
  // Centre vertically inside the inner rect.
  const textHeight = doc.currentLineHeight()
  const y = innerY + (innerH - textHeight) / 2
  doc.text(text, innerX, y, {
    width: innerW,
    align: config.align,
    lineBreak: false,
  })
  doc.restore()
}
