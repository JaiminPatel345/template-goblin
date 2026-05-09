import type { FieldDefinition } from '@template-goblin/types'

/**
 * The two example-JSON shapes the right panel offers (#90).
 *
 * - `'default'` — minimal sample with each text/image filled from the
 *   field's `source.placeholder` (when set) or a synthetic fallback
 *   (`'A'` / `'<base64-image-data>'`). Tables get one row sourced from
 *   `source.placeholder[0]` when set, otherwise one row of `'A'`s. This
 *   is the JSON the right-panel textarea always shows when no user pin
 *   is active.
 * - `'max'` — every text gets a long repeated string and every table
 *   gets `style.maxRows` rows. Used by the **Max Fill** button to seed
 *   bulk test data — the result is written into `previewJsonText` as a
 *   user-pinned edit, not displayed as a separate mode.
 */
export type JsonPreviewMode = 'default' | 'max'

/**
 * Shape of the example JSON generated for the right-panel preview.
 * Matches `InputJSON` from `@template-goblin/types`: static fields are omitted
 * (they never appear in generator input); only dynamic fields contribute keys.
 */
interface GeneratedJson {
  texts: Record<string, string>
  tables: Record<string, Record<string, string>[]>
  images: Record<string, string | null>
  /**
   * Dynamic hyperlink URLs, keyed by `field.hyperlink.jsonKey` (#87).
   * Lives in its own bucket alongside `texts` so URLs are visually
   * distinct from rendered text content in the JSON preview.
   */
  links: Record<string, string>
}

/**
 * Generate example JSON from template fields.
 *
 * @param fields - Template field definitions
 * @param mode - `'default'` (panel display) or `'max'` (Max-Fill button)
 * @param repeatCount - How many times to repeat text in max mode
 */
export function generateExampleJson(
  fields: FieldDefinition[],
  mode: JsonPreviewMode = 'default',
  repeatCount: number = 5,
): GeneratedJson {
  const result: GeneratedJson = {
    texts: {},
    tables: {},
    images: {},
    links: {},
  }

  for (const field of fields) {
    // Defence in depth: skip fields missing `source` (corrupt rehydrated state).
    if (!field.source) continue
    if (field.source.mode === 'dynamic') {
      const name = field.source.jsonKey
      const required = field.source.required
      const placeholder = field.source.placeholder
      if (name) {
        switch (field.type) {
          case 'text':
            result.texts[name] = getTextValue(mode, required, repeatCount, placeholder)
            break
          case 'image':
            result.images[name] = getImageValue(mode, required, placeholder)
            break
          case 'table':
            result.tables[name] = getTableValue(field, mode, required, repeatCount, placeholder)
            break
        }
      }
    }
    // GH #87 — dynamic hyperlinks contribute their own jsonKey to the
    // dedicated `links` bucket so URLs render as a visually distinct
    // section, not mixed in with rendered text content. Multiple fields
    // with the same hyperlink key collapse to one entry.
    if (
      field.hyperlink &&
      field.hyperlink.mode === 'dynamic' &&
      field.hyperlink.jsonKey &&
      result.links[field.hyperlink.jsonKey] === undefined
    ) {
      result.links[field.hyperlink.jsonKey] = getHyperlinkValue(mode)
    }
  }

  return result
}

/**
 * Sample value for a dynamic hyperlink jsonKey shown in the JSON preview.
 * Default mode uses a recognisable example URL so the user can see the
 * key is wired up and replace it with a real one. Max mode emits the
 * same — there's no useful "max" variant for a URL string.
 */
function getHyperlinkValue(_mode: JsonPreviewMode): string {
  return 'https://example.com'
}

function getTextValue(
  mode: JsonPreviewMode,
  required: boolean,
  repeatCount: number,
  placeholder: unknown,
): string {
  if (mode === 'max') {
    return 'It works in my machine '.repeat(repeatCount).trim()
  }
  // GH #25 / #90: when the user typed a placeholder for the dynamic field,
  // surface it as the JSON mock value so what they see in the panel matches
  // the canvas + preview. Fall back to the synthetic 'A' / '' only when no
  // placeholder exists.
  if (typeof placeholder === 'string' && placeholder.length > 0) return placeholder
  return required ? 'A' : ''
}

function getImageValue(
  mode: JsonPreviewMode,
  required: boolean,
  placeholder: unknown,
): string | null {
  if (mode === 'max') {
    return '<base64-image-data>'
  }
  // GH #25: surface the user's placeholder filename as the JSON value when set.
  if (placeholder && typeof placeholder === 'object' && 'filename' in placeholder) {
    const filename = (placeholder as { filename: unknown }).filename
    if (typeof filename === 'string' && filename.length > 0) return filename
  }
  return required ? '<base64-image-data>' : null
}

function getTableValue(
  field: FieldDefinition,
  mode: JsonPreviewMode,
  required: boolean,
  repeatCount: number,
  placeholder: unknown,
): Record<string, string>[] {
  if (field.type !== 'table') return []
  const columns = field.style.columns || []

  if (mode === 'max') {
    const rows: Record<string, string>[] = []
    const rowCount = field.style.maxRows || 10
    for (let i = 0; i < rowCount; i++) {
      const row: Record<string, string> = {}
      for (const col of columns) {
        row[col.key] = 'It works in my machine '.repeat(repeatCount).trim()
      }
      rows.push(row)
    }
    return rows
  }

  // GH #90: prefer the first row of the user's placeholder array when set —
  // matches the text/image branches and keeps the JSON in sync with what the
  // designer typed in the properties panel. Falls through to one synthetic
  // row of 'A's only when no placeholder is supplied.
  if (Array.isArray(placeholder) && placeholder.length > 0) {
    const sample = placeholder[0]
    if (sample && typeof sample === 'object') {
      const row: Record<string, string> = {}
      for (const col of columns) {
        const value = (sample as Record<string, unknown>)[col.key]
        row[col.key] = typeof value === 'string' && value.length > 0 ? value : 'A'
      }
      return [row]
    }
  }

  if (!required) return []
  const row: Record<string, string> = {}
  for (const col of columns) {
    row[col.key] = 'A'
  }
  return [row]
}

/**
 * Escape HTML entities to prevent XSS when rendering with dangerouslySetInnerHTML.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Syntax-highlight a JSON string with HTML spans.
 * Input is HTML-escaped first to prevent XSS.
 */
export function highlightJson(json: string): string {
  const safe = escapeHtml(json)
  return safe
    .replace(/(&quot;(?:\\.|[^&])*?&quot;)\s*:/g, '<span style="color:#60a5fa">$1</span>:')
    .replace(/:\s*(&quot;(?:\\.|[^&])*?&quot;)/g, ': <span style="color:#4ade80">$1</span>')
    .replace(/:\s*(\d+(?:\.\d+)?)/g, ': <span style="color:#fbbf24">$1</span>')
    .replace(/:\s*(null)/g, ': <span style="color:#6b6b80">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span style="color:#fb923c">$1</span>')
}
