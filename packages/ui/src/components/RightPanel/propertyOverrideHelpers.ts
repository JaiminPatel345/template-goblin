/**
 * Pure helper functions for toggling and stripping condition property overrides (#43).
 *
 * Extracted from `ConditionalStylingSection.tsx` to maintain the 300-line cap (Rule #11).
 */
import type { TableFieldStyle } from '@template-goblin/types'
import {
  extractTablePropIds,
  removeTablePropertyOverride,
  toggleTablePropertyOverride,
} from './tableOverrideHelpers.js'

/**
 * Extracts the flat list of active property IDs currently overridden in `ruleStyle`.
 */
export function extractSelectedPropIds(ruleStyle?: Record<string, unknown>): string[] {
  if (!ruleStyle) return []
  const keys = new Set<string>()

  // Delegate nested table properties
  extractTablePropIds(ruleStyle, keys)

  // Top-level properties (text, image, table settings, rotation)
  for (const key of Object.keys(ruleStyle)) {
    if (
      key !== 'headerStyle' &&
      key !== 'rowStyle' &&
      key !== 'tableBorder' &&
      key !== 'cellStyle'
    ) {
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

  if (removeTablePropertyOverride(nextStyle, propId)) {
    return nextStyle
  }

  const remaining: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(nextStyle)) {
    if (k !== propId) {
      remaining[k] = v
    }
  }
  return remaining
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

  if (toggleTablePropertyOverride(nextStyle, tableBase, propId)) {
    return nextStyle
  }

  // Handle rotation or top-level properties
  if (propId === 'rotation') {
    nextStyle.rotation = baseStyle.rotation ?? 0
  } else if (propId === 'maxRows') {
    nextStyle.maxRows = baseStyle.maxRows ?? 1
  } else if (propId === 'maxColumns') {
    nextStyle.maxColumns = baseStyle.maxColumns ?? 5
  } else if (propId === 'multiPage') {
    nextStyle.multiPage = baseStyle.multiPage ?? true
  } else if (propId === 'showHeader') {
    nextStyle.showHeader = baseStyle.showHeader ?? true
  } else if (propId === 'fitToContent') {
    nextStyle.fitToContent = baseStyle.fitToContent ?? true
  } else if (propId === 'lineHeight') {
    nextStyle.lineHeight = baseStyle.lineHeight ?? 1.2
  } else if (propId === 'trim') {
    nextStyle.trim = baseStyle.trim !== false
  } else if (propId === 'hyperlink') {
    nextStyle.hyperlink = baseStyle.hyperlink ?? { mode: 'static', url: 'https://' }
  } else if (propId === 'groupId') {
    nextStyle.groupId = baseStyle.groupId ?? null
  } else if (propId === 'color') {
    nextStyle.color = baseStyle.color ?? '#ffffff'
  } else if (propId === 'filename') {
    nextStyle.filename = baseStyle.filename ?? ''
  } else {
    nextStyle[propId] = baseStyle[propId] ?? ''
  }

  return nextStyle
}
