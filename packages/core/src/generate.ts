import PDFDocument from 'pdfkit'
import type {
  LoadedTemplate,
  InputJSON,
  FieldDefinition,
  PageDefinition,
  TableField,
  TemplateMeta,
} from '@template-goblin/types'
import { getPageSize, TemplateGoblinError, resolveTableHeightMode } from '@template-goblin/types'
import { validateData } from './validate.js'
import { validateManifest } from './validateManifest.js'
import { preflightImages, type PreflightOptions } from './preflight.js'
import { registerFonts } from './utils/font.js'
import { type PageContext } from './utils/errorContext.js'
import { renderBackground } from './render/background.js'
import { renderField } from './render/field.js'
import { renderPageBackground, renderPageBackgroundSafely } from './render/page.js'
import { stampBands } from './render/bands.js'
import { adjustPageLayout } from './utils/dynamicLayout.js'

/** Per-call options for {@link generatePDF}. */
export interface GeneratePDFOptions extends PreflightOptions {
  /**
   * Safety ceiling for continuation pages created by multi-page tables.
   * Defaults to 500. Set to e.g. 1000 or Infinity for large datasets.
   */
  maxRenderPages?: number
}

/**
 * Generate a PDF from an in-memory template and input data.
 * The hot path — zero disk I/O. Assets are already loaded in LoadedTemplate.
 */
export async function generatePDF(
  template: LoadedTemplate,
  data: InputJSON,
  options: GeneratePDFOptions = {},
): Promise<Buffer> {
  // Defence-in-depth: run full manifest validator at the renderer boundary.
  validateManifest(template.manifest)

  // Validate input data
  const validation = validateData(template, data)
  if (!validation.valid) {
    const firstError = validation.errors[0]
    if (firstError) {
      throw new TemplateGoblinError(firstError.code, firstError.message, {
        field: firstError.field,
      })
    }
  }

  // Preflight image bytes check and resolve dynamic images
  const { resolvedImages } = await preflightImages(template, data, options)

  const { manifest, backgroundImage, pageBackgrounds } = template
  const pages = manifest.pages && manifest.pages.length > 0 ? manifest.pages : null
  const sortedPages = pages ? [...pages].sort((a, b) => a.index - b.index) : []

  const hasMultipage = manifest.fields.some(
    (f) => f.type === 'table' && resolveTableHeightMode(f.style) === 'multipage',
  )
  const ceiling = options.maxRenderPages ?? 500
  const maxPagesLimit = ceiling === Infinity || ceiling <= 0 ? -1 : ceiling
  const effectiveMeta: TemplateMeta = {
    ...manifest.meta,
    maxPages:
      hasMultipage || manifest.meta.maxPages === -1 ? maxPagesLimit : manifest.meta.maxPages,
  }
  const effectiveTemplate: LoadedTemplate = {
    ...template,
    manifest: {
      ...manifest,
      meta: effectiveMeta,
    },
  }
  const firstPageSize = getPageSize(sortedPages[0] ?? null, effectiveMeta)

  try {
    const doc = new PDFDocument({
      size: [firstPageSize.width, firstPageSize.height],
      margin: 0,
      autoFirstPage: false,
      bufferPages: true,
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    // REQ: Register custom fonts once per generatePDF call
    const fontMap = registerFonts(doc, effectiveTemplate)

    if (!pages) {
      // Backward compat: single-page template with no pages array
      const legacyCtx: PageContext = { pageId: null, pageIndex: 0 }
      const layout = adjustPageLayout(
        manifest.fields,
        data,
        effectiveMeta.width,
        effectiveMeta.height,
      )
      doc.addPage({ size: [layout.width, layout.height], margin: 0 })
      renderPageBackgroundSafely(
        doc,
        () => renderBackground(doc, backgroundImage, effectiveMeta, layout),
        legacyCtx,
      )

      const sortedFields = [...layout.fields].sort(
        (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
      )

      renderPageFields(
        doc,
        sortedFields,
        data,
        fontMap,
        effectiveTemplate,
        legacyCtx,
        resolvedImages,
        layout.height,
        layout.width,
        backgroundImage,
        effectiveMeta,
      )
    } else {
      // Multi-page: group fields by pageId, render each page
      const fieldsByPage = new Map<string | null, FieldDefinition[]>()
      for (const field of manifest.fields) {
        const key = field.pageId
        if (!fieldsByPage.has(key)) fieldsByPage.set(key, [])
        fieldsByPage.get(key)?.push(field)
      }

      let previousBackground: Buffer | null = backgroundImage

      for (let i = 0; i < sortedPages.length; i++) {
        const page = sortedPages[i] as PageDefinition
        const basePageSize = getPageSize(page, effectiveMeta)

        // Collect fields: matching pageId + null-pageId fields on page 0
        const pageFields: FieldDefinition[] = []
        pageFields.push(...(fieldsByPage.get(page.id) ?? []))
        if (page.index === 0) {
          pageFields.push(...(fieldsByPage.get(null) ?? []))
        }

        const layout = adjustPageLayout(pageFields, data, basePageSize.width, basePageSize.height)

        doc.addPage({ size: [layout.width, layout.height], margin: 0 })

        const pageCtx: PageContext = { pageId: page.id, pageIndex: page.index }
        let currentBackground: Buffer | null = null
        renderPageBackgroundSafely(
          doc,
          () => {
            currentBackground = renderPageBackground(
              doc,
              page,
              effectiveMeta,
              pageBackgrounds,
              backgroundImage,
              previousBackground,
              { width: layout.width, height: layout.height },
            )
          },
          pageCtx,
        )
        previousBackground = currentBackground

        // Sort by zIndex (lowest first), stable with id tiebreaker
        const sortedFields = [...layout.fields].sort(
          (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
        )

        renderPageFields(
          doc,
          sortedFields,
          data,
          fontMap,
          effectiveTemplate,
          pageCtx,
          resolvedImages,
          layout.height,
          layout.width,
          backgroundImage,
          effectiveMeta,
        )
      }
    }

    // #61 — page-wide header / footer / page-number stamp pass. Runs AFTER
    // body content for every page is buffered so we know the final pageCount
    // and can iterate via `bufferedPageRange()`/`switchToPage()`. Safe no-op
    // when manifest has neither header nor footer nor enabled page number.
    stampBands(doc, effectiveTemplate.manifest, data, fontMap, effectiveTemplate, resolvedImages)

    doc.end()
    return await pdfReady
  } catch (error) {
    if (error instanceof TemplateGoblinError) throw error
    throw new TemplateGoblinError(
      'PDF_GENERATION_FAILED',
      `PDF generation failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    )
  }
}

function renderPageFields(
  doc: InstanceType<typeof PDFDocument>,
  sortedFields: FieldDefinition[],
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
  const multipageTable = sortedFields.find(
    (f): f is TableField => f.type === 'table' && resolveTableHeightMode(f.style) === 'multipage',
  )

  if (!multipageTable) {
    const thisPageIndex = doc.bufferedPageRange().count - 1
    for (const field of sortedFields) {
      renderField(doc, field, data, fontMap, template, pageCtx, resolvedImages)
      if (doc.bufferedPageRange().count - 1 !== thisPageIndex) {
        doc.switchToPage(thisPageIndex)
      }
    }
    return
  }

  // Multipage table flow:
  // 1. Fields above/beside the table render on the start page.
  // 2. The table renders across start page and continuation pages.
  // 3. Fields below the table render on the final continuation page below table finish.
  const tableBottom = multipageTable.y + multipageTable.height
  const beforeTable = sortedFields.filter((f) => f.id !== multipageTable.id && f.y < tableBottom)
  const afterTable = sortedFields.filter((f) => f.id !== multipageTable.id && f.y >= tableBottom)

  for (const field of beforeTable) {
    renderField(doc, field, data, fontMap, template, pageCtx, resolvedImages)
  }

  const tableResult = renderField(
    doc,
    multipageTable,
    data,
    fontMap,
    template,
    pageCtx,
    resolvedImages,
  )

  const finalTablePageIndex = doc.bufferedPageRange().count - 1
  doc.switchToPage(finalTablePageIndex)

  const finalY = tableResult?.finalY ?? tableBottom
  const deltaY = finalY - tableBottom

  const m = template.manifest
  const footerMargin =
    m.footer?.enabled && m.footer.style.height > 0
      ? m.footer.style.height + (m.footer.style.divider?.gap ?? 0)
      : 20
  const headerMargin =
    m.header?.enabled && m.header.style.height > 0
      ? m.header.style.height + (m.header.style.divider?.gap ?? 0)
      : Math.min(multipageTable.y, 40)

  for (const field of afterTable) {
    const shiftedField = deltaY !== 0 ? { ...field, y: field.y + deltaY } : { ...field }
    if (shiftedField.y + shiftedField.height > pageHeight - footerMargin) {
      doc.addPage({ size: [pageWidth, pageHeight], margin: 0 })
      renderBackground(doc, backgroundImage, effectiveMeta)
      shiftedField.y = headerMargin + (field.y - tableBottom)
    }
    renderField(doc, shiftedField, data, fontMap, template, pageCtx, resolvedImages)
  }

  // Ensure document pointer is left on the final page of this sequence
  doc.switchToPage(doc.bufferedPageRange().count - 1)
}
