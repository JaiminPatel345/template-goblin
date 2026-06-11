import type { ErrorCode } from '@template-goblin/types'

/**
 * Translate any thrown error into a message a non-technical designer can
 * act on. The raw error (message, stack, details) always goes to the
 * browser console via `surfaceError` — the friendly text is what the UI
 * shows.
 *
 * Mapping rules:
 *  - `TemplateGoblinError` codes get a hand-written explanation that says
 *    WHAT happened and WHAT TO DO, using `details` (fieldId, filename, …)
 *    for context.
 *  - Anything else collapses to a generic "internal error" line — the
 *    console has the specifics.
 */

/** Duck-typed view of `TemplateGoblinError` — the class identity doesn't
 *  survive the core's separate bundle, so match on shape, not instanceof. */
interface GoblinErrorLike {
  name?: unknown
  code?: unknown
  message?: unknown
  details?: Record<string, unknown>
}

const GENERIC_MESSAGE =
  'Something unexpected went wrong. Please try again — the technical details were printed to the browser console (F12).'

/**
 * Log the full error to the console and return the friendly message to
 * show in the UI. `context` names the action that failed ("preview
 * render", "save template") so console logs stay greppable.
 *
 * `preferRaw` — for flows like open/save where OUR OWN thrown messages
 * are already written for humans ("File too large…", "Not a valid
 * .tgbl…"): coded core errors still get mapped, but an unrecognized
 * `Error` falls back to its raw message instead of the generic line.
 */
export function surfaceError(context: string, err: unknown, preferRaw = false): string {
  console.error(`[template-goblin] ${context} failed:`, err)
  const coded = describeCodedError(err)
  if (coded) return coded
  if (preferRaw && err instanceof Error && err.message) return err.message
  return GENERIC_MESSAGE
}

/** Pure error → human text mapping (no logging). */
export function describeError(err: unknown): string {
  return describeCodedError(err) ?? GENERIC_MESSAGE
}

/** Hand-written explanation for recognized error codes, else `null`. */
function describeCodedError(err: unknown): string | null {
  const e = err as GoblinErrorLike
  if (e && typeof e === 'object' && typeof e.code === 'string') {
    return describeCode(e.code as ErrorCode, e.details ?? {})
  }
  return null
}

function describeCode(code: ErrorCode, details: Record<string, unknown>): string | null {
  const field = str(details.fieldId)
  const fieldRef = field ? ` (field "${field}")` : ''
  const key = str(details.jsonKey) ?? str(details.field)

  switch (code) {
    case 'MISSING_ASSET':
    case 'MISSING_STATIC_IMAGE_FILE':
      return `An image is missing${fieldRef}. Open that image field's settings and upload the picture again, then retry.`
    case 'MISSING_PLACEHOLDER_IMAGE_FILE':
      return `A preview image is missing${fieldRef}. Open that field's settings and upload a placeholder image again.`
    case 'MISSING_REQUIRED_FIELD':
      return `Required data is missing${key ? ` for "${key}"` : ''}. Fill in a value in the Input JSON, or open the field's settings and untick "Required".`
    case 'INVALID_DATA_TYPE':
      return `Some input data has the wrong shape${key ? ` for "${key}"` : ''}. Check that texts are quoted strings and tables are lists of rows.`
    case 'INVALID_TABLE_ROW':
      return `A table row${key ? ` for "${key}"` : ''} doesn't match the table's columns. Check the rows in the Input JSON.`
    case 'INVALID_FORMAT':
      return `An image${fieldRef} isn't a PNG or JPEG. PDFs support only PNG and JPEG — convert the picture and upload it again.`
    case 'FONT_LOAD_FAILED':
      return 'A custom font could not be loaded. Open the Font Manager and re-upload the font file (.ttf).'
    case 'MAX_PAGES_EXCEEDED':
      return 'This document needs more pages than the template allows. Reduce the data (e.g. fewer table rows) or raise the page limit.'
    case 'DUPLICATE_JSON_KEY':
      return `Two fields share the same JSON key${key ? ` ("${key}")` : ''}. Give each field its own unique key in the field settings.`
    case 'FILE_NOT_FOUND':
    case 'MISSING_MANIFEST':
    case 'INVALID_MANIFEST':
      return "This file doesn't look like a valid template (.tgbl). It may be damaged or from an incompatible version — try re-exporting it."
    case 'SAVE_FAILED':
      return 'The template could not be saved. Try again; if it keeps failing, check the browser console for details.'
    case 'PDF_GENERATION_FAILED':
      return 'The PDF could not be generated. Try again — if it keeps failing, the console (F12) has the technical details.'
    case 'INVALID_SOURCE_MODE':
    case 'INVALID_STATIC_VALUE':
    case 'INVALID_DYNAMIC_SOURCE':
      return `A field${fieldRef} has incomplete settings. Open its settings panel and fill in the missing source details.`
    case 'FIELD_OVERLAPS_BAND':
      return `An element${fieldRef} overlaps the header or footer area. Move it fully into the page body or the band.`
    case 'PAGE_NUMBER_PLACEMENT_INVALID':
      return 'The page-number placement is invalid. Open Page Layout → Page Number and pick a valid position.'
    default:
      return null
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}
