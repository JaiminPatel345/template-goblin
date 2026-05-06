import type { FieldDefinition, InputJSON, LoadedTemplate } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { sniffImageFormat } from './utils/imageFormat.js'
import { pageContextFor, pageLabel, type PageContext } from './utils/errorContext.js'

/**
 * Validate every image referenced by the template (static + dynamic) before
 * any PDFKit calls run. Surfaces precise errors that name the field id, page,
 * and asset filename — replacing PDFKit's bare "Unknown image format".
 *
 * Throws `TemplateGoblinError` on the first problem so the caller can act on
 * a stable, structured error object (`details` carries `fieldId`, `pageId`,
 * `pageIndex`, `assetFilename`, `jsonKey`).
 */
export function preflightImages(template: LoadedTemplate, data: InputJSON): void {
  const { manifest } = template
  const inputImages = (data.images ?? {}) as Record<string, unknown>

  for (const field of manifest.fields) {
    if (field.type !== 'image') continue

    const pageContext = pageContextFor(template, field.pageId)

    if (field.source.mode === 'static') {
      checkStaticImage(template, field, pageContext)
    } else {
      checkDynamicImage(inputImages, field, pageContext)
    }
  }
}

function checkStaticImage(
  template: LoadedTemplate,
  field: FieldDefinition,
  pageContext: PageContext,
): void {
  if (field.source.mode !== 'static') return
  const filename = (field.source.value as { filename?: string } | null)?.filename
  if (!filename) return // nothing baked in — renderer skips silently

  const bytes = template.staticImages.get(filename)
  if (!bytes || bytes.length === 0) {
    throw new TemplateGoblinError(
      'MISSING_ASSET',
      `Static image asset not found in .tgbl: field '${field.id}'${pageLabel(pageContext)} references '${filename}', but the archive does not contain that file.`,
      {
        fieldId: field.id,
        fieldType: 'image',
        assetFilename: filename,
        pageId: pageContext.pageId,
        pageIndex: pageContext.pageIndex,
      },
    )
  }

  if (sniffImageFormat(bytes) === null) {
    throw new TemplateGoblinError(
      'INVALID_FORMAT',
      `Unsupported image format for static field '${field.id}'${pageLabel(pageContext)}: asset '${filename}' is not a valid PNG or JPEG. PDFKit accepts only PNG and JPEG.`,
      {
        fieldId: field.id,
        fieldType: 'image',
        assetFilename: filename,
        pageId: pageContext.pageId,
        pageIndex: pageContext.pageIndex,
      },
    )
  }
}

function checkDynamicImage(
  inputImages: Record<string, unknown>,
  field: FieldDefinition,
  pageContext: PageContext,
): void {
  if (field.source.mode !== 'dynamic') return
  const { jsonKey, required } = field.source
  const raw = inputImages[jsonKey]

  // Optional + missing → renderer skips silently. validateData already raises
  // MISSING_REQUIRED_FIELD for required+missing, so we only handle the bytes.
  if (raw === undefined || raw === null || raw === '') {
    if (required) return // already reported by validateData
    return
  }

  const bytes = coerceImageBytes(raw)
  if (!bytes) return // wrong type — validateData already raised INVALID_DATA_TYPE

  if (bytes.length === 0) {
    throw new TemplateGoblinError(
      'INVALID_DATA_TYPE',
      `Empty image data for 'images.${jsonKey}' (field '${field.id}'${pageLabel(pageContext)}): buffer/base64 string decoded to zero bytes.`,
      {
        fieldId: field.id,
        fieldType: 'image',
        jsonKey,
        pageId: pageContext.pageId,
        pageIndex: pageContext.pageIndex,
      },
    )
  }

  if (sniffImageFormat(bytes) === null) {
    throw new TemplateGoblinError(
      'INVALID_FORMAT',
      `Unsupported image format for 'images.${jsonKey}' (field '${field.id}'${pageLabel(pageContext)}): bytes are not a valid PNG or JPEG. PDFKit accepts only PNG and JPEG.`,
      {
        fieldId: field.id,
        fieldType: 'image',
        jsonKey,
        pageId: pageContext.pageId,
        pageIndex: pageContext.pageIndex,
      },
    )
  }
}

function coerceImageBytes(value: unknown): Buffer | null {
  if (Buffer.isBuffer(value)) return value
  if (typeof value !== 'string') return null
  let str = value
  if (str.startsWith('data:')) {
    const comma = str.indexOf(',')
    if (comma !== -1) str = str.slice(comma + 1)
  }
  try {
    return Buffer.from(str, 'base64')
  } catch {
    return null
  }
}
