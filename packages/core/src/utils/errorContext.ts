import type { FieldDefinition, LoadedTemplate } from '@template-goblin/types'

/** Page context attached to error messages thrown during PDF generation. */
export interface PageContext {
  pageId: string | null
  pageIndex: number | null
}

/**
 * Build a human-readable suffix like ` on page 2` for error messages.
 *
 * Falls back to `' on page <id>'` when only the id is available, and an empty
 * string when neither is known (single-page legacy template).
 */
export function pageLabel(ctx: PageContext): string {
  if (ctx.pageIndex !== null) return ` on page ${ctx.pageIndex}`
  if (ctx.pageId !== null) return ` on page '${ctx.pageId}'`
  return ''
}

/** Resolve a `pageId` to the corresponding page index from the manifest. */
export function pageContextFor(template: LoadedTemplate, pageId: string | null): PageContext {
  if (!pageId) return { pageId: null, pageIndex: null }
  const pages = template.manifest.pages ?? []
  const page = pages.find((p) => p.id === pageId)
  return { pageId, pageIndex: page?.index ?? null }
}

/**
 * Build the structured `details` object and message suffix for a per-field
 * error. Used by both pre-flight checks and PDFKit-error rewrapping.
 */
export function fieldErrorDetails(
  field: FieldDefinition,
  ctx: PageContext,
): { suffix: string; details: Record<string, unknown> } {
  const details: Record<string, unknown> = {
    fieldId: field.id,
    fieldType: field.type,
    pageId: ctx.pageId,
    pageIndex: ctx.pageIndex,
  }
  let suffix = ''
  if (field.source.mode === 'dynamic') {
    const bucket = field.type === 'text' ? 'texts' : field.type === 'image' ? 'images' : 'tables'
    details.jsonKey = field.source.jsonKey
    suffix = ` (input key '${bucket}.${field.source.jsonKey}')`
  } else if (field.type === 'image') {
    const filename = (field.source.value as { filename?: string } | null)?.filename
    if (filename) {
      details.assetFilename = filename
      suffix = ` (asset '${filename}')`
    }
  }
  return { suffix, details }
}
