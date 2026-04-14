import type {
  LoadedTemplate,
  InputJSON,
  ValidationResult,
  ValidationError,
  FieldDefinition,
} from '@template-goblin/types'
import { resolveKey } from './utils/resolveKey.js'

/** Maximum allowed text length to prevent memory exhaustion */
const MAX_TEXT_LENGTH = 100_000

/** Maximum allowed loop rows to prevent DoS */
const MAX_LOOP_ROWS = 10_000

/** Maximum allowed image size (50 MB) */
const MAX_IMAGE_SIZE = 50 * 1024 * 1024

/**
 * Validate a single field's data against its type expectations.
 * Includes input sanitization and size limits.
 */
function validateField(field: FieldDefinition, data: InputJSON): ValidationError[] {
  const errors: ValidationError[] = []
  const value = resolveKey(data as unknown as Record<string, unknown>, field.jsonKey)

  // Check required fields
  if (field.required) {
    if (value === undefined || value === null || value === '') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        field: field.jsonKey,
        message: `Missing required field: ${field.jsonKey}`,
      })
      return errors
    }
  }

  // Skip type checks if value is not provided (optional field)
  if (value === undefined || value === null) {
    return errors
  }

  // Type-check and sanitize based on field type
  switch (field.type) {
    case 'text':
      if (typeof value !== 'string') {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: field.jsonKey,
          message: `Invalid data for field "${field.jsonKey}": expected string, got ${typeof value}`,
        })
      } else if (value.length > MAX_TEXT_LENGTH) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: field.jsonKey,
          message: `Text too long for field "${field.jsonKey}": ${value.length} chars exceeds ${MAX_TEXT_LENGTH} limit`,
        })
      }
      break

    case 'image':
      if (typeof value !== 'string' && !Buffer.isBuffer(value)) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: field.jsonKey,
          message: `Invalid data for field "${field.jsonKey}": expected Buffer or base64 string, got ${typeof value}`,
        })
      } else {
        const size = Buffer.isBuffer(value) ? value.length : value.length * 0.75 // approximate base64 decoded size
        if (size > MAX_IMAGE_SIZE) {
          errors.push({
            code: 'INVALID_DATA_TYPE',
            field: field.jsonKey,
            message: `Image too large for field "${field.jsonKey}": exceeds 50MB limit`,
          })
        }
      }
      break

    case 'loop':
      if (!Array.isArray(value)) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: field.jsonKey,
          message: `Invalid data for field "${field.jsonKey}": expected array, got ${typeof value}`,
        })
      } else if (value.length > MAX_LOOP_ROWS) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: field.jsonKey,
          message: `Too many rows for field "${field.jsonKey}": ${value.length} exceeds ${MAX_LOOP_ROWS} limit`,
        })
      }
      break
  }

  return errors
}

/**
 * Validate input data against a loaded template.
 *
 * Checks that all required fields are present, have correct types,
 * and are within size limits.
 *
 * @param template - LoadedTemplate returned by loadTemplate()
 * @param data - Input JSON to validate
 * @returns ValidationResult with valid flag and array of errors
 */
export function validateData(template: LoadedTemplate, data: InputJSON): ValidationResult {
  // Sanitize: ensure data has the expected top-level structure
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: [
        {
          code: 'INVALID_DATA_TYPE',
          field: '',
          message: 'Input data must be an object with texts, loops, and images properties',
        },
      ],
    }
  }

  const errors: ValidationError[] = []

  for (const field of template.manifest.fields) {
    const fieldErrors = validateField(field, data)
    errors.push(...fieldErrors)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
