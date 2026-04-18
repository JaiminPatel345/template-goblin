/** Error codes used across the TemplateGoblin library */
export type ErrorCode =
  | 'FILE_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'MISSING_MANIFEST'
  | 'INVALID_MANIFEST'
  | 'MISSING_ASSET'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_DATA_TYPE'
  | 'MAX_PAGES_EXCEEDED'
  | 'FONT_LOAD_FAILED'
  | 'PDF_GENERATION_FAILED'
  | 'SAVE_FAILED'
  | 'INVALID_SOURCE_MODE'
  | 'INVALID_STATIC_VALUE'
  | 'MISSING_STATIC_IMAGE_FILE'
  | 'MISSING_PLACEHOLDER_IMAGE_FILE'
  | 'INVALID_DYNAMIC_SOURCE'
  | 'DUPLICATE_JSON_KEY'
  | 'INVALID_TABLE_ROW'

/** Base error class for all TemplateGoblin errors */
export class TemplateGoblinError extends Error {
  code: ErrorCode
  details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'TemplateGoblinError'
    this.code = code
    this.details = details
  }
}

/** Validation error codes */
export type ValidationErrorCode =
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_DATA_TYPE'
  | 'INVALID_TABLE_ROW'

/** A single validation error with field context */
export interface ValidationError {
  code: ValidationErrorCode
  field: string
  message: string
}

/** Result of validateData() — structured validation errors */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
