import type {
  FieldDefinition,
  InputJSON,
  LoadedTemplate,
  TableField,
  TableRow,
  ValidationError,
  ValidationResult,
} from '@template-goblin/types'

/** Maximum allowed text length to prevent memory exhaustion */
const MAX_TEXT_LENGTH = 100_000

/** Maximum allowed table rows to prevent DoS */
const MAX_TABLE_ROWS = 10_000

/** Maximum allowed image size (50 MB) */
const MAX_IMAGE_SIZE = 50 * 1024 * 1024

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
      if (typeof value !== 'string' && !Buffer.isBuffer(value)) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: jsonKey,
          message: `Invalid data for field "${jsonKey}": expected Buffer or base64 string, got ${typeof value}`,
        })
      } else {
        const size = Buffer.isBuffer(value) ? value.length : value.length * 0.75
        if (size > MAX_IMAGE_SIZE) {
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
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
