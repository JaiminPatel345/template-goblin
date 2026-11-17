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
 * Cluster of dynamic tables sharing overlapping vertical spans.
 */
interface TableCluster {
  tables: TableField[]
  origBottom: number
  newBottom: number
  delta: number
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
  const headerHeight =
    field.style.showHeader !== false
      ? typeof field.style.headerHeight === 'number' && field.style.headerHeight > 0
        ? field.style.headerHeight
        : cellRowHeight(field.style.headerStyle)
      : 0
  const rowHeight = cellRowHeight(field.style.rowStyle)
  return headerHeight + rowCount * rowHeight
}

/**
 * Adjust page layout for tables configured with `heightMode: 'single_page_dynamic'`.
 *
 * Handles:
 * 1. Single dynamic tables expanding vertically.
 * 2. Side-by-side dynamic tables expanding independently without double-counting deltas.
 * 3. Preserving position of elements alongside dynamic tables.
 * 4. Pushing down all elements below dynamic tables by the effective vertical growth.
 * 5. Expanding the page height by the total accumulated vertical growth.
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

  const firstTable = dynTables[0]
  if (!firstTable) {
    return { width: baseWidth, height: baseHeight, fields: workingFields }
  }
  const firstOrig = originalBounds.get(firstTable.id)
  if (!firstOrig) {
    return { width: baseWidth, height: baseHeight, fields: workingFields }
  }

  // Group dynamic tables into vertical clusters (overlapping original Y intervals)
  const clusters: TableCluster[] = []
  let currentCluster: TableField[] = [firstTable]
  let currentClusterMaxBottom = firstOrig.bottom

  for (let i = 1; i < dynTables.length; i++) {
    const t = dynTables[i]
    if (!t) continue
    const orig = originalBounds.get(t.id)
    if (!orig) continue
    if (orig.y < currentClusterMaxBottom) {
      currentCluster.push(t)
      currentClusterMaxBottom = Math.max(currentClusterMaxBottom, orig.bottom)
    } else {
      clusters.push({
        tables: currentCluster,
        origBottom: currentClusterMaxBottom,
        newBottom: 0,
        delta: 0,
      })
      currentCluster = [t]
      currentClusterMaxBottom = orig.bottom
    }
  }
  clusters.push({
    tables: currentCluster,
    origBottom: currentClusterMaxBottom,
    newBottom: 0,
    delta: 0,
  })

  let accumulatedShift = 0

  for (const cluster of clusters) {
    let clusterMaxNewBottom = 0
    for (const t of cluster.tables) {
      const orig = originalBounds.get(t.id)
      if (!orig) continue
      t.y = orig.y + accumulatedShift
      const renderedHeight = computeTableRenderedHeight(t, data)
      t.height = Math.max(t.height, renderedHeight)
      const tableNewBottom = t.y + t.height
      clusterMaxNewBottom = Math.max(clusterMaxNewBottom, tableNewBottom)
    }
    cluster.newBottom = clusterMaxNewBottom
    cluster.delta = Math.max(0, clusterMaxNewBottom - (cluster.origBottom + accumulatedShift))
    accumulatedShift += cluster.delta
  }

  // Adjust non-dynamic-table elements: shift by the deltas of all clusters strictly above them
  for (const f of workingFields) {
    if (isDynTable(f)) continue
    const orig = originalBounds.get(f.id)
    if (!orig) continue
    let shift = 0
    for (const cluster of clusters) {
      if (orig.y >= cluster.origBottom) {
        shift += cluster.delta
      }
    }
    f.y = orig.y + shift
  }

  return {
    width: baseWidth,
    height: baseHeight + accumulatedShift,
    fields: workingFields,
  }
}
