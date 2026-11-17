import { Line, Rect } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition } from '@template-goblin/types'
import { resolveTableHeightMode } from '@template-goblin/types'

const DEFAULT_INDICATOR_STROKE = '#4f46e5'
const DEFAULT_INDICATOR_WIDTH = 2

/**
 * Append a vertical line ending with tilted / wavy zigzag break segments
 * to indicate unbounded dynamic continuation for multi-page tables.
 */
function pushWavyVerticalLine(
  parts: FabricObject[],
  x: number,
  height: number,
  opts: Record<string, unknown>,
): void {
  const waveH = 24
  const straightH = Math.max(0, height - waveH)
  parts.push(new Line([x, 0, x, straightH], opts))

  const step = waveH / 4
  const amp = 5
  parts.push(
    new Line([x, straightH, x - amp, straightH + step], opts),
    new Line([x - amp, straightH + step, x + amp, straightH + step * 2], opts),
    new Line([x + amp, straightH + step * 2, x - amp, straightH + step * 3], opts),
    new Line([x - amp, straightH + step * 3, x + amp, height], opts),
    new Line([x + amp, height, x, height + 6], opts),
  )
}

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
 *
 * For multi-page tables, the bottom remains open with wavy/tilted break lines
 * at the ends of both vertical sides.
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

  const isMultipage = resolveTableHeightMode(style) === 'multipage'
  if (isMultipage) {
    const strokeColor = isVisibleColor(stroke) ? stroke : DEFAULT_INDICATOR_STROKE
    const strokeW = sw > 0 ? sw : DEFAULT_INDICATOR_WIDTH
    const lineOpts = {
      stroke: strokeColor,
      strokeWidth: strokeW,
      strokeUniform: true,
      selectable: false,
      evented: false,
    }
    // Top border
    parts.push(new Line([0, 0, width, 0], lineOpts))
    // Left vertical line with wavy/tilted end
    pushWavyVerticalLine(parts, 0, height, lineOpts)
    // Right vertical line with wavy/tilted end
    pushWavyVerticalLine(parts, width, height, lineOpts)
    return
  }

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
