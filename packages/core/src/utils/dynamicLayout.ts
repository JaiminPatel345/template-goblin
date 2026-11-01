import type { FieldDefinition, InputJSON, TableField } from '@template-goblin/types'
import { resolveTableHeightMode } from '@template-goblin/types'
import { cellRowHeight } from '../render/tableStyle.js'

/**
 * Result of computing dynamic page layout.
 */
export interface PageLayoutResult {
  width: number
  height: number
  fields: FieldDefinition[]
}

/**
 * Compute the rendered height needed for a table field based on input row data.
 *
 * @param field The table field
 * @param data Input JSON data
 * @returns Total height required in points
 */
export function computeTableRenderedHeight(field: TableField, data: InputJSON): number {
  const rowData: unknown[] =
    field.source.mode === 'dynamic'
      ? (data.tables?.[field.source.jsonKey] ?? [])
      : Array.isArray(field.source.value)
        ? field.source.value
        : []
  const rowCount = Array.isArray(rowData) ? rowData.length : 0
  const headerHeight = field.style.showHeader !== false ? cellRowHeight(field.style.headerStyle) : 0
  const rowHeight = cellRowHeight(field.style.rowStyle)
  return headerHeight + rowCount * rowHeight
}

/**
 * Adjust page layout for tables configured with `heightMode: 'single_page_dynamic'`.
 *
 * When a dynamic table expands beyond its initial drawn height:
 * 1. The table height expands to fit all rows on the page.
 * 2. All elements positioned below the table (original y >= table.originalY + table.originalHeight)
 *    are shifted down by the table's growth delta, preserving vertical spacing.
 * 3. Elements positioned aside the table stay at their original coordinates.
 * 4. The overall page height expands by the total delta.
 *
 * @param fields Fields assigned to this page
 * @param data Input JSON data
 * @param baseWidth Base width of the page
 * @param baseHeight Base height of the page
 * @returns Updated dimensions and adjusted field definitions
 */
export function adjustPageLayout(
  fields: FieldDefinition[],
  data: InputJSON,
  baseWidth: number,
  baseHeight: number,
): PageLayoutResult {
  const workingFields = fields.map((f) => ({ ...f }))
  const originalBounds = new Map<string, { y: number; bottom: number }>()
  for (const f of fields) {
    originalBounds.set(f.id, { y: f.y, bottom: f.y + f.height })
  }

  const isDynTable = (f: FieldDefinition): f is TableField =>
    f.type === 'table' && resolveTableHeightMode(f.style) === 'single_page_dynamic'

  const dynTables = workingFields
    .filter(isDynTable)
    .sort((a, b) => (originalBounds.get(a.id)?.y ?? 0) - (originalBounds.get(b.id)?.y ?? 0))

  if (dynTables.length === 0) {
    return { width: baseWidth, height: baseHeight, fields: workingFields }
  }

  let totalPageDelta = 0

  for (const dynTable of dynTables) {
    const orig = originalBounds.get(dynTable.id)
    if (!orig) continue

    const renderedHeight = computeTableRenderedHeight(dynTable, data)
    const delta = Math.max(0, renderedHeight - dynTable.height)

    if (delta > 0) {
      totalPageDelta += delta
      dynTable.height = renderedHeight

      for (const other of workingFields) {
        if (other.id === dynTable.id) continue
        const otherOrig = originalBounds.get(other.id)
        if (!otherOrig) continue

        // Content below the table gets pushed down by delta
        if (otherOrig.y >= orig.bottom) {
          other.y += delta
        }
      }
    }
  }

  return {
    width: baseWidth,
    height: baseHeight + totalPageDelta,
    fields: workingFields,
  }
}
