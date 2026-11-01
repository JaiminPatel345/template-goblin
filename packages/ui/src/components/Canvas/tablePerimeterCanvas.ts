import { Rect } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition } from '@template-goblin/types'

/**
 * Whether a colour value is meaningful to render. Empty / null / `none` /
 * `transparent` all map to "skip"; everything else is forwarded to Fabric.
 */
export function isVisibleColor(c: string | null | undefined): c is string {
  if (!c) return false
  const s = c.trim().toLowerCase()
  return s.length > 0 && s !== 'transparent' && s !== 'none'
}

/**
 * Compute and append the table's outer perimeter rect, mirroring the
 * PDFKit renderer so changes to `tableBorder.color`, `tableBorder.width`,
 * or `fitToContent` show up live on canvas.
 */
export function pushTablePerimeter(
  parts: FabricObject[],
  field: FieldDefinition,
  width: number,
  height: number,
  headerH: number,
  rows: Record<string, string>[] | null,
): void {
  if (field.type !== 'table' || !field.style) return
  const style = field.style
  const tb = style.tableBorder
  const stroke = tb ? tb.color : style.rowStyle?.borderColor
  const sw = tb ? tb.width : (style.rowStyle?.borderWidth ?? 0)
  if (!isVisibleColor(stroke) || !(sw > 0)) return

  let perimeterH = height
  const fitToContent = style.fitToContent !== false
  if (fitToContent && rows && rows.length > 0) {
    const rs = style.rowStyle
    const fontSize = typeof rs?.fontSize === 'number' && rs.fontSize > 0 ? rs.fontSize : 10
    const padTop = Math.max(0, rs?.paddingTop ?? 2)
    const padBottom = Math.max(0, rs?.paddingBottom ?? 2)
    const rowH = fontSize + padTop + padBottom
    const maxRowsCfg = style.maxRows
    const maxRows = typeof maxRowsCfg === 'number' && maxRowsCfg > 0 ? maxRowsCfg : rows.length
    const availableH = Math.max(0, height - headerH)
    const fitCount = rowH > 0 ? Math.floor(availableH / rowH) : 0
    const renderCount = Math.min(rows.length, maxRows, fitCount)
    if (renderCount > 0) perimeterH = Math.min(height, headerH + renderCount * rowH)
    else if (headerH > 0) perimeterH = headerH
  }

  parts.push(
    new Rect({
      left: 0,
      top: 0,
      width,
      height: perimeterH,
      fill: '',
      stroke,
      strokeWidth: sw,
      strokeUniform: true,
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top',
    }),
  )
}
