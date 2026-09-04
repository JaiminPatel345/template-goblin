/**
 * Pure helper functions for toggling and stripping condition property overrides (#43).
 *
 * Extracted from `ConditionalStylingSection.tsx` to maintain the 300-line cap (Rule #11).
 */
import type { TableFieldStyle } from '@template-goblin/types'

/**
 * Extracts the flat list of active property IDs currently overridden in `ruleStyle`.
 */
export function extractSelectedPropIds(ruleStyle?: Record<string, unknown>): string[] {
  if (!ruleStyle) return []
  const keys = new Set<string>()

  for (const key of Object.keys(ruleStyle)) {
    if (
      key === 'headerStyle' &&
      typeof ruleStyle.headerStyle === 'object' &&
      ruleStyle.headerStyle
    ) {
      const headerObj = ruleStyle.headerStyle as Record<string, unknown>
      if (headerObj.fontFamily !== undefined) keys.add('headerFontFamily')
      if (headerObj.fontSize !== undefined) keys.add('headerFontSize')
      if (headerObj.color !== undefined) keys.add('headerTextColor')
      if (headerObj.backgroundColor !== undefined) keys.add('headerBgColor')
      if (headerObj.align !== undefined) keys.add('headerAlign')
    } else if (key === 'rowStyle' && typeof ruleStyle.rowStyle === 'object' && ruleStyle.rowStyle) {
      const rowObj = ruleStyle.rowStyle as Record<string, unknown>
      if (rowObj.fontFamily !== undefined) keys.add('rowFontFamily')
      if (rowObj.fontSize !== undefined) keys.add('rowFontSize')
      if (rowObj.color !== undefined) keys.add('rowTextColor')
      if (rowObj.backgroundColor !== undefined) keys.add('rowBgColor')
      if (rowObj.align !== undefined) keys.add('rowAlign')
    } else if (
      key === 'tableBorder' &&
      typeof ruleStyle.tableBorder === 'object' &&
      ruleStyle.tableBorder
    ) {
      const borderObj = ruleStyle.tableBorder as Record<string, unknown>
      if (borderObj.width !== undefined) keys.add('tableBorderWidth')
      if (borderObj.color !== undefined) keys.add('tableBorderColor')
    } else {
      keys.add(key)
    }
  }

  return Array.from(keys)
}

/**
 * Removes a specific property override from the condition's style dictionary.
 */
export function removePropertyOverride(
  currentStyle: Record<string, unknown>,
  propId: string,
): Record<string, unknown> {
  const nextStyle = { ...currentStyle }

  if (propId.startsWith('header')) {
    const headerObj = { ...((nextStyle.headerStyle as Record<string, unknown>) ?? {}) }
    if (propId === 'headerFontFamily') delete headerObj.fontFamily
    if (propId === 'headerFontSize') delete headerObj.fontSize
    if (propId === 'headerTextColor') delete headerObj.color
    if (propId === 'headerBgColor') delete headerObj.backgroundColor
    if (propId === 'headerAlign') delete headerObj.align
    if (Object.keys(headerObj).length === 0) delete nextStyle.headerStyle
    else nextStyle.headerStyle = headerObj
  } else if (propId.startsWith('row')) {
    const rowObj = { ...((nextStyle.rowStyle as Record<string, unknown>) ?? {}) }
    if (propId === 'rowFontFamily') delete rowObj.fontFamily
    if (propId === 'rowFontSize') delete rowObj.fontSize
    if (propId === 'rowTextColor') delete rowObj.color
    if (propId === 'rowBgColor') delete rowObj.backgroundColor
    if (propId === 'rowAlign') delete rowObj.align
    if (Object.keys(rowObj).length === 0) delete nextStyle.rowStyle
    else nextStyle.rowStyle = rowObj
  } else if (propId.startsWith('tableBorder')) {
    const borderObj = { ...((nextStyle.tableBorder as Record<string, unknown>) ?? {}) }
    if (propId === 'tableBorderWidth') delete borderObj.width
    if (propId === 'tableBorderColor') delete borderObj.color
    if (Object.keys(borderObj).length === 0) delete nextStyle.tableBorder
  } else {
    const remaining: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(nextStyle)) {
      if (k !== propId) {
        remaining[k] = v
      }
    }
    return remaining
  }

  return nextStyle
}

/**
 * Initializes or removes a property override for a condition.
 */
export function togglePropertyOverride(
  currentStyle: Record<string, unknown>,
  baseStyle: Record<string, unknown>,
  propId: string,
  enabled: boolean,
): Record<string, unknown> {
  if (!enabled) {
    return removePropertyOverride(currentStyle, propId)
  }

  const nextStyle = { ...currentStyle }
  const tableBase = baseStyle as unknown as TableFieldStyle

  if (propId === 'headerFontFamily') {
    nextStyle.headerStyle = {
      ...((nextStyle.headerStyle as Record<string, unknown>) ?? {}),
      fontFamily: tableBase.headerStyle?.fontFamily ?? 'Helvetica',
    }
  } else if (propId === 'headerFontSize') {
    nextStyle.headerStyle = {
      ...((nextStyle.headerStyle as Record<string, unknown>) ?? {}),
      fontSize: tableBase.headerStyle?.fontSize ?? 10,
    }
  } else if (propId === 'headerTextColor') {
    nextStyle.headerStyle = {
      ...((nextStyle.headerStyle as Record<string, unknown>) ?? {}),
      color: tableBase.headerStyle?.color ?? '#000000',
    }
  } else if (propId === 'headerBgColor') {
    nextStyle.headerStyle = {
      ...((nextStyle.headerStyle as Record<string, unknown>) ?? {}),
      backgroundColor: tableBase.headerStyle?.backgroundColor ?? null,
    }
  } else if (propId === 'headerAlign') {
    nextStyle.headerStyle = {
      ...((nextStyle.headerStyle as Record<string, unknown>) ?? {}),
      align: tableBase.headerStyle?.align ?? 'left',
    }
  } else if (propId === 'rowFontFamily') {
    nextStyle.rowStyle = {
      ...((nextStyle.rowStyle as Record<string, unknown>) ?? {}),
      fontFamily: tableBase.rowStyle?.fontFamily ?? 'Helvetica',
    }
  } else if (propId === 'rowFontSize') {
    nextStyle.rowStyle = {
      ...((nextStyle.rowStyle as Record<string, unknown>) ?? {}),
      fontSize: tableBase.rowStyle?.fontSize ?? 10,
    }
  } else if (propId === 'rowTextColor') {
    nextStyle.rowStyle = {
      ...((nextStyle.rowStyle as Record<string, unknown>) ?? {}),
      color: tableBase.rowStyle?.color ?? '#000000',
    }
  } else if (propId === 'rowBgColor') {
    nextStyle.rowStyle = {
      ...((nextStyle.rowStyle as Record<string, unknown>) ?? {}),
      backgroundColor: tableBase.rowStyle?.backgroundColor ?? null,
    }
  } else if (propId === 'rowAlign') {
    nextStyle.rowStyle = {
      ...((nextStyle.rowStyle as Record<string, unknown>) ?? {}),
      align: tableBase.rowStyle?.align ?? 'left',
    }
  } else if (propId === 'tableBorderWidth') {
    nextStyle.tableBorder = {
      ...((nextStyle.tableBorder as Record<string, unknown>) ?? {}),
      width: tableBase.tableBorder?.width ?? 1,
    }
  } else if (propId === 'tableBorderColor') {
    nextStyle.tableBorder = {
      ...((nextStyle.tableBorder as Record<string, unknown>) ?? {}),
      color: tableBase.tableBorder?.color ?? '#000000',
    }
  } else {
    nextStyle[propId] = baseStyle[propId] ?? ''
  }

  return nextStyle
}
