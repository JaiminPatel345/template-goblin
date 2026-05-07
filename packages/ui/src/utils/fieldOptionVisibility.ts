import type { FieldDefinition } from '@template-goblin/types'

/**
 * Visibility helpers for the properties panel — one boolean function per
 * option whose visibility depends on the active field's type and source mode
 * (GH #26). Pure, side-effect-free, easy to unit-test.
 *
 * Matrix legend (rows = options, columns = field-type × mode):
 *
 * |                | static text | dyn text | static image | dyn image | static table | dyn table |
 * | -------------- |:-----------:|:--------:|:------------:|:---------:|:------------:|:---------:|
 * | mode toggle    |      ✓      |    ✓     |      ✓       |     ✓     |      ✓       |     ✓     |
 * | value          |      ✓      |    ✗     |      ✓       |     ✗     |      ✓       |     ✗     |
 * | json key       |      ✗      |    ✓     |      ✗       |     ✓     |      ✗       |     ✓     |
 * | required       |      ✗      |    ✓     |      ✗       |     ✓     |      ✗       |     ✓     |
 * | placeholder    |      ✗      |    ✓     |      ✗       |     ✓     |      ✗       |     ✓     |
 * | font options   |      ✓      |    ✓     |      ✗       |     ✗     |      ✓       |     ✓     |
 * | overflow mode  |      ✗      |    ✓     |      ✗       |     ✗     |      ✓       |     ✓     |
 * | min font size  |      ✗      |    ⊘*    |      ✗       |     ✗     |      ⊘*      |     ⊘*    |
 * | image fit mode |      ✗      |    ✗     |      ✓       |     ✓     |      ✗       |     ✗     |
 *
 * `⊘*` = only when overflow mode is `dynamic_font` (#91).
 */

/** Source mode for a field (returns 'static' if missing — defensive). */
function modeOf(field: FieldDefinition): 'static' | 'dynamic' {
  return field.source?.mode ?? 'static'
}

/** True when the right panel should show the literal-Value input (static only). */
export function showValueInput(field: FieldDefinition): boolean {
  return modeOf(field) === 'static'
}

/** True when the right panel should show JSON Key / Required / Placeholder (dynamic only). */
export function showDynamicSourceInputs(field: FieldDefinition): boolean {
  return modeOf(field) === 'dynamic'
}

/** Font controls (family, size, weight, etc.) only make sense on text + table. */
export function showFontOptions(field: FieldDefinition): boolean {
  return field.type === 'text' || field.type === 'table'
}

/**
 * Minimum Font Size only matters when Overflow Mode is `dynamic_font`
 * (#91 — the legacy `fontSizeDynamic` boolean was removed). Caller passes
 * the current `style.overflowMode`.
 */
export function showMinFontSize(
  field: FieldDefinition,
  overflowMode: 'truncate' | 'dynamic_font' | undefined,
): boolean {
  if (!showOverflowMode(field)) return false
  return overflowMode === 'dynamic_font'
}

/** Image-specific fit mode (contain / cover / etc.). */
export function showImageFitMode(field: FieldDefinition): boolean {
  return field.type === 'image'
}

/**
 * Overflow Mode is meaningful only when the rendered string can vary —
 * i.e. dynamic text rows. Static text has a fixed string and a fixed
 * fontSize so there is nothing to truncate / shrink dynamically. Tables
 * always show it (cells inherit per-row overflow handling).
 */
export function showOverflowMode(field: FieldDefinition): boolean {
  if (field.type === 'table') return true
  return field.type === 'text' && modeOf(field) === 'dynamic'
}

/** Mode toggle is shown on every field — static or dynamic, every type. */
export function showModeToggle(field: FieldDefinition): boolean {
  return Boolean(field.source)
}
