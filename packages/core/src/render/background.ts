import type PDFDocument from 'pdfkit'
import type { TemplateMeta } from '@template-goblin/types'

/**
 * Render the background image on the current page of a PDFKit document.
 *
 * The background is rendered first, filling the entire page dimensions.
 *
 * @param doc - PDFKit document
 * @param backgroundImage - Background image as Buffer, or null if no background
 * @param meta - Template metadata with page dimensions
 */
export function renderBackground(
  doc: InstanceType<typeof PDFDocument>,
  backgroundImage: Buffer | null,
  meta: TemplateMeta,
): void {
  if (!backgroundImage) return

  // REQ: Background image rendered first on every page, filling page dimensions
  doc.image(backgroundImage, 0, 0, {
    width: meta.width,
    height: meta.height,
  })
}

/**
 * Render a solid color background on the current page of a PDFKit document.
 *
 * @param doc - PDFKit document
 * @param color - CSS hex color string (e.g., '#ffffff')
 * @param meta - Template metadata with page dimensions
 */
export function renderColorBackground(
  doc: InstanceType<typeof PDFDocument>,
  color: string,
  meta: TemplateMeta,
): void {
  doc.save()
  doc.rect(0, 0, meta.width, meta.height).fill(color)
  doc.restore()
}
