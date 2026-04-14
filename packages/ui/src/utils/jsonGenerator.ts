import type { FieldDefinition, LoopFieldStyle } from '@template-goblin/types'
import type { JsonPreviewMode } from '../store/uiStore.js'

interface GeneratedJson {
  texts: Record<string, string>
  loops: Record<string, Record<string, string>[]>
  images: Record<string, string | null>
}

/**
 * Generate example JSON from template fields for the JSON preview panel.
 *
 * @param fields - Template field definitions
 * @param mode - Preview mode: 'default', 'max', or 'min'
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
    loops: {},
    images: {},
  }

  for (const field of fields) {
    const keyParts = field.jsonKey.split('.')
    const category = keyParts[0]
    const name = keyParts.slice(1).join('.')

    if (!name) continue

    switch (field.type) {
      case 'text':
        if (category === 'texts') {
          result.texts[name] = getTextValue(field, mode, repeatCount)
        }
        break

      case 'image':
        if (category === 'images') {
          result.images[name] = getImageValue(field, mode)
        }
        break

      case 'loop':
        if (category === 'loops') {
          result.loops[name] = getLoopValue(field, mode, repeatCount)
        }
        break
    }
  }

  return result
}

function getTextValue(field: FieldDefinition, mode: JsonPreviewMode, repeatCount: number): string {
  switch (mode) {
    case 'default':
      return ''
    case 'max':
      return 'It works in my machine '.repeat(repeatCount).trim()
    case 'min':
      return field.required ? 'A' : ''
  }
}

function getImageValue(field: FieldDefinition, mode: JsonPreviewMode): string | null {
  switch (mode) {
    case 'default':
      return null
    case 'max':
      return '<base64-image-data>'
    case 'min':
      return field.required ? '<base64-image-data>' : null
  }
}

function getLoopValue(
  field: FieldDefinition,
  mode: JsonPreviewMode,
  repeatCount: number,
): Record<string, string>[] {
  const style = field.style as LoopFieldStyle
  const columns = style.columns || []

  switch (mode) {
    case 'default':
      return []

    case 'max': {
      const rows: Record<string, string>[] = []
      const rowCount = style.maxRows || 10
      for (let i = 0; i < rowCount; i++) {
        const row: Record<string, string> = {}
        for (const col of columns) {
          row[col.key] = 'It works in my machine '.repeat(repeatCount).trim()
        }
        rows.push(row)
      }
      return rows
    }

    case 'min': {
      if (!field.required) return []
      const row: Record<string, string> = {}
      for (const col of columns) {
        row[col.key] = 'A'
      }
      return [row]
    }
  }
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
