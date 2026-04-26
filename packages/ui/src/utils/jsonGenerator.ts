import type { FieldDefinition } from '@template-goblin/types'
import type { JsonPreviewMode } from '../store/uiStore.js'

/**
 * Shape of the example JSON generated for the right-panel preview.
 * Matches `InputJSON` from `@template-goblin/types`: static fields are omitted
 * (they never appear in generator input); only dynamic fields contribute keys.
 */
interface GeneratedJson {
  texts: Record<string, string>
  tables: Record<string, Record<string, string>[]>
  images: Record<string, string | null>
}

/**
 * Generate example JSON from template fields for the JSON preview panel.
 *
 * @param fields - Template field definitions
 * @param mode - Preview mode: 'default' or 'max'
 * @param repeatCount - How many times to repeat text in max mode
 * @returns Generated example JSON object
 */
export function generateExampleJson(
  fields: FieldDefinition[],
  mode: JsonPreviewMode,
  repeatCount: number = 5,
): GeneratedJson {
  const result: GeneratedJson = {
    texts: {},
    tables: {},
    images: {},
  }

  for (const field of fields) {
    // Defence in depth: skip fields missing `source` (corrupt rehydrated state).
    if (!field.source) continue
    // Static fields don't appear in InputJSON — skip them
    if (field.source.mode !== 'dynamic') continue
    const name = field.source.jsonKey
    const required = field.source.required
    const placeholder = field.source.placeholder
    if (!name) continue

    switch (field.type) {
      case 'text':
        result.texts[name] = getTextValue(mode, required, repeatCount, placeholder)
        break

      case 'image':
        result.images[name] = getImageValue(mode, required, placeholder)
        break

      case 'table':
        result.tables[name] = getTableValue(field, mode, required, repeatCount)
        break
    }
  }

  return result
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
  // GH #25: when the user typed a placeholder for the dynamic field, surface
  // it as the JSON mock value so what they see in the panel matches the
  // preview. Fall back to the legacy synthetic 'A' / '' when no placeholder.
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

  // default (and any unknown mode fallback)
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
