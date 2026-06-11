import type { FieldDefinition, ImageInput, InputJSON, LoadedTemplate } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { sniffImageFormat } from './utils/imageFormat.js'
import { pageContextFor, pageLabel, type PageContext } from './utils/errorContext.js'
import { resolveImageInputs, type ResolveContext, type ResolveOptions } from './utils/imageInput.js'
import { isImageColorMarker } from './utils/imageColorMarker.js'
import { allManifestFields } from './utils/manifestFields.js'

/** Per-call options for {@link preflightImages}. */
export interface PreflightOptions {
  /** Abort each HTTP fetch after this many ms (default 10 000). */
  imageFetchTimeoutMs?: number
  /** Concurrency cap for resolving a batch of inputs (default 6). */
  imageResolveConcurrency?: number
}

/**
 * Result returned to `generatePDF` so the renderer can read pre-resolved
 * image bytes without doing any I/O of its own.
 */
export interface PreflightResult {
  /** `jsonKey` → resolved image `Buffer`. Only contains keys present in the
   * input AND referenced by a dynamic image field. */
  resolvedImages: Map<string, Buffer>
}

/**
 * Validate every image referenced by the template (static + dynamic) before
 * any PDFKit calls run, AND resolve every dynamic image input to a `Buffer`.
 *
 * Dynamic inputs may now arrive as `Buffer`, base64 string, `data:` URI,
 * file path, HTTP/HTTPS URL, or the explicit `{ type, value }` form (#69).
 * All branches are normalised to `Buffer` here so the renderer is pure.
 *
 * Throws `TemplateGoblinError` on the first problem so the caller acts on
 * a stable, structured error object (`details` carries `fieldId`, `pageId`,
 * `pageIndex`, `assetFilename`, `jsonKey`, and where applicable `assetPath`,
 * `assetUrl`, `httpStatus`, `timedOut`).
 */
export async function preflightImages(
  template: LoadedTemplate,
  data: InputJSON,
  opts: PreflightOptions = {},
): Promise<PreflightResult> {
  const { manifest } = template
  const inputImages = (data.images ?? {}) as Record<string, unknown>

  // Pass 1 — static images sniff in place; dynamic image inputs collected for
  // batched async resolution. Static images carry no I/O so they stay fully
  // synchronous.
  const dynamicWork: Array<{ input: ImageInput; ctx: ResolveContext; field: FieldDefinition }> = []

  // #61 — band image fields resolve from the same pools; skipping them
  // meant required band images silently rendered blank.
  for (const field of allManifestFields(manifest)) {
    if (field.type !== 'image') continue
    const pageContext = pageContextFor(template, field.pageId)

    if (field.source.mode === 'static') {
      checkStaticImage(template, field, pageContext)
      continue
    }

    if (field.source.mode !== 'dynamic') continue
    const { jsonKey, required } = field.source
    const raw = inputImages[jsonKey]

    if (raw === undefined || raw === null || raw === '') {
      // Optional + missing → renderer skips silently.
      // Required + missing → validateData has already raised
      // MISSING_REQUIRED_FIELD; nothing to resolve here either way.
      void required
      continue
    }

    // GH #81 — solid-colour markers (`<STATICIMAGE_COLOR_#hex>`) are not
    // image bytes; the renderer paints a filled rect from the marker
    // string. Skip the resolver + format sniff for them.
    if (isImageColorMarker(raw)) continue

    if (!isImageInput(raw)) {
      // validateData already raised INVALID_DATA_TYPE; skip resolution.
      continue
    }

    dynamicWork.push({
      input: raw,
      field,
      ctx: {
        fieldId: field.id,
        jsonKey,
        pageId: pageContext.pageId,
        pageIndex: pageContext.pageIndex,
      },
    })
  }

  // Pass 2 — resolve dynamic inputs in parallel (bounded). Errors from the
  // resolver are TemplateGoblinError with full field context; let them
  // propagate.
  const resolveOpts: ResolveOptions & { concurrency?: number } = {
    timeoutMs: opts.imageFetchTimeoutMs,
    concurrency: opts.imageResolveConcurrency,
  }
  const resolvedImages = await resolveImageInputs(
    dynamicWork.map((w) => ({ input: w.input, ctx: w.ctx })),
    resolveOpts,
  )

  // Pass 3 — sniff every resolved Buffer. The original entry-point complaint
  // (PDFKit's bare "Unknown image format") still has to be surfaced with
  // field context regardless of where the bytes came from.
  for (const work of dynamicWork) {
    const bytes = resolvedImages.get(work.ctx.jsonKey)
    if (!bytes) continue

    const pageContext: PageContext = {
      pageId: work.ctx.pageId,
      pageIndex: work.ctx.pageIndex,
    }

    if (bytes.length === 0) {
      throw new TemplateGoblinError(
        'INVALID_DATA_TYPE',
        `Empty image data for 'images.${work.ctx.jsonKey}' (field '${work.field.id}'${pageLabel(pageContext)}): resolved input decoded to zero bytes.`,
        {
          fieldId: work.field.id,
          fieldType: 'image',
          jsonKey: work.ctx.jsonKey,
          pageId: pageContext.pageId,
          pageIndex: pageContext.pageIndex,
        },
      )
    }

    if (sniffImageFormat(bytes) === null) {
      throw new TemplateGoblinError(
        'INVALID_FORMAT',
        `Unsupported image format for 'images.${work.ctx.jsonKey}' (field '${work.field.id}'${pageLabel(pageContext)}): bytes are not a valid PNG or JPEG. PDFKit accepts only PNG and JPEG.`,
        {
          fieldId: work.field.id,
          fieldType: 'image',
          jsonKey: work.ctx.jsonKey,
          pageId: pageContext.pageId,
          pageIndex: pageContext.pageIndex,
        },
      )
    }
  }

  return { resolvedImages }
}

/**
 * Type guard for ImageInput. Anything that's a Buffer, string, or
 * `{ type, value }` object qualifies; everything else falls to validateData
 * which raises INVALID_DATA_TYPE.
 */
function isImageInput(v: unknown): v is ImageInput {
  if (Buffer.isBuffer(v)) return true
  if (typeof v === 'string') return true
  if (v && typeof v === 'object' && 'type' in v && 'value' in v) {
    const type = (v as { type: unknown }).type
    return type === 'buffer' || type === 'base64' || type === 'path' || type === 'url'
  }
  return false
}

function checkStaticImage(
  template: LoadedTemplate,
  field: FieldDefinition,
  pageContext: PageContext,
): void {
  if (field.source.mode !== 'static') return
  const value = field.source.value as { filename?: string; color?: string } | null
  // GH #81 — solid-colour static fields carry no asset; the renderer
  // paints a filled rect. Skip the bytes / format checks entirely.
  if (value && typeof value.color === 'string') return
  const filename = value?.filename
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
