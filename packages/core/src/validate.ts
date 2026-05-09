import type {
  FieldDefinition,
  InputJSON,
  LoadedTemplate,
  TableField,
  TableRow,
  ValidationError,
  ValidationResult,
} from '@template-goblin/types'
import { isValidHyperlinkUrl } from '@template-goblin/types'

/** Maximum allowed text length to prevent memory exhaustion */
const MAX_TEXT_LENGTH = 100_000

/** Maximum allowed table rows to prevent DoS */
const MAX_TABLE_ROWS = 10_000

/** Maximum allowed image size (50 MB) */
const MAX_IMAGE_SIZE = 50 * 1024 * 1024

/**
 * Shape-check for `ImageInput` (#69). Accepts the four legal forms — Buffer,
 * string, `{ type: 'buffer', value: Buffer }`, or one of the string-valued
 * `{ type, value }` discriminated objects. Anything else is rejected with
 * INVALID_DATA_TYPE.
 */
function isValidImageInputShape(value: unknown): boolean {
  if (Buffer.isBuffer(value)) return true
  if (typeof value === 'string') return true
  if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
    const v = value as { type: unknown; value: unknown }
    if (v.type === 'buffer') return Buffer.isBuffer(v.value)
    if (v.type === 'base64' || v.type === 'path' || v.type === 'url') {
      return typeof v.value === 'string'
    }
    return false
  }
  return false
}

/**
 * Best-effort size in bytes WITHOUT performing any I/O. URL and path shapes
 * return null — those only resolve in preflight, where the resolved Buffer
 * is what matters. base64 strings are estimated at 0.75× length.
 */
function eagerImageSize(value: unknown): number | null {
  if (Buffer.isBuffer(value)) return value.length
  if (typeof value === 'string') {
    if (value.startsWith('http://') || value.startsWith('https://')) return null
    return Math.floor(value.length * 0.75)
  }
  if (value && typeof value === 'object' && 'type' in value && 'value' in value) {
    const v = value as { type: unknown; value: unknown }
    if (v.type === 'buffer' && Buffer.isBuffer(v.value)) return v.value.length
    if (v.type === 'base64' && typeof v.value === 'string') {
      return Math.floor(v.value.length * 0.75)
    }
    // 'path' and 'url' need I/O to size — defer to preflight.
    return null
  }
  return null
}

function bucketKeyFor(type: FieldDefinition['type']): keyof InputJSON {
  switch (type) {
    case 'text':
      return 'texts'
    case 'image':
      return 'images'
    case 'table':
      return 'tables'
  }
}

function validateTableRows(
  field: TableField,
  jsonKey: string,
  rows: TableRow[],
  errors: ValidationError[],
): void {
  const columnKeys = new Set(field.style.columns.map((c) => c.key))
  rows.forEach((row, i) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) {
      errors.push({
        code: 'INVALID_TABLE_ROW',
        field: jsonKey,
        message: `Row ${i} of '${jsonKey}' must be an object`,
      })
      return
    }
    for (const k of Object.keys(row)) {
      if (!columnKeys.has(k)) {
        errors.push({
          code: 'INVALID_TABLE_ROW',
          field: jsonKey,
          message: `Row ${i} of '${jsonKey}' has unknown column key '${k}'`,
        })
      }
    }
  })
}

/**
 * Validate a single field's runtime data against its type expectations.
 *
 * Static fields contribute no input-data requirements — they are rendered
 * from the baked-in `source.value` and the `InputJSON` is never consulted for
 * them. Dynamic fields with `required: true` must have a non-empty value in
 * the matching `InputJSON` bucket; optional dynamic fields are skipped.
 */
function validateField(field: FieldDefinition, data: InputJSON): ValidationError[] {
  const errors: ValidationError[] = []

  if (field.source.mode === 'static') {
    return errors
  }

  const { jsonKey, required } = field.source
  const bucket = data[bucketKeyFor(field.type)] as Record<string, unknown>
  const value = bucket?.[jsonKey]

  if (required) {
    if (value === undefined || value === null || value === '') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        field: jsonKey,
        message: `Missing required field: ${jsonKey}`,
      })
      return errors
    }
  }

  if (value === undefined || value === null) {
    return errors
  }

  switch (field.type) {
    case 'text':
      if (typeof value !== 'string') {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: jsonKey,
          message: `Invalid data for field "${jsonKey}": expected string, got ${typeof value}`,
        })
      } else if (value.length > MAX_TEXT_LENGTH) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: jsonKey,
          message: `Text too long for field "${jsonKey}": ${value.length} chars exceeds ${MAX_TEXT_LENGTH} limit`,
        })
      }
      break

    case 'image':
      // GH #69: ImageInput accepts Buffer | string | { type, value } where
      // string covers base64 / data URI / file path / URL. Validate the
      // OUTER shape only; preflight resolves to a Buffer + sniffs format
      // (handing back MISSING_ASSET / INVALID_FORMAT with field context).
      if (!isValidImageInputShape(value)) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: jsonKey,
          message: `Invalid data for field "${jsonKey}": expected Buffer, string (base64 / data URI / path / URL), or { type, value } — got ${typeof value}`,
        })
        break
      }
      // Size guard runs only on the bytes we already have in hand. URL/path
      // shapes haven't fetched yet — preflight enforces the same cap on the
      // resolved Buffer (the renderer also returns silently on empty bytes).
      {
        const eager = eagerImageSize(value)
        if (eager !== null && eager > MAX_IMAGE_SIZE) {
          errors.push({
            code: 'INVALID_DATA_TYPE',
            field: jsonKey,
            message: `Image too large for field "${jsonKey}": exceeds 50MB limit`,
          })
        }
      }
      break

    case 'table':
      if (!Array.isArray(value)) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: jsonKey,
          message: `Invalid data for field "${jsonKey}": expected array, got ${typeof value}`,
        })
      } else if (value.length > MAX_TABLE_ROWS) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: jsonKey,
          message: `Too many rows for field "${jsonKey}": ${value.length} exceeds ${MAX_TABLE_ROWS} limit`,
        })
      } else {
        validateTableRows(field, jsonKey, value as TableRow[], errors)
      }
      break
  }

  return errors
}

/**
 * Validate input data against a loaded template.
 *
 * Only dynamic fields with `required: true` can raise `MISSING_REQUIRED_FIELD`.
 * Optional dynamic fields missing from the input are silently skipped. Static
 * fields are ignored — their content is baked into the template.
 */
export function validateData(template: LoadedTemplate, data: InputJSON): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [
        {
          code: 'INVALID_DATA_TYPE',
          field: '',
          message: 'Input data must be an object with texts, images, and tables properties',
        },
      ],
    }
  }

  const errors: ValidationError[] = []

  for (const field of template.manifest.fields) {
    errors.push(...validateField(field, data))
    errors.push(...validateHyperlink(field, data))
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate a dynamic hyperlink's URL pulled from `data.links[jsonKey]` (#87).
 *
 * Lives in its own top-level bucket alongside `texts` / `images` /
 * `tables` so URLs are visually distinct from rendered text content.
 * Empty / missing values are NOT errors — the renderer simply omits the
 * clickable region. A non-empty value that doesn't pass
 * `isValidHyperlinkUrl` (allowed protocols: https / http / mailto / tel)
 * is rejected as `INVALID_DATA_TYPE` with field context. Static
 * hyperlinks are validated by `validateManifest`, not here.
 */
function validateHyperlink(field: FieldDefinition, data: InputJSON): ValidationError[] {
  const link = field.hyperlink
  if (!link || link.mode !== 'dynamic') return []
  const raw = (data.links as Record<string, unknown> | undefined)?.[link.jsonKey]
  // Empty / missing → no link, no error.
  if (raw === undefined || raw === null || raw === '') return []
  if (!isValidHyperlinkUrl(raw)) {
    return [
      {
        code: 'INVALID_DATA_TYPE',
        field: link.jsonKey,
        message: `Invalid hyperlink URL for field "${field.id}" (jsonKey "${link.jsonKey}"): must be a non-empty http(s)/mailto/tel URL`,
      },
    ]
  }
  return []
}
