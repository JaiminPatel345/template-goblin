import type {
  LoadedTemplate,
  InputJSON,
  ValidationResult,
  ValidationError,
  FieldDefinition,
} from '@template-goblin/types'
import { resolveKey } from './utils/resolveKey.js'

/**
 * Validate a single field's data against its type expectations.
 *
 * @param field - Field definition from manifest
 * @param data - Input JSON
 * @returns Array of validation errors for this field
 */
function validateField(field: FieldDefinition, data: InputJSON): ValidationError[] {
  const errors: ValidationError[] = []
  const value = resolveKey(data as unknown as Record<string, unknown>, field.jsonKey)

  // REQ: Check required fields are present
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

  // REQ: Type-check based on field type
  switch (field.type) {
    case 'text':
      if (typeof value !== 'string') {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: field.jsonKey,
          message: `Invalid data for field "${field.jsonKey}": expected string, got ${typeof value}`,
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
      }
      break

    case 'loop':
      if (!Array.isArray(value)) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: field.jsonKey,
          message: `Invalid data for field "${field.jsonKey}": expected array, got ${typeof value}`,
        })
      }
      break
  }

  return errors
}

/**
 * Validate input data against a loaded template.
 *
 * Checks that all required fields are present and have the correct types.
 *
 * @param template - LoadedTemplate returned by loadTemplate()
 * @param data - Input JSON to validate
 * @returns ValidationResult with valid flag and array of errors
 */
export function validateData(template: LoadedTemplate, data: InputJSON): ValidationResult {
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
