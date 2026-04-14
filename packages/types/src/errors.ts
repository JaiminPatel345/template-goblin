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

/** Base error class for all TemplateGoblin errors */
export class TemplateGoblinError extends Error {
  code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.name = 'TemplateGoblinError'
    this.code = code
  }
}

/** A single validation error with field context */
export interface ValidationError {
  code: string
  field: string
  message: string
}

/** Result of validateData() — structured validation errors */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}
