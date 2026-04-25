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
 * | auto-fit font  |      ✗      |    ✓     |      ✗       |     ✗     |      ✗       |     ✗     |
 * | min font size  |      ✗      |    ⊘*    |      ✗       |     ✗     |      ✗       |     ✗     |
 * | image fit mode |      ✗      |    ✗     |      ✓       |     ✓     |      ✗       |     ✗     |
 *
 * `⊘*` = only when auto-fit font is enabled.
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

/** Auto-fit font-size only applies to dynamic text — static strings are fixed. */
export function showAutoFitFont(field: FieldDefinition): boolean {
  return field.type === 'text' && modeOf(field) === 'dynamic'
}

/**
 * Min-font-size only matters when auto-fit is enabled. Caller passes the
 * current `style.fontSizeDynamic` (true when auto-fit is on).
 */
export function showMinFontSize(field: FieldDefinition, fontSizeDynamic: boolean): boolean {
  return showAutoFitFont(field) && fontSizeDynamic
}

/** Image-specific fit mode (contain / cover / etc.). */
export function showImageFitMode(field: FieldDefinition): boolean {
  return field.type === 'image'
}

/** Mode toggle is shown on every field — static or dynamic, every type. */
export function showModeToggle(field: FieldDefinition): boolean {
  return Boolean(field.source)
}
