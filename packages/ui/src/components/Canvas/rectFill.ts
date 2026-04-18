import type { FieldDefinition } from '@template-goblin/types'

/**
 * Whether the coloured fill rect should render for a given field on the canvas.
 *
 * Rules (IMP-3 + IMP-4):
 *   - Static fields (any type) never get a fill — their outline is drawn
 *     separately. The static content renders through other branches (label
 *     for text, placeholder image for image, table rows for table).
 *   - Dynamic image fields with a RESOLVED placeholder image skip the fill;
 *     the image itself covers the rect interior.
 *   - All other dynamic fields (text, table, or image with no resolved
 *     placeholder) still get the coloured fill so the empty rect is visible.
 *
 * `opts.placeholderResolved` is a hint from the caller — the CanvasArea
 * walks `placeholderBuffers` and, if the buffer is present, passes `true`.
 * Callers that don't care about placeholders can omit the option entirely;
 * the helper then treats it as `false`.
 */
export function shouldRenderFillRect(
  field: FieldDefinition,
  opts: { placeholderResolved?: boolean },
): boolean {
  if (!field.source) return true // legacy / malformed — safe default
  if (field.source.mode === 'static') return false
  if (field.type === 'image' && opts.placeholderResolved) return false
  return true
}
