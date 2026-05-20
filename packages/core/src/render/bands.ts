/**
 * Header / footer stamp pass (#61).
 *
 * Called from `generate.ts` AFTER the body fields have been rendered for
 * every page. PDFKit's `bufferPages: true` keeps every page in memory so
 * we can iterate them in a second pass and stamp the bands + page number.
 * This is also the only path that lets us know the final `pageCount` —
 * PDFKit cannot rewrite earlier pages once they flush.
 *
 * The helper trusts that `manifest.header.fields` / `manifest.footer.fields`
 * carry band-local coordinates (origin = band's top-left). We shallow-copy
 * each field with x/y translated to page coords before handing it to the
 * existing `renderField` — avoids changing that signature.
 */
import type PDFDocument from 'pdfkit'
import type {
  FieldDefinition,
  InputJSON,
  LoadedTemplate,
  PageBand,
  TemplateManifest,
} from '@template-goblin/types'
import { renderField } from './field.js'
import { renderBandDivider } from './bandDivider.js'
import { stampPageNumber } from './pageNumberStamp.js'
import type { PageContext } from '../utils/errorContext.js'

/** Should this band render on the given page index? */
function bandRendersOnPage(band: PageBand, pageIndex: number): boolean {
  if (band.style.height <= 0) return false
  if (pageIndex === 0 && !band.applyToFirstPage) return false
  return true
}

/** Paint the band background fill (if any) at the given Y. */
function paintBandBackground(
  doc: InstanceType<typeof PDFDocument>,
  band: PageBand,
  bandTop: number,
  pageWidth: number,
): void {
  if (!band.style.backgroundColor) return
  doc.save()
  doc.rect(0, bandTop, pageWidth, band.style.height).fill(band.style.backgroundColor)
  doc.restore()
}

/** Iterate `band.fields`, translating each into page coords, then render. */
function renderBandFields(
  doc: InstanceType<typeof PDFDocument>,
  band: PageBand,
  bandTop: number,
  data: InputJSON,
  fontMap: Map<string, string>,
  template: LoadedTemplate,
  pageCtx: PageContext,
  resolvedImages: Map<string, Buffer>,
): void {
  const fields = [...band.fields].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))
  for (const f of fields) {
    const translated: FieldDefinition = {
      ...f,
      x: f.x + band.style.paddingLeft,
      y: bandTop + band.style.paddingTop + f.y,
    } as FieldDefinition
    renderField(doc, translated, data, fontMap, template, pageCtx, resolvedImages)
  }
}

/** Stamp one band on the current page. */
function stampBand(
  doc: InstanceType<typeof PDFDocument>,
  band: PageBand,
  bandTop: number,
  pageWidth: number,
  isHeader: boolean,
  data: InputJSON,
  fontMap: Map<string, string>,
  template: LoadedTemplate,
  pageCtx: PageContext,
  resolvedImages: Map<string, Buffer>,
): void {
  paintBandBackground(doc, band, bandTop, pageWidth)
  renderBandFields(doc, band, bandTop, data, fontMap, template, pageCtx, resolvedImages)
  if (band.style.divider) {
    // Header divider sits at the band's BOTTOM edge; footer's at the TOP.
    const gap = band.style.divider.gap ?? 0
    const dividerY = isHeader ? bandTop + band.style.height + gap : bandTop - gap
    renderBandDivider(doc, band.style.divider, dividerY, pageWidth)
  }
}

/**
 * Stamp bands + page number across every buffered page. Call AFTER body
 * fields are rendered for every page, BEFORE `doc.end()`.
 */
export function stampBands(
  doc: InstanceType<typeof PDFDocument>,
  manifest: TemplateManifest,
  data: InputJSON,
  fontMap: Map<string, string>,
  template: LoadedTemplate,
  resolvedImages: Map<string, Buffer>,
): void {
  if (!manifest.header && !manifest.footer && !manifest.pageNumber?.enabled) return

  const { start, count } = doc.bufferedPageRange()
  const pageWidth = manifest.meta.width
  const pageHeight = manifest.meta.height

  for (let i = 0; i < count; i++) {
    doc.switchToPage(start + i)
    const pageCtx: PageContext = { pageId: null, pageIndex: i }

    if (manifest.header && bandRendersOnPage(manifest.header, i)) {
      stampBand(
        doc,
        manifest.header,
        0,
        pageWidth,
        true,
        data,
        fontMap,
        template,
        pageCtx,
        resolvedImages,
      )
    }
    if (manifest.footer && bandRendersOnPage(manifest.footer, i)) {
      const footerTop = pageHeight - manifest.footer.style.height
      stampBand(
        doc,
        manifest.footer,
        footerTop,
        pageWidth,
        false,
        data,
        fontMap,
        template,
        pageCtx,
        resolvedImages,
      )
    }
    stampPageNumberIfDue(doc, manifest, i, pageWidth)
  }
}

/** Apply the page-number stamp if config says so for this page. */
function stampPageNumberIfDue(
  doc: InstanceType<typeof PDFDocument>,
  manifest: TemplateManifest,
  pageIndex: number,
  pageWidth: number,
): void {
  const cfg = manifest.pageNumber
  if (!cfg?.enabled) return
  if (pageIndex === 0 && !cfg.showOnFirstPage) return

  const band = cfg.placement === 'header' ? manifest.header : manifest.footer
  // If the chosen band is omitted (undefined OR omitted on page 0), the
  // page number has nowhere to sit — skip silently. Validator catches the
  // misconfiguration of a placement with no corresponding band.
  if (!band) return
  if (!bandRendersOnPage(band, pageIndex)) return

  const bandTop = cfg.placement === 'header' ? 0 : manifest.meta.height - band.style.height
  stampPageNumber(doc, {
    config: cfg,
    bandStyle: band.style,
    bandTop,
    pageWidth,
    pageIndex1Based: pageIndex + 1,
  })
}
