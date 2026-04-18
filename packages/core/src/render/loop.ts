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

/**
 * Render a table field onto a PDFKit document.
 *
 * Handles header rendering, data rows with per-column style overrides,
 * cell borders/padding, and multi-page overflow.
 *
 * Note: advanced styling (showHeader, oddRowStyle, evenRowStyle, per-column
 * headerStyle) will be layered in during Phase 3. This version honours the
 * v2.0 shared CellStyle shape and the `Partial<CellStyle>` column override.
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

      doc.addPage({ size: [meta.width, meta.height] })
      renderBackground(doc, backgroundImage, meta)

      currentY = y
      if (style.showHeader !== false) {
        currentY = renderHeaderRow(doc, columns, style, x, currentY, scaleFactor)
      }
    }

    currentY = renderDataRow(doc, columns, row, style, x, currentY, scaleFactor)
    rowIndex++
    void headerRowHeight
  }
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

    if (hs.borderWidth > 0) {
      doc.save()
      doc.lineWidth(hs.borderWidth).strokeColor(hs.borderColor)
      doc.rect(colX, startY, colWidth, rowHeight).stroke()
      doc.restore()
    }

    doc.font(hs.fontFamily || 'Helvetica')
    doc.fontSize(hs.fontSize)
    doc.fillColor(hs.color)

    const textX = colX + hs.paddingLeft
    const textY = startY + hs.paddingTop
    const textWidth = colWidth - hs.paddingLeft - hs.paddingRight

    doc.text(col.label || col.key, textX, textY, {
      width: textWidth,
      align: hs.align,
      lineBreak: false,
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
): number {
  const rowHeight = cellRowHeight(style.rowStyle)
  let colX = startX

  for (const col of columns) {
    const colWidth = col.width * scaleFactor
    const rs = mergeStyle(style.rowStyle, col.style)
    const cellValue = row[col.key] ?? ''

    if (rs.backgroundColor) {
      doc.save()
      doc.rect(colX, startY, colWidth, rowHeight).fill(rs.backgroundColor)
      doc.restore()
    }

    if (rs.borderWidth > 0) {
      doc.save()
      doc.lineWidth(rs.borderWidth).strokeColor(rs.borderColor)
      doc.rect(colX, startY, colWidth, rowHeight).stroke()
      doc.restore()
    }

    const fontFamily = rs.fontFamily || 'Helvetica'
    const fontName = rs.fontWeight === 'bold' ? `${fontFamily}-Bold` : fontFamily
    doc.font(fontName)
    doc.fontSize(rs.fontSize)
    doc.fillColor(rs.color)

    const textX = colX + rs.paddingLeft
    const textY = startY + rs.paddingTop
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

    if (rs.textDecoration === 'underline') {
      const actualWidth = doc.widthOfString(cellValue)
      doc.save()
      doc.strokeColor(rs.color)
      doc.lineWidth(0.5)
      doc
        .moveTo(textX, textY + rs.fontSize + 1)
        .lineTo(textX + Math.min(actualWidth, textWidth), textY + rs.fontSize + 1)
        .stroke()
      doc.restore()
    }

    colX += colWidth
  }

  return startY + rowHeight
}
