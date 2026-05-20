/**
 * Render the auto-divider line at the body-facing edge of a page band (#61).
 *
 * Pure draw helper — caller decides which Y-coordinate the divider sits at
 * (top edge for footer, bottom edge for header). Skips silently when the
 * divider config is null or its colour is null.
 */
import type PDFDocument from 'pdfkit'
import type { PageBandDivider } from '@template-goblin/types'

/**
 * Stamp a horizontal divider line at `y` spanning `pageWidth`.
 *
 * `gap` is honoured by the caller (it determines the y coordinate passed
 * in); the divider itself is a single 1-line `strokeWidth = divider.width`
 * stroke.
 */
export function renderBandDivider(
  doc: InstanceType<typeof PDFDocument>,
  divider: PageBandDivider | null,
  y: number,
  pageWidth: number,
): void {
  if (!divider || !divider.color) return
  if (divider.width <= 0) return
  doc.save()
  doc.strokeColor(divider.color).lineWidth(divider.width)
  doc.moveTo(0, y).lineTo(pageWidth, y).stroke()
  doc.restore()
}
