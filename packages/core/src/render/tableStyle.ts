import type { CellStyle } from '@template-goblin/types'

/** Compute a single-row height from a CellStyle (font-size baseline + padding). */
export function cellRowHeight(cs: CellStyle): number {
  return cs.fontSize + cs.paddingTop + cs.paddingBottom
}

/** Merge an optional style override over a base style. */
export function mergeStyle(
  base: CellStyle,
  override: Partial<CellStyle> | null | undefined,
): CellStyle {
  if (!override) return base
  return { ...base, ...override }
}
