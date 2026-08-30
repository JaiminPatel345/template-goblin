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
  pageSize?: { width: number; height: number },
): void {
  if (!backgroundImage) return

  const width = pageSize?.width ?? meta.width
  const height = pageSize?.height ?? meta.height

  // REQ: Background image rendered first on every page, filling page dimensions
  doc.image(backgroundImage, 0, 0, {
    width,
    height,
  })
}

/**
 * Render a solid color background on the current page of a PDFKit document.
 *
 * @param doc - PDFKit document
 * @param color - CSS hex color string (e.g., '#ffffff')
 * @param meta - Template metadata with page dimensions
 * @param pageSize - Optional per-page size override
 */
export function renderColorBackground(
  doc: InstanceType<typeof PDFDocument>,
  color: string,
  meta: TemplateMeta,
  pageSize?: { width: number; height: number },
): void {
  const width = pageSize?.width ?? meta.width
  const height = pageSize?.height ?? meta.height

  doc.save()
  doc.rect(0, 0, width, height).fill(color)
  doc.restore()
}
