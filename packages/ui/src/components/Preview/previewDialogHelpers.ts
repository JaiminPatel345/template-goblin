/**
 * Pure helpers for `PreviewDialog` (#45) — kept separate so the component
 * file stays under the 300-line cap and so the parsing logic is unit-
 * testable without React.
 */
import type { FieldSource, ImageSourceValue } from '@template-goblin/types'

/** Bytes accepted on a single image upload (10 MB matches the issue spec). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** MIME types accepted by the image upload picker. */
export const ALLOWED_UPLOAD_MIME = new Set(['image/png', 'image/jpeg', 'image/webp'])

interface ParseOk {
  ok: true
  data: { texts?: unknown; tables?: unknown; images?: unknown }
}
interface ParseErr {
  ok: false
  error: string
}
export type ParseResult = ParseOk | ParseErr

/**
 * Validate the JSON in the editor against the structural shape of
 * `InputJSON`. Lenient on extras and missing keys — the renderer treats
 * absent buckets as empty objects, so flagging "missing texts" would only
 * confuse a user who has no text fields. Only the *shape* of present keys
 * is enforced.
 */
export function parseInputJson(text: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Invalid JSON' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Top-level value must be an object.' }
  }
  const o = parsed as Record<string, unknown>
  for (const key of ['texts', 'tables', 'images'] as const) {
    if (key in o) {
      const v = o[key]
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        return { ok: false, error: `"${key}" must be an object.` }
      }
    }
  }
  return { ok: true, data: o as ParseOk['data'] }
}

/** Read a file as a `data:` URL — small wrapper around `FileReader`. */
export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Pull the placeholder filename out of a dynamic image field's source.
 * Returns `null` for static/free sources or sources without a placeholder.
 */
export function getPlaceholderFilename(source: FieldSource<ImageSourceValue>): string | null {
  if (source.mode !== 'dynamic') return null
  const ph = source.placeholder
  if (ph && typeof ph === 'object' && 'filename' in ph) {
    const name = (ph as { filename: unknown }).filename
    if (typeof name === 'string' && name.length > 0) return name
  }
  return null
}

/** Validate an upload before reading it. Returns `null` if accepted. */
export function validateUpload(file: File): string | null {
  if (!ALLOWED_UPLOAD_MIME.has(file.type)) {
    return `Unsupported file type "${file.type || 'unknown'}". Use PNG, JPEG, or WEBP.`
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)} MB (max 10 MB).`
  }
  return null
}
