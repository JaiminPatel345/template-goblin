import type PDFDocument from 'pdfkit'
import type { FieldDefinition, InputJSON, LoadedTemplate, TableRow } from '@template-goblin/types'
import { TemplateGoblinError, isValidHyperlinkUrl } from '@template-goblin/types'
import { resolveValue } from '../utils/resolveValue.js'
import { fieldErrorDetails, pageLabel, type PageContext } from '../utils/errorContext.js'
import { parseImageColorMarker } from '../utils/imageColorMarker.js'
import { renderText } from './text.js'
import { renderImage } from './image.js'
import { renderLoop } from './loop.js'

/**
 * Resolve `field.hyperlink` to a concrete URL string, or `null` if the
 * field has no link / the dynamic value is empty / missing (#87).
 *
 * Static links use the literal `url`. Dynamic links read
 * `data.links[jsonKey]` (separate top-level bucket from `texts` so URLs
 * are visually distinct in the JSON preview) and short-circuit on
 * empty — no error, that's the contract: missing dynamic URL = no
 * clickable region. Invalid non-empty dynamic strings have already
 * been rejected by `validateData`; we double-check here defensively so
 * a renderer error can never produce a `doc.link` to garbage.
 */
function resolveHyperlinkUrl(field: FieldDefinition, data: InputJSON): string | null {
  const link = field.hyperlink
  if (!link) return null
  if (link.mode === 'static') {
    return isValidHyperlinkUrl(link.url) ? link.url : null
  }
  const raw = (data.links as Record<string, unknown> | undefined)?.[link.jsonKey]
  if (typeof raw !== 'string' || raw.length === 0) return null
  return isValidHyperlinkUrl(raw) ? raw : null
}

/**
 * Render a single field based on its type.
 *
 * Wraps each render call in a try/catch so any error from PDFKit (e.g.
 * "Unknown image format") is rethrown as `PDF_GENERATION_FAILED` carrying
 * the field id, type, page index, and asset filename.
 *
 * `resolvedImages` carries pre-resolved `Buffer`s for every dynamic image
 * input — see `preflightImages` (#69). Lookup is by `field.source.jsonKey`
 * for dynamic image fields. Static image bytes still come from
 * `template.staticImages`.
 */
export function renderField(
  doc: InstanceType<typeof PDFDocument>,
  field: FieldDefinition,
  data: InputJSON,
  fontMap: Map<string, string>,
  template: LoadedTemplate,
  pageCtx: PageContext,
  resolvedImages: Map<string, Buffer>,
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
        // GH #81 — solid colour can come via either:
        //   (a) static `source.value = { color }` in the manifest, or
        //   (b) dynamic `data.images[jsonKey]` matching the marker
        //       `<STATICIMAGE_COLOR_#hex>`.
        // In both cases we paint a filled rect — no image bytes needed.
        if (field.source.mode === 'dynamic') {
          const raw = (data.images as Record<string, unknown> | undefined)?.[field.source.jsonKey]
          const markerHex = parseImageColorMarker(raw)
          if (markerHex !== null) {
            renderImage(doc, field, { color: markerHex })
            break
          }
        } else if (value && typeof value === 'object' && 'color' in value) {
          renderImage(doc, field, { color: (value as { color: string }).color })
          break
        }

        // Standard byte-backed paths. Dynamic: bytes were resolved by
        // preflightImages (#69) and live in `resolvedImages`. Static:
        // value is `{ filename }` — look up bytes in `staticImages`.
        let imageData: Buffer | undefined
        if (field.source.mode === 'dynamic') {
          imageData = resolvedImages.get(field.source.jsonKey)
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

    // GH #87 — clickable hyperlink overlay. Drawn AFTER content so the
    // link rect sits in front of the rendered text/image/table, and so
    // an exception during render skips the link too (we never advertise
    // a clickable region for content that didn't actually paint). The
    // rect matches the field's bounding box exactly; for tables, that
    // means the whole table is clickable as a single unit (per #87
    // resolution — no per-row variant in v1).
    const url = resolveHyperlinkUrl(field, data)
    if (url !== null) {
      doc.link(field.x, field.y, field.width, field.height, url)
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
