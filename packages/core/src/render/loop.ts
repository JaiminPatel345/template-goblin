import type PDFDocument from 'pdfkit'
import type {
  CellStyle,
  TableColumn,
  TableField,
  TableFieldStyle,
  TableRow,
  TemplateMeta,
} from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { renderBackground } from './background.js'
import { measureText, truncateLines } from '../utils/measure.js'
import { resolvePdfFontName } from './pdfFontResolver.js'
import { paintTextDecoration } from './textDecoration.js'
import { resolveCellTextY } from './cellVerticalAlign.js'

/**
 * Render a table field onto a PDFKit document.
 *
 * Handles header rendering, data rows with per-column style overrides,
 * cell borders/padding, and multi-page overflow.
 *
 * Honours `showHeader`, per-column `style` + `headerStyle` overrides, and
 * `oddRowStyle` / `evenRowStyle` zebra striping (merged over `rowStyle`).
 */
export function renderLoop(
  doc: InstanceType<typeof PDFDocument>,
  field: TableField,
  rowData: TableRow[],
  _fonts: Map<string, string>,
  meta: TemplateMeta,
  backgroundImage: Buffer | null,
): void {
  const style = field.style
  const { x, y, width } = field
  const columns = style.columns

  const totalDefinedWidth = columns.reduce((sum: number, col: TableColumn) => sum + col.width, 0)
  const scaleFactor = totalDefinedWidth > 0 ? width / totalDefinedWidth : 1

  const headerRowHeight = cellRowHeight(style.headerStyle)
  const dataRowHeight = cellRowHeight(style.rowStyle)

  let currentY = y
  let currentPage = 1
  let rowIndex = 0

  if (style.showHeader !== false) {
    currentY = renderHeaderRow(doc, columns, style, x, currentY, scaleFactor)
  }

  while (rowIndex < rowData.length) {
    const row = rowData[rowIndex]
    if (!row) {
      rowIndex++
      continue
    }

    const pageBottom = y + field.height
    if (currentY + dataRowHeight > pageBottom) {
      if (!style.multiPage) break

      currentPage++
      if (currentPage > meta.maxPages) {
        const label = field.source.mode === 'dynamic' ? field.source.jsonKey : `static-${field.id}`
        throw new TemplateGoblinError(
          'MAX_PAGES_EXCEEDED',
          `Table "${label}" requires ${currentPage} pages but maxPages is ${meta.maxPages}`,
        )
      }

      // Close the perimeter on the page we're leaving before moving on,
      // so each page's table chunk has all four edges (#65).
      drawTablePerimeter(doc, x, y, width, field.height, style)

      // margin: 0 — addPage REPLACES constructor options (see generate.ts).
      doc.addPage({ size: [meta.width, meta.height], margin: 0 })
      renderBackground(doc, backgroundImage, meta)

      currentY = y
      if (style.showHeader !== false) {
        currentY = renderHeaderRow(doc, columns, style, x, currentY, scaleFactor)
      }
    }

    currentY = renderDataRow(doc, columns, row, style, x, currentY, scaleFactor, rowIndex)
    rowIndex++
    void headerRowHeight
  }

  // GH #65: stamp the table's perimeter on top so the user-configured
  // border surrounds the rect's full extent, even when the last data row
  // ended above the bottom edge or got skipped because it would overflow.
  // Per-cell borders alone left the bottom edge open whenever the rect
  // was taller than the rendered rows.
  //
  // #76 follow-up: when `fitToContent` is enabled (the default for new
  // templates), end the perimeter at the last rendered row instead of
  // `field.height` so short tables don't drag a tall, empty box below
  // the data. `fitToContent === false` preserves the legacy full-rect
  // perimeter.
  const fitToContent = style.fitToContent !== false
  const renderedHeight = Math.max(0, currentY - y)
  const perimeterHeight =
    fitToContent && renderedHeight > 0 ? Math.min(renderedHeight, field.height) : field.height
  drawTablePerimeter(doc, x, y, width, perimeterHeight, style)
}

/**
 * Draw the table's outer perimeter rectangle on top of any rendered rows.
 *
 * Uses `rowStyle.borderColor` / `borderWidth` as the closest proxy for "the
 * table's frame" until an explicit perimeter style lands (#76). When the
 * row border is zero-width, no perimeter is drawn — preserves the
 * borderless look users opt into.
 */
function drawTablePerimeter(
  doc: InstanceType<typeof PDFDocument>,
  x: number,
  y: number,
  width: number,
  height: number,
  style: TableFieldStyle,
): void {
  // #76 follow-up: prefer the explicit table-level border when set; fall
  // back to the legacy row-derived perimeter for templates that predate
  // the `tableBorder` field. Either source can suppress the perimeter
  // with width <= 0 or a null colour.
  const tb = style.tableBorder
  const bw = tb ? tb.width : style.rowStyle.borderWidth
  if (!bw || bw <= 0) return
  const stroke = tb ? tb.color : style.rowStyle.borderColor
  if (!stroke) return
  doc.save()
  doc.lineWidth(bw).strokeColor(stroke)
  doc.rect(x, y, width, height).stroke()
  doc.restore()
}

/** Compute a single-row height from a CellStyle (font-size baseline + padding). */
function cellRowHeight(cs: CellStyle): number {
  return cs.fontSize + cs.paddingTop + cs.paddingBottom
}

function mergeStyle(base: CellStyle, override: Partial<CellStyle> | null): CellStyle {
  if (!override) return base
  return { ...base, ...override }
}

function renderHeaderRow(
  doc: InstanceType<typeof PDFDocument>,
  columns: TableColumn[],
  style: TableFieldStyle,
  startX: number,
  startY: number,
  scaleFactor: number,
): number {
  let colX = startX

  for (const col of columns) {
    const colWidth = col.width * scaleFactor
    const hs = mergeStyle(style.headerStyle, col.headerStyle)
    const rowHeight = cellRowHeight(hs)

    if (hs.backgroundColor) {
      doc.save()
      doc.rect(colX, startY, colWidth, rowHeight).fill(hs.backgroundColor)
      doc.restore()
    }

    if (hs.borderWidth > 0 && hs.borderColor) {
      doc.save()
      doc.lineWidth(hs.borderWidth).strokeColor(hs.borderColor)
      doc.rect(colX, startY, colWidth, rowHeight).stroke()
      doc.restore()
    }

    // Table-header style — same bold/italic + standard-family resolution
    // as body cells. The previous implementation called
    // `doc.font(hs.fontFamily)` directly, which dropped weight + style.
    doc.font(resolvePdfFontName(hs.fontFamily, hs.fontWeight, hs.fontStyle))
    doc.fontSize(hs.fontSize)
    doc.fillColor(hs.color)

    const textX = colX + hs.paddingLeft
    const textY = resolveCellTextY(
      startY,
      rowHeight,
      hs.fontSize,
      hs.paddingTop,
      hs.paddingBottom,
      hs.verticalAlign,
    )
    const textWidth = colWidth - hs.paddingLeft - hs.paddingRight

    // Truncate to the cell box exactly like data cells do — a long
    // column label painted past the column edge (Hard Rule #10).
    const rawLabel = col.label || col.key
    const measured = measureText(doc, rawLabel, hs.fontSize, textWidth, 1)
    const headerLabel = measured.fits
      ? rawLabel
      : (truncateLines(doc, measured.lines, 1, textWidth)[0] ?? '')
    doc.text(headerLabel, textX, textY, {
      width: textWidth,
      align: hs.align,
      lineBreak: false,
    })
    paintTextDecoration(doc, headerLabel, hs.textDecoration, {
      x: textX,
      y: textY,
      width: textWidth,
      align: hs.align,
      fontSize: hs.fontSize,
      color: hs.color,
    })

    colX += colWidth
  }

  return startY + cellRowHeight(style.headerStyle)
}

function renderDataRow(
  doc: InstanceType<typeof PDFDocument>,
  columns: TableColumn[],
  row: TableRow,
  style: TableFieldStyle,
  startX: number,
  startY: number,
  scaleFactor: number,
  rowIndex: number,
): number {
  // Zebra striping: 1-based odd rows (1st, 3rd, …) take `oddRowStyle`, even
  // rows `evenRowStyle`, each merged OVER `rowStyle` (so they need only
  // override what differs, typically `backgroundColor`). Row HEIGHT stays
  // based on `rowStyle` so the pagination math (`dataRowHeight`) is
  // unaffected. `null` zebra styles fall straight through to `rowStyle`.
  const zebra = rowIndex % 2 === 0 ? style.oddRowStyle : style.evenRowStyle
  const rowBase = mergeStyle(style.rowStyle, zebra)
  const rowHeight = cellRowHeight(style.rowStyle)
  let colX = startX

  for (const col of columns) {
    const colWidth = col.width * scaleFactor
    const rs = mergeStyle(rowBase, col.style)
    const cellValue = row[col.key] ?? ''

    if (rs.backgroundColor) {
      doc.save()
      doc.rect(colX, startY, colWidth, rowHeight).fill(rs.backgroundColor)
      doc.restore()
    }

    if (rs.borderWidth > 0 && rs.borderColor) {
      doc.save()
      doc.lineWidth(rs.borderWidth).strokeColor(rs.borderColor)
      doc.rect(colX, startY, colWidth, rowHeight).stroke()
      doc.restore()
    }

    // Honour both fontWeight + fontStyle across the four PDF Standard
    // face variants. Body cells don't currently bind a `fontId` so the
    // custom-font branch is skipped here; a follow-up can pipe the
    // template's font map through if per-column custom fonts ship.
    const fontName = resolvePdfFontName(rs.fontFamily, rs.fontWeight, rs.fontStyle)
    doc.font(fontName)
    doc.fontSize(rs.fontSize)
    doc.fillColor(rs.color)

    const textX = colX + rs.paddingLeft
    const textY = resolveCellTextY(
      startY,
      rowHeight,
      rs.fontSize,
      rs.paddingTop,
      rs.paddingBottom,
      rs.verticalAlign,
    )
    const textWidth = colWidth - rs.paddingLeft - rs.paddingRight
    const maxTextRows = 1

    if (style.cellStyle.overflowMode === 'dynamic_font') {
      let currentSize = rs.fontSize
      let result = measureText(doc, cellValue, currentSize, textWidth, maxTextRows)
      const minSize = Math.max(1, currentSize - 6)
      while (!result.fits && currentSize > minSize) {
        currentSize -= 1
        doc.fontSize(currentSize)
        result = measureText(doc, cellValue, currentSize, textWidth, maxTextRows)
      }
      if (!result.fits) {
        const truncated = truncateLines(doc, result.lines, maxTextRows, textWidth)
        doc.text(truncated[0] ?? '', textX, textY, {
          width: textWidth,
          align: rs.align,
          lineBreak: false,
        })
      } else {
        doc.text(result.lines[0] ?? '', textX, textY, {
          width: textWidth,
          align: rs.align,
          lineBreak: false,
        })
      }
    } else {
      const result = measureText(doc, cellValue, rs.fontSize, textWidth, maxTextRows)
      if (!result.fits) {
        const truncated = truncateLines(doc, result.lines, maxTextRows, textWidth)
        doc.text(truncated[0] ?? '', textX, textY, {
          width: textWidth,
          align: rs.align,
          lineBreak: false,
        })
      } else {
        doc.text(cellValue, textX, textY, { width: textWidth, align: rs.align, lineBreak: false })
      }
    }

    // Underline + line-through via the shared helper so both
    // decorations track across cell wrapping / alignment.
    paintTextDecoration(doc, cellValue, rs.textDecoration, {
      x: textX,
      y: textY,
      width: textWidth,
      align: rs.align,
      fontSize: rs.fontSize,
      color: rs.color,
    })

    colX += colWidth
  }

  return startY + rowHeight
}
