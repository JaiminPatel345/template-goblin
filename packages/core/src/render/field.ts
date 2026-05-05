import type PDFDocument from 'pdfkit'
import type { FieldDefinition, InputJSON, LoadedTemplate, TableRow } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { resolveValue } from '../utils/resolveValue.js'
import { fieldErrorDetails, pageLabel, type PageContext } from '../utils/errorContext.js'
import { renderText } from './text.js'
import { renderImage } from './image.js'
import { renderLoop } from './loop.js'

/**
 * Render a single field based on its type.
 *
 * Wraps each render call in a try/catch so any error from PDFKit (e.g.
 * "Unknown image format") is rethrown as `PDF_GENERATION_FAILED` carrying
 * the field id, type, page index, and asset filename.
 */
export function renderField(
  doc: InstanceType<typeof PDFDocument>,
  field: FieldDefinition,
  data: InputJSON,
  fontMap: Map<string, string>,
  template: LoadedTemplate,
  pageCtx: PageContext,
): void {
  const value = resolveValue(field as FieldDefinition, data) as unknown

  // Skip if value is not provided (optional dynamic field or unresolved static)
  if (value === undefined || value === null) return

  try {
    switch (field.type) {
      case 'text':
        if (typeof value !== 'string') break
        renderText(doc, field, value, fontMap)
        break

      case 'image': {
        // Dynamic image: value is Buffer or base64 string — passed directly.
        // Static image: value is { filename } — look up bytes in staticImages.
        let imageData: Buffer | string | undefined
        if (typeof value === 'string' || Buffer.isBuffer(value)) {
          imageData = value
        } else if (value && typeof value === 'object' && 'filename' in value) {
          imageData = template.staticImages.get((value as { filename: string }).filename)
        }
        if (!imageData) break
        renderImage(doc, field, imageData)
        break
      }

      case 'table':
        renderLoop(
          doc,
          field,
          value as TableRow[],
          fontMap,
          template.manifest.meta,
          template.backgroundImage,
        )
        break
    }
  } catch (error) {
    if (error instanceof TemplateGoblinError) throw error
    const detail = fieldErrorDetails(field, pageCtx)
    throw new TemplateGoblinError(
      'PDF_GENERATION_FAILED',
      `PDF generation failed for ${field.type} field '${field.id}'${pageLabel(pageCtx)}${detail.suffix}: ${error instanceof Error ? error.message : 'unknown error'}`,
      detail.details,
    )
  }
}
