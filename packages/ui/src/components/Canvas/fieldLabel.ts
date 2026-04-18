import type { FieldDefinition } from '@template-goblin/types'

/**
 * Label shown inside a field's bounding box on the canvas (IMP-1).
 *
 * Priority:
 *  1. Dynamic fields with a non-empty placeholder preview → the placeholder
 *     (string for text, `filename` for image, otherwise falls through).
 *  2. Dynamic fields without a placeholder → the raw `jsonKey` (no type
 *     prefix — the type is communicated via colour).
 *  3. Static text fields → the literal `source.value` string.
 *  4. Static image fields → the filename on `source.value`.
 *  5. Otherwise an empty string; caller MUST handle falsy labels.
 *
 * Never emits a "<static text>" / "(text)" / "texts.*" type badge — those
 * live only in the left-panel field list.
 */
export function fieldCanvasLabel(field: FieldDefinition): string {
  if (!field.source) return ''
  const src = field.source
  if (src.mode === 'dynamic') {
    const ph = src.placeholder as unknown
    if (typeof ph === 'string' && ph.length > 0) return ph
    if (ph && typeof ph === 'object' && 'filename' in ph) {
      const name = (ph as { filename: unknown }).filename
      if (typeof name === 'string' && name.length > 0) return name
    }
    return src.jsonKey ?? ''
  }
  // static
  if (field.type === 'text') {
    const v = src.value as unknown
    return typeof v === 'string' ? v : ''
  }
  if (field.type === 'image') {
    const v = src.value as unknown
    if (v && typeof v === 'object' && 'filename' in v) {
      const name = (v as { filename: unknown }).filename
      if (typeof name === 'string') return name
    }
  }
  return ''
}
