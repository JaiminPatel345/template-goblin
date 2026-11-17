import type PDFDocument from 'pdfkit'
import type {
  FieldDefinition,
  InputJSON,
  LoadedTemplate,
  TableField,
  TemplateMeta,
} from '@template-goblin/types'
import type { PageContext } from '../utils/errorContext.js'
import { renderField } from './field.js'
import { renderBackground } from './background.js'

/**
 * Render fields on a page containing a multi-page dynamic table.
 *
 * Rules:
 * 1. Fields strictly above the table on canvas render on the start page before the table.
 * 2. The table renders across start page and continuation pages using full available height.
 * 3. Fields after the table on canvas render on the page where the table finishes if space is available.
 * 4. Only if remaining space on the final table page is insufficient does a new page get added.
 *
 * @param doc The active PDFDocument instance
 * @param sortedFields Fields on the current template page
 * @param multipageTable The multi-page dynamic table field
 * @param data Runtime input JSON data
 * @param fontMap Map of font names to file paths
 * @param template The loaded template instance
 * @param pageCtx Page context (id, index)
 * @param resolvedImages Pre-loaded image buffers
 * @param pageHeight Page height
 * @param pageWidth Page width
 * @param backgroundImage Optional background image buffer
 * @param effectiveMeta Template metadata
 */
export function renderPageFieldsWithMultipageTable(
  doc: InstanceType<typeof PDFDocument>,
  sortedFields: FieldDefinition[],
  multipageTable: TableField,
  data: InputJSON,
  fontMap: Map<string, string>,
  template: LoadedTemplate,
  pageCtx: PageContext,
  resolvedImages: Map<string, Buffer>,
  pageHeight: number,
  pageWidth: number,
  backgroundImage: Buffer | null,
  effectiveMeta: TemplateMeta,
): void {
  const tableTop = multipageTable.y
  const tableBottom = multipageTable.y + multipageTable.height

  const beforeTable = sortedFields.filter((f) => f.id !== multipageTable.id && f.y < tableTop)
  const afterTable = sortedFields.filter((f) => f.id !== multipageTable.id && f.y >= tableTop)

  // 1. Fields above the table render on the start page
  for (const field of beforeTable) {
    renderField(doc, field, data, fontMap, template, pageCtx, resolvedImages)
  }

  // 2. Multipage table renders across start page and continuation pages
  const tableResult = renderField(
    doc,
    multipageTable,
    data,
    fontMap,
    template,
    pageCtx,
    resolvedImages,
  )

  // 3. Switch to the final page where the table completed
  const finalTablePageIndex = doc.bufferedPageRange().count - 1
  doc.switchToPage(finalTablePageIndex)

  const finalY = tableResult?.finalY ?? tableBottom
  const m = template.manifest
  const footerMargin =
    m.footer?.enabled && m.footer.style.height > 0
      ? m.footer.style.height + (m.footer.style.divider?.gap ?? 0)
      : 20
  const headerMargin =
    m.header?.enabled && m.header.style.height > 0
      ? m.header.style.height + (m.header.style.divider?.gap ?? 0)
      : Math.min(multipageTable.y, 40)

  const maxPageY = pageHeight - footerMargin

  // 4. Render trailing elements on the same page where table finishes if space is available
  if (afterTable.length > 0) {
    const sortedAfter = [...afterTable].sort((a, b) => a.y - b.y || a.x - b.x)
    const minCanvasY = sortedAfter[0]?.y ?? tableBottom
    const canvasGap = Math.max(0, minCanvasY - tableBottom)
    const defaultGap = canvasGap > 0 && canvasGap <= 24 ? canvasGap : 12

    const totalSpan = Math.max(...sortedAfter.map((f) => f.y + f.height)) - minCanvasY

    let currentBaseY = finalY + defaultGap
    // If the entire block fits with a compact 6pt gap, use 6pt gap to avoid unnecessary page break
    if (currentBaseY + totalSpan > maxPageY && finalY + 6 + totalSpan <= maxPageY) {
      currentBaseY = finalY + 6
    }

    let currentCanvasBaseY = minCanvasY
    let pageStartY = currentBaseY

    for (const field of sortedAfter) {
      const fieldOffset = field.y - currentCanvasBaseY
      let targetY = pageStartY + fieldOffset

      if (targetY + field.height > maxPageY) {
        // Space is not available on this page — start a new continuation page
        doc.addPage({ size: [pageWidth, pageHeight], margin: 0 })
        renderBackground(doc, backgroundImage, effectiveMeta)
        pageStartY = headerMargin + 10
        currentCanvasBaseY = field.y
        targetY = pageStartY
      }

      const positionedField = { ...field, y: targetY }
      renderField(doc, positionedField, data, fontMap, template, pageCtx, resolvedImages)
    }
  }

  // Ensure document pointer is left on the final page of this sequence
  doc.switchToPage(doc.bufferedPageRange().count - 1)
}
