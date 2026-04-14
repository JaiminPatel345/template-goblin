import PDFDocument from 'pdfkit'
import type { LoadedTemplate, InputJSON, FieldDefinition, LoopRow } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { validateData } from './validate.js'
import { registerFonts } from './utils/font.js'
import { resolveKey } from './utils/resolveKey.js'
import { renderBackground } from './render/background.js'
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

  const { manifest, backgroundImage } = template
  const { meta } = manifest

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

    // REQ: Render background image first on page 1
    renderBackground(doc, backgroundImage, meta)

    // REQ: Sort fields by zIndex (lowest first) and render
    const sortedFields = [...manifest.fields].sort((a, b) => a.zIndex - b.zIndex)

    for (const field of sortedFields) {
      renderField(doc, field, data, fontMap, template)
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
      renderText(doc, field, value as string, fontMap)
      break

    case 'image':
      renderImage(doc, field, value as Buffer | string)
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
