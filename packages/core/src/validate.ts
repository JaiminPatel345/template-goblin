import type { LoadedTemplate, InputJSON, ValidationResult } from '@template-goblin/types'

/**
 * Validate input data against a loaded template.
 *
 * Checks that all required fields are present and have the correct types.
 *
 * @param template - LoadedTemplate returned by loadTemplate()
 * @param data - Input JSON to validate
 * @returns ValidationResult with valid flag and array of errors
 */
export function validateData(_template: LoadedTemplate, _data: InputJSON): ValidationResult {
  // TODO: Implement in spec 008
  throw new Error('Not implemented')
}
