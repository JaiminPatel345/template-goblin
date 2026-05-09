/**
 * formatJson — pure helper behind the right-panel JSON Preview's "Format"
 * button (#85). Lives outside the component so the parse/stringify logic
 * is unit-testable without rendering React.
 */

export type FormatResult = { ok: true; text: string } | { ok: false; error: string }

export const FORMAT_ERROR_MESSAGE = 'Invalid JSON — fix the highlighted issue'

/**
 * Parse `input` as JSON and re-emit it with 2-space indentation. Mirrors
 * `generateExampleJson`'s formatting so a freshly-formatted pin reads the
 * same as the auto-generated default. On failure returns a stable error
 * string; the textarea content is left for the caller to preserve.
 */
export function formatJsonString(input: string): FormatResult {
  try {
    const parsed = JSON.parse(input) as unknown
    return { ok: true, text: JSON.stringify(parsed, null, 2) }
  } catch {
    return { ok: false, error: FORMAT_ERROR_MESSAGE }
  }
}
