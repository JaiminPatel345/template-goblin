import PDFDocument from 'pdfkit'
import type {
  LoadedTemplate,
  InputJSON,
  FieldDefinition,
  LoopRow,
  PageDefinition,
  TemplateMeta,
} from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { validateData } from './validate.js'
import { registerFonts } from './utils/font.js'
import { resolveKey } from './utils/resolveKey.js'
import { renderBackground, renderColorBackground } from './render/background.js'
import { renderText } from './render/text.js'
import { renderImage } from './render/image.js'
import { renderLoop } from './render/loop.js'

/**
 * Generate a PDF from an in-memory template and input data.
 *
 * This is the hot path — called millions of times. Zero disk I/O.
 * All assets are already loaded in the LoadedTemplate object.
 *
 * Process:
 * 1. Validate input data against manifest
 * 2. Create PDFKit document with page dimensions from manifest
 * 3. Register custom fonts
 * 4. Render background image
 * 5. Render all fields in zIndex order (lowest first)
 *
 * @param template - LoadedTemplate returned by loadTemplate()
 * @param data - Input JSON with texts, loops, and images
 * @returns PDF as a Buffer
 * @throws TemplateGoblinError with code MISSING_REQUIRED_FIELD, INVALID_DATA_TYPE, MAX_PAGES_EXCEEDED, or PDF_GENERATION_FAILED
 */
export async function generatePDF(template: LoadedTemplate, data: InputJSON): Promise<Buffer> {
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

  const { manifest, backgroundImage, pageBackgrounds } = template
  const { meta } = manifest
  const pages = manifest.pages && manifest.pages.length > 0 ? manifest.pages : null

  try {
    // Create PDFKit document with page dimensions
    const doc = new PDFDocument({
      size: [meta.width, meta.height],
      margin: 0,
      autoFirstPage: true,
      bufferPages: true,
    })

    // Collect PDF output into a Buffer
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
      renderBackground(doc, backgroundImage, meta)

      const sortedFields = [...manifest.fields].sort(
        (a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id),
      )

      for (const field of sortedFields) {
        renderField(doc, field, data, fontMap, template)
      }
    } else {
      // Multi-page: group fields by pageId, render each page
      const fieldsByPage = new Map<string | null, FieldDefinition[]>()
      for (const field of manifest.fields) {
        const key = field.pageId
        if (!fieldsByPage.has(key)) {
          fieldsByPage.set(key, [])
        }
        const pageFields = fieldsByPage.get(key)
        if (pageFields) pageFields.push(field)
      }

      const sortedPages = [...pages].sort((a, b) => a.index - b.index)
      let previousBackground: Buffer | null = backgroundImage

      for (let i = 0; i < sortedPages.length; i++) {
        const page = sortedPages[i] as PageDefinition

        // Add new page for pages after the first (first page is auto-created)
        if (i > 0) {
          doc.addPage({ size: [meta.width, meta.height] })
        }

        // Render page background based on backgroundType
        const currentBackground = renderPageBackground(
          doc,
          page,
          meta,
          pageBackgrounds,
          backgroundImage,
          previousBackground,
        )
        previousBackground = currentBackground

        // Collect fields for this page: fields with matching pageId + null-pageId fields on page 0
        const pageFields: FieldDefinition[] = []
        const directFields = fieldsByPage.get(page.id) ?? []
        pageFields.push(...directFields)

        // Fields with pageId: null render on page index 0
        if (page.index === 0) {
          const nullFields = fieldsByPage.get(null) ?? []
          pageFields.push(...nullFields)
        }

        // Sort by zIndex (lowest first), stable with id tiebreaker
        pageFields.sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))

        for (const field of pageFields) {
          renderField(doc, field, data, fontMap, template)
        }
      }
    }

    // Finalize PDF
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

/**
 * Render the background for a single page based on its backgroundType.
 *
 * @param doc - PDFKit document
 * @param page - Page definition with background settings
 * @param meta - Template metadata with page dimensions
 * @param pageBackgrounds - Map of page ID to background image Buffer
 * @param backgroundImage - Legacy single background image (page 0 fallback)
 * @param previousBackground - Previous page's resolved background image Buffer
 * @returns The resolved background image Buffer for this page (for inherit chain)
 */
function renderPageBackground(
  doc: InstanceType<typeof PDFDocument>,
  page: PageDefinition,
  meta: TemplateMeta,
  pageBackgrounds: Map<string, Buffer>,
  backgroundImage: Buffer | null,
  previousBackground: Buffer | null,
): Buffer | null {
  switch (page.backgroundType) {
    case 'image': {
      const bgBuffer = pageBackgrounds.get(page.id) ?? (page.index === 0 ? backgroundImage : null)
      renderBackground(doc, bgBuffer, meta)
      return bgBuffer
    }
    case 'color': {
      if (page.backgroundColor) {
        renderColorBackground(doc, page.backgroundColor, meta)
      }
      return null
    }
    case 'inherit': {
      renderBackground(doc, previousBackground, meta)
      return previousBackground
    }
    default:
      return null
  }
}

/**
 * Render a single field based on its type.
 */
function renderField(
  doc: InstanceType<typeof PDFDocument>,
  field: FieldDefinition,
  data: InputJSON,
  fontMap: Map<string, string>,
  template: LoadedTemplate,
): void {
  const value = resolveKey(data as unknown as Record<string, unknown>, field.jsonKey)

  // Skip if value is not provided (optional field)
  if (value === undefined || value === null) return

  switch (field.type) {
    case 'text':
      if (typeof value !== 'string') break
      renderText(doc, field, value, fontMap)
      break

    case 'image':
      if (typeof value !== 'string' && !Buffer.isBuffer(value)) break
      renderImage(doc, field, value)
      break

    case 'loop':
      renderLoop(
        doc,
        field,
        value as LoopRow[],
        fontMap,
        template.manifest.meta,
        template.backgroundImage,
      )
      break
  }
}

/**
 * Convenience function: load a template from disk and generate a PDF in one call.
 *
 * Do NOT use this in a loop — use loadTemplate() + generatePDF() instead.
 *
 * @param path - Path to the .tgbl file
 * @param data - Input JSON with texts, loops, and images
 * @returns PDF as a Buffer
 */
export async function generatePDFFromFile(path: string, data: InputJSON): Promise<Buffer> {
  const { loadTemplate } = await import('./load.js')
  const template = await loadTemplate(path)
  return generatePDF(template, data)
}
