/**
 * Pure helpers for `PreviewDialog` (#45) — kept separate so the component
 * file stays under the 300-line cap and so the parsing logic is unit-
 * testable without React.
 */
import type {
  FieldDefinition,
  ImageField,
  FieldSource,
  ImageSourceValue,
  InputJSON,
  ImageInput,
  ConditionInput,
} from '@template-goblin/types'
import { isPlaceholderImageSentinel, IMAGE_REQUIRED_MARKER } from '../../utils/jsonProjection.js'
import type { UploadedImage } from './PreviewImageUploadSection.js'

/** Bytes accepted on a single image upload (10 MB matches the issue spec). */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

/** MIME types accepted by the image upload picker. */
// PNG + JPEG only — the PDF engine's format sniff rejects everything
// else, so inviting WEBP here just deferred the failure to Render.
export const ALLOWED_UPLOAD_MIME = new Set(['image/png', 'image/jpeg'])

interface ParseOk {
  ok: true
  data: {
    texts?: unknown
    tables?: unknown
    images?: unknown
    links?: unknown
    condition?: unknown
    conditions?: Record<string, string>
  }
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
  // `links` is the GH #87 hyperlink-URL bucket — same shape contract as
  // texts/tables/images: optional, must be an object when present.
  for (const key of ['texts', 'tables', 'images', 'links'] as const) {
    if (key in o) {
      const v = o[key]
      if (typeof v !== 'object' || v === null || Array.isArray(v)) {
        return { ok: false, error: `"${key}" must be an object.` }
      }
    }
  }
  if ('condition' in o && typeof o.condition !== 'string') {
    return { ok: false, error: '"condition" must be a string.' }
  }
  if (
    'conditions' in o &&
    (typeof o.conditions !== 'object' || o.conditions === null || Array.isArray(o.conditions))
  ) {
    return { ok: false, error: '"conditions" must be an object.' }
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

/**
 * Find any required dynamic fields missing from parsed JSON or uploads.
 */
export function findMissingRequiredFields(
  allFields: FieldDefinition[],
  parsed: ParseOk['data'],
  imageOverrides: Map<string, UploadedImage>,
): string[] {
  const out: string[] = []
  for (const f of allFields) {
    if (!f.source || f.source.mode !== 'dynamic') continue
    if (!f.source.required) continue
    const bucket =
      f.type === 'text'
        ? (parsed.texts as Record<string, unknown> | undefined)
        : f.type === 'image'
          ? (parsed.images as Record<string, unknown> | undefined)
          : (parsed.tables as Record<string, unknown> | undefined)
    const v = bucket?.[f.source.jsonKey]
    const hasJson = v !== undefined && v !== null && v !== '' && v !== IMAGE_REQUIRED_MARKER
    const hasUpload = f.type === 'image' && imageOverrides.has(f.source.jsonKey)
    if (!hasJson && !hasUpload) out.push(f.source.jsonKey)
  }
  return out
}

/**
 * Assembles the InputJSON passed to generatePDF for previewing.
 */
export function buildPreviewInputData(
  parsed: ParseOk['data'],
  dynamicImageFields: ImageField[],
  baseImageDataUrls: Map<string, string>,
  imageOverrides: Map<string, UploadedImage>,
): InputJSON {
  const data: InputJSON = {
    texts: (parsed.texts ?? {}) as Record<string, string>,
    tables: (parsed.tables ?? {}) as Record<string, Record<string, string>[]>,
    images: {},
    links: (parsed.links ?? {}) as Record<string, string>,
    ...(parsed.condition ? { condition: parsed.condition as ConditionInput } : {}),
    ...(parsed.conditions ? { conditions: parsed.conditions } : {}),
  }

  for (const field of dynamicImageFields) {
    if (field.source.mode !== 'dynamic') continue
    const ph = field.source.placeholder
    if (ph && typeof ph === 'object' && 'filename' in ph) {
      const fullDataUrl = baseImageDataUrls.get(ph.filename as string)
      if (fullDataUrl) data.images[field.source.jsonKey] = fullDataUrl
    }
  }

  const parsedImages = (parsed.images ?? {}) as Record<string, unknown>
  for (const [k, v] of Object.entries(parsedImages)) {
    if (isPlaceholderImageSentinel(v) || v === IMAGE_REQUIRED_MARKER) continue
    data.images[k] = v as ImageInput
  }

  for (const [jsonKey, upload] of imageOverrides) {
    data.images[jsonKey] = upload.dataUrl
  }

  return data
}

export interface ConditionalFieldOption {
  fieldId: string
  keyName: string
  conditions: string[]
}

/**
 * Extracts fields with conditional styling enabled.
 */
export function extractConditionalFields(allFields: FieldDefinition[]): ConditionalFieldOption[] {
  const out: ConditionalFieldOption[] = []
  for (const f of allFields) {
    if (f.conditionalStyles?.enabled && f.conditionalStyles.conditions.length > 0) {
      const keyName =
        f.source?.mode === 'dynamic' && 'jsonKey' in f.source && f.source.jsonKey
          ? f.source.jsonKey
          : f.id
      out.push({
        fieldId: f.id,
        keyName,
        conditions: f.conditionalStyles.conditions.map((c) => c.name),
      })
    }
  }
  return out
}

/**
 * Maps condition input into a keyName -> conditionName dictionary.
 */
export function buildConditionMap(
  cond: unknown,
  conditionalFields: ConditionalFieldOption[],
): Record<string, string> {
  const map: Record<string, string> = {}
  if (Array.isArray(cond)) {
    for (const item of cond) {
      if (item && typeof item === 'object') {
        for (const [k, v] of Object.entries(item)) {
          if (typeof v === 'string') map[k] = v
        }
      }
    }
  } else if (cond && typeof cond === 'object') {
    for (const [k, v] of Object.entries(cond as Record<string, unknown>)) {
      if (typeof v === 'string') map[k] = v
    }
  } else if (typeof cond === 'string') {
    for (const cf of conditionalFields) {
      map[cf.keyName] = cond
    }
  }
  return map
}

/**
 * Updates a keyName's condition in the current condition map and returns the updated array.
 */
export function updateConditionArray(
  currentMap: Record<string, string>,
  keyName: string,
  newCond: string,
): Array<Record<string, string>> | undefined {
  const nextMap: Record<string, string> = {}
  for (const [k, v] of Object.entries(currentMap)) {
    if (k !== keyName) {
      nextMap[k] = v
    }
  }
  if (newCond) {
    nextMap[keyName] = newCond
  }
  const arr = Object.entries(nextMap).map(([k, v]) => ({ [k]: v }))
  return arr.length > 0 ? arr : undefined
}
