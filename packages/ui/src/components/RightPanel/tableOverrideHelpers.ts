/**
 * Table property override helpers for condition-based styling (#43).
 *
 * Extracted from `propertyOverrideHelpers.ts` to keep file sizes under
 * the 300-line cap (Rule #11).
 */
import type { TableFieldStyle, CellStyle, TableBorderStyle } from '@template-goblin/types'

/**
 * Extracts table-specific property IDs from a rule's style dictionary.
 */
export function extractTablePropIds(ruleStyle: Record<string, unknown>, keys: Set<string>): void {
  if (
    'headerStyle' in ruleStyle &&
    typeof ruleStyle.headerStyle === 'object' &&
    ruleStyle.headerStyle
  ) {
    const h = ruleStyle.headerStyle as Record<string, unknown>
    if (h.fontFamily !== undefined) keys.add('headerFontFamily')
    if (h.fontSize !== undefined) keys.add('headerFontSize')
    if (h.fontWeight !== undefined) keys.add('headerFontWeight')
    if (h.fontStyle !== undefined) keys.add('headerFontStyle')
    if (h.textDecoration !== undefined) keys.add('headerTextDecoration')
    if (h.color !== undefined) keys.add('headerTextColor')
    if (h.backgroundColor !== undefined) keys.add('headerBgColor')
    if (h.align !== undefined) keys.add('headerAlign')
    if (h.verticalAlign !== undefined) keys.add('headerVerticalAlign')
  }

  if ('rowStyle' in ruleStyle && typeof ruleStyle.rowStyle === 'object' && ruleStyle.rowStyle) {
    const r = ruleStyle.rowStyle as Record<string, unknown>
    if (r.fontFamily !== undefined) keys.add('rowFontFamily')
    if (r.fontSize !== undefined) keys.add('rowFontSize')
    if (r.fontWeight !== undefined) keys.add('rowFontWeight')
    if (r.fontStyle !== undefined) keys.add('rowFontStyle')
    if (r.textDecoration !== undefined) keys.add('rowTextDecoration')
    if (r.color !== undefined) keys.add('rowTextColor')
    if (r.backgroundColor !== undefined) keys.add('rowBgColor')
    if (r.align !== undefined) keys.add('rowAlign')
    if (r.verticalAlign !== undefined) keys.add('rowVerticalAlign')
    if (r.borderWidth !== undefined) keys.add('cellBorderWidth')
    if (r.borderColor !== undefined) keys.add('cellBorderColor')
    if (r.paddingTop !== undefined) keys.add('paddingTop')
    if (r.paddingBottom !== undefined) keys.add('paddingBottom')
    if (r.paddingLeft !== undefined) keys.add('paddingLeft')
    if (r.paddingRight !== undefined) keys.add('paddingRight')
  }

  if (
    'tableBorder' in ruleStyle &&
    typeof ruleStyle.tableBorder === 'object' &&
    ruleStyle.tableBorder
  ) {
    const b = ruleStyle.tableBorder as Record<string, unknown>
    if (b.width !== undefined) keys.add('tableBorderWidth')
    if (b.color !== undefined) keys.add('tableBorderColor')
  }

  if ('cellStyle' in ruleStyle && typeof ruleStyle.cellStyle === 'object' && ruleStyle.cellStyle) {
    const c = ruleStyle.cellStyle as Record<string, unknown>
    if (c.overflowMode !== undefined) keys.add('tableOverflowMode')
  }
}

/**
 * Removes a table property override from the style dictionary.
 * Returns `true` if the propId belonged to table properties and was handled.
 */
export function removeTablePropertyOverride(
  nextStyle: Record<string, unknown>,
  propId: string,
): boolean {
  if (propId.startsWith('header')) {
    const headerObj = { ...((nextStyle.headerStyle as Record<string, unknown>) ?? {}) }
    if (propId === 'headerFontFamily') delete headerObj.fontFamily
    if (propId === 'headerFontSize') delete headerObj.fontSize
    if (propId === 'headerFontWeight') delete headerObj.fontWeight
    if (propId === 'headerFontStyle') delete headerObj.fontStyle
    if (propId === 'headerTextDecoration') delete headerObj.textDecoration
    if (propId === 'headerTextColor') delete headerObj.color
    if (propId === 'headerBgColor') delete headerObj.backgroundColor
    if (propId === 'headerAlign') delete headerObj.align
    if (propId === 'headerVerticalAlign') delete headerObj.verticalAlign
    if (Object.keys(headerObj).length === 0) delete nextStyle.headerStyle
    else nextStyle.headerStyle = headerObj
    return true
  }

  if (
    propId.startsWith('row') ||
    propId === 'cellBorderWidth' ||
    propId === 'cellBorderColor' ||
    propId.startsWith('padding')
  ) {
    const rowObj = { ...((nextStyle.rowStyle as Record<string, unknown>) ?? {}) }
    if (propId === 'rowFontFamily') delete rowObj.fontFamily
    if (propId === 'rowFontSize') delete rowObj.fontSize
    if (propId === 'rowFontWeight') delete rowObj.fontWeight
    if (propId === 'rowFontStyle') delete rowObj.fontStyle
    if (propId === 'rowTextDecoration') delete rowObj.textDecoration
    if (propId === 'rowTextColor') delete rowObj.color
    if (propId === 'rowBgColor') delete rowObj.backgroundColor
    if (propId === 'rowAlign') delete rowObj.align
    if (propId === 'rowVerticalAlign') delete rowObj.verticalAlign
    if (propId === 'cellBorderWidth') delete rowObj.borderWidth
    if (propId === 'cellBorderColor') delete rowObj.borderColor
    if (propId === 'paddingTop') delete rowObj.paddingTop
    if (propId === 'paddingBottom') delete rowObj.paddingBottom
    if (propId === 'paddingLeft') delete rowObj.paddingLeft
    if (propId === 'paddingRight') delete rowObj.paddingRight
    if (Object.keys(rowObj).length === 0) delete nextStyle.rowStyle
    else nextStyle.rowStyle = rowObj
    return true
  }

  if (propId.startsWith('tableBorder')) {
    const borderObj = { ...((nextStyle.tableBorder as Record<string, unknown>) ?? {}) }
    if (propId === 'tableBorderWidth') delete borderObj.width
    if (propId === 'tableBorderColor') delete borderObj.color
    if (Object.keys(borderObj).length === 0) delete nextStyle.tableBorder
    else nextStyle.tableBorder = borderObj
    return true
  }

  if (propId === 'tableOverflowMode') {
    const cellObj = { ...((nextStyle.cellStyle as Record<string, unknown>) ?? {}) }
    delete cellObj.overflowMode
    if (Object.keys(cellObj).length === 0) delete nextStyle.cellStyle
    else nextStyle.cellStyle = cellObj
    return true
  }

  return false
}

/**
 * Initializes a table-specific property override on `nextStyle`.
 * Returns `true` if handled, `false` otherwise.
 */
export function toggleTablePropertyOverride(
  nextStyle: Record<string, unknown>,
  tableBase: TableFieldStyle,
  propId: string,
): boolean {
  if (propId.startsWith('header')) {
    const h = (nextStyle.headerStyle as Partial<CellStyle>) ?? {}
    const bh = tableBase.headerStyle
    if (propId === 'headerFontFamily') h.fontFamily = bh?.fontFamily ?? 'Helvetica'
    else if (propId === 'headerFontSize') h.fontSize = bh?.fontSize ?? 10
    else if (propId === 'headerFontWeight') h.fontWeight = bh?.fontWeight ?? 'bold'
    else if (propId === 'headerFontStyle') h.fontStyle = bh?.fontStyle ?? 'normal'
    else if (propId === 'headerTextDecoration') h.textDecoration = bh?.textDecoration ?? 'none'
    else if (propId === 'headerTextColor') h.color = bh?.color ?? '#000000'
    else if (propId === 'headerBgColor') h.backgroundColor = bh?.backgroundColor ?? null
    else if (propId === 'headerAlign') h.align = bh?.align ?? 'left'
    else if (propId === 'headerVerticalAlign') h.verticalAlign = bh?.verticalAlign ?? 'middle'
    nextStyle.headerStyle = h
    return true
  }

  if (
    propId.startsWith('row') ||
    propId === 'cellBorderWidth' ||
    propId === 'cellBorderColor' ||
    propId.startsWith('padding')
  ) {
    const r = (nextStyle.rowStyle as Partial<CellStyle>) ?? {}
    const br = tableBase.rowStyle
    if (propId === 'rowFontFamily') r.fontFamily = br?.fontFamily ?? 'Helvetica'
    else if (propId === 'rowFontSize') r.fontSize = br?.fontSize ?? 10
    else if (propId === 'rowFontWeight') r.fontWeight = br?.fontWeight ?? 'normal'
    else if (propId === 'rowFontStyle') r.fontStyle = br?.fontStyle ?? 'normal'
    else if (propId === 'rowTextDecoration') r.textDecoration = br?.textDecoration ?? 'none'
    else if (propId === 'rowTextColor') r.color = br?.color ?? '#000000'
    else if (propId === 'rowBgColor') r.backgroundColor = br?.backgroundColor ?? null
    else if (propId === 'rowAlign') r.align = br?.align ?? 'left'
    else if (propId === 'rowVerticalAlign') r.verticalAlign = br?.verticalAlign ?? 'middle'
    else if (propId === 'cellBorderWidth') r.borderWidth = br?.borderWidth ?? 1
    else if (propId === 'cellBorderColor') r.borderColor = br?.borderColor ?? '#000000'
    else if (propId === 'paddingTop') r.paddingTop = br?.paddingTop ?? 4
    else if (propId === 'paddingBottom') r.paddingBottom = br?.paddingBottom ?? 4
    else if (propId === 'paddingLeft') r.paddingLeft = br?.paddingLeft ?? 4
    else if (propId === 'paddingRight') r.paddingRight = br?.paddingRight ?? 4
    nextStyle.rowStyle = r
    return true
  }

  if (propId.startsWith('tableBorder')) {
    const b = (nextStyle.tableBorder as Partial<TableBorderStyle>) ?? {}
    const bb = tableBase.tableBorder
    if (propId === 'tableBorderWidth') b.width = bb?.width ?? 1
    else if (propId === 'tableBorderColor') b.color = bb?.color ?? '#000000'
    nextStyle.tableBorder = b
    return true
  }

  if (propId === 'tableOverflowMode') {
    const c = (nextStyle.cellStyle as Record<string, unknown>) ?? {}
    c.overflowMode = tableBase.cellStyle?.overflowMode ?? 'dynamic_font'
    nextStyle.cellStyle = c
    return true
  }

  return false
}
