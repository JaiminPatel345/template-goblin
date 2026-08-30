import PDFDocument from 'pdfkit'
import type {
  LoadedTemplate,
  InputJSON,
  FieldDefinition,
  PageDefinition,
} from '@template-goblin/types'
import { getPageSize, TemplateGoblinError } from '@template-goblin/types'
import { validateData } from './validate.js'
import { validateManifest } from './validateManifest.js'
import { preflightImages, type PreflightOptions } from './preflight.js'
import { registerFonts } from './utils/font.js'
import { type PageContext } from './utils/errorContext.js'
import { renderBackground } from './render/background.js'
import { renderField } from './render/field.js'
import { renderPageBackground, renderPageBackgroundSafely } from './render/page.js'
import { stampBands } from './render/bands.js'

/** Per-call options for {@link generatePDF}. */
export type GeneratePDFOptions = PreflightOptions

/**
 * Generate a PDF from an in-memory template and input data.
 *
 * This is the hot path — called millions of times. Zero disk I/O.
 * All assets are already loaded in the LoadedTemplate object.
 *
 * Process:
 * 1. Validate input data against manifest
 * 2. Pre-flight image-bytes check (catches PDFKit format errors with context)
 * 3. Create PDFDocument with page dimensions
 * 4. Register custom TTF fonts once
 * 5. Group fields by pageId
 * 6. Render all fields in zIndex order (lowest first)
 * 7. Return Buffer
 */
export async function generatePDF(
  template: LoadedTemplate,
  data: InputJSON,
  options: GeneratePDFOptions = {},
): Promise<Buffer> {
  // Defence-in-depth: run the FULL manifest validator at the renderer
  // boundary too. `loadTemplate` already calls this on `.tgbl` open, but
  // SDK consumers that construct a `LoadedTemplate` programmatically (or
  // a server endpoint that accepts a manifest in the request body) would
  // otherwise reach PDFKit with malformed input — including the
  // negative-page-dimension / NaN-page-dimension class of bugs that
  // silently produce a corrupted PDF.
  validateManifest(template.manifest)

  // REQ: Validate input data
  const validation = validateData(template, data)
  if (!validation.valid) {
    const firstError = validation.errors[0]
    if (firstError) {
      throw new TemplateGoblinError(firstError.code, firstError.message, {
        field: firstError.field,
      })
    }
  }

  // Pre-flight: catch image format / missing-asset issues before PDFKit runs
  // AND resolve every dynamic image input (Buffer / base64 / data URI / file
  // path / URL / explicit shape — #69) to a Buffer the renderer can hand to
  // PDFKit directly. Centralises all I/O at one boundary so the renderer
  // stays pure.
  const { resolvedImages } = await preflightImages(template, data, options)

  const { manifest, backgroundImage, pageBackgrounds } = template
  const { meta } = manifest
  const pages = manifest.pages && manifest.pages.length > 0 ? manifest.pages : null
  const sortedPages = pages ? [...pages].sort((a, b) => a.index - b.index) : []
  const firstPageSize = getPageSize(sortedPages[0] ?? null, meta)

  try {
    const doc = new PDFDocument({
      size: [firstPageSize.width, firstPageSize.height],
      margin: 0,
      autoFirstPage: true,
      bufferPages: true,
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
    })

    // REQ: Register custom fonts once per generatePDF call
    const fontMap = registerFonts(doc, template)

    if (!pages) {
      // Backward compat: single-page template with no pages array
      const legacyCtx: PageContext = { pageId: null, pageIndex: 0 }
      renderPageBackgroundSafely(doc, () => renderBackground(doc, backgroundImage, meta), legacyCtx)

      const sortedFields = [...manifest.fields].sort(
        (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
      )

      for (const field of sortedFields) {
        renderField(doc, field, data, fontMap, template, legacyCtx, resolvedImages)
      }
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
        const pageSize = getPageSize(page, meta)

        if (i > 0) {
          // `addPage(options)` REPLACES the constructor options — without an
          // explicit margin PDFKit applies its 72pt default to every page
          // after the first, shrinking the writable area: content in the
          // bottom 72pt triggered auto-pagination (phantom pages) and split
          // clip save/restore pairs across pages (corrupt q/Q nesting).
          doc.addPage({ size: [pageSize.width, pageSize.height], margin: 0 })
        }

        const pageCtx: PageContext = { pageId: page.id, pageIndex: page.index }
        let currentBackground: Buffer | null = null
        renderPageBackgroundSafely(
          doc,
          () => {
            currentBackground = renderPageBackground(
              doc,
              page,
              meta,
              pageBackgrounds,
              backgroundImage,
              previousBackground,
            )
          },
          pageCtx,
        )
        previousBackground = currentBackground

        // Collect fields: matching pageId + null-pageId fields on page 0
        const pageFields: FieldDefinition[] = []
        pageFields.push(...(fieldsByPage.get(page.id) ?? []))
        if (page.index === 0) {
          pageFields.push(...(fieldsByPage.get(null) ?? []))
        }

        // Sort by zIndex (lowest first), stable with id tiebreaker
        pageFields.sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))

        // A multiPage table appends continuation pages and leaves the doc
        // pointed at the LAST of them — without switching back, every
        // later field of this template page rendered onto the table's
        // final overflow page instead of its own. Pin this page's buffer
        // index (it IS the last page right after addPage) and return to
        // it whenever a field grew the document.
        const thisPageIndex = doc.bufferedPageRange().count - 1
        for (const field of pageFields) {
          renderField(doc, field, data, fontMap, template, pageCtx, resolvedImages)
          if (doc.bufferedPageRange().count - 1 !== thisPageIndex) {
            doc.switchToPage(thisPageIndex)
          }
        }
      }
    }

    // #61 — page-wide header / footer / page-number stamp pass. Runs AFTER
    // body content for every page is buffered so we know the final pageCount
    // and can iterate via `bufferedPageRange()`/`switchToPage()`. Safe no-op
    // when manifest has neither header nor footer nor enabled page number.
    stampBands(doc, manifest, data, fontMap, template, resolvedImages)

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
