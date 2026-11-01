/**
 * Height and pagination mode for table fields.
 *
 * - `'fixed'`: table stays within its drawn boundary; extra rows are clipped.
 * - `'single_page_dynamic'`: table and page expand vertically to fit all rows on one page,
 *   shifting all content below it down while preserving vertical spacing.
 * - `'multipage'`: table splits and flows across continuation pages when rows exceed the boundary.
 */
export type TableHeightMode = 'fixed' | 'single_page_dynamic' | 'multipage'

/**
 * Resolve the effective table height mode.
 *
 * Honors explicit `heightMode` if specified. Falls back to legacy `multiPage`:
 * `multiPage: true` -> `'multipage'`, otherwise -> `'fixed'`.
 *
 * @param style Style object containing optional `heightMode` or `multiPage`
 * @returns The resolved `TableHeightMode`
 */
export function resolveTableHeightMode(style?: {
  heightMode?: TableHeightMode
  multiPage?: boolean
}): TableHeightMode {
  if (style?.heightMode) return style.heightMode
  return style?.multiPage ? 'multipage' : 'fixed'
}
