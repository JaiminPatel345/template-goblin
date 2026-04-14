import type PDFDocument from 'pdfkit'
import type {
  FieldDefinition,
  LoopFieldStyle,
  LoopRow,
  TemplateMeta,
  LoopColumn,
} from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { renderBackground } from './background.js'
import { measureText, truncateLines } from '../utils/measure.js'

/**
 * Render a loop/table field onto a PDFKit document.
 *
 * Handles header rendering, data rows with column styles, cell borders/padding,
 * and multi-page overflow.
 *
 * @param doc - PDFKit document
 * @param field - Field definition with loop style
 * @param loopData - Array of row objects
 * @param fonts - Map of fontId → registered font name
 * @param meta - Template metadata (for multi-page background re-rendering)
 * @param backgroundImage - Background image buffer for multi-page re-rendering
 */
export function renderLoop(
  doc: InstanceType<typeof PDFDocument>,
  field: FieldDefinition,
  loopData: LoopRow[],
  fonts: Map<string, string>,
  meta: TemplateMeta,
  backgroundImage: Buffer | null,
): void {
  const style = field.style as LoopFieldStyle
  const { x, y, width } = field
  const columns = style.columns

  // Calculate column widths — use defined widths, or distribute evenly
  const totalDefinedWidth = columns.reduce((sum, col) => sum + col.width, 0)
  const scaleFactor = totalDefinedWidth > 0 ? width / totalDefinedWidth : 1

  const dataRowHeight = calculateRowHeight(
    style.rowStyle.fontSize,
    style.rowStyle.lineHeight,
    style,
  )

  let currentY = y
  let currentPage = 1
  let rowIndex = 0

  // REQ: Render header row first
  currentY = renderHeaderRow(doc, columns, style, x, currentY, scaleFactor)

  // REQ: Render data rows
  while (rowIndex < loopData.length) {
    const row = loopData[rowIndex]
    if (!row) {
      rowIndex++
      continue
    }

    // Check if this row fits on the current page
    const pageBottom = y + field.height
    if (currentY + dataRowHeight > pageBottom) {
      if (!style.multiPage) {
        // Single page — stop rendering
        break
      }

      // REQ: Multi-page — check maxPages limit
      currentPage++
      if (currentPage > meta.maxPages) {
        throw new TemplateGoblinError(
          'MAX_PAGES_EXCEEDED',
          `Table "${field.jsonKey}" requires ${currentPage} pages but maxPages is ${meta.maxPages}`,
        )
      }

      // REQ: Add new page, re-render background
      doc.addPage({ size: [meta.width, meta.height] })
      renderBackground(doc, backgroundImage, meta)

      // REQ: Re-render header on new page
      currentY = y
      currentY = renderHeaderRow(doc, columns, style, x, currentY, scaleFactor)
    }

    // Render data row
    currentY = renderDataRow(doc, columns, row, style, x, currentY, scaleFactor, fonts)
    rowIndex++
  }
}

/**
 * Render the header row of a table.
 */
function renderHeaderRow(
  doc: InstanceType<typeof PDFDocument>,
  columns: LoopColumn[],
  style: LoopFieldStyle,
  startX: number,
  startY: number,
  scaleFactor: number,
): number {
  const hs = style.headerStyle
  const cs = style.cellStyle
  const rowHeight = calculateRowHeight(hs.fontSize, style.rowStyle.lineHeight, style)

  let colX = startX

  for (const col of columns) {
    const colWidth = col.width * scaleFactor

    // REQ: Header background color
    if (hs.backgroundColor) {
      doc.save()
      doc.rect(colX, startY, colWidth, rowHeight).fill(hs.backgroundColor)
      doc.restore()
    }

    // REQ: Cell borders
    if (cs.borderWidth > 0) {
      doc.save()
      doc.lineWidth(cs.borderWidth).strokeColor(cs.borderColor)
      doc.rect(colX, startY, colWidth, rowHeight).stroke()
      doc.restore()
    }

    // Header text
    doc.font(hs.fontFamily ?? 'Helvetica')
    doc.fontSize(hs.fontSize)
    doc.fillColor(hs.color)

    const textX = colX + cs.paddingLeft
    const textY = startY + cs.paddingTop
    const textWidth = colWidth - cs.paddingLeft - cs.paddingRight

    doc.text(col.label || col.key, textX, textY, {
      width: textWidth,
      align: hs.align,
      lineBreak: false,
    })

    colX += colWidth
  }

  return startY + rowHeight
}

/**
 * Render a single data row of the table.
 */
function renderDataRow(
  doc: InstanceType<typeof PDFDocument>,
  columns: LoopColumn[],
  row: LoopRow,
  style: LoopFieldStyle,
  startX: number,
  startY: number,
  scaleFactor: number,
  _fonts: Map<string, string>,
): number {
  const rs = style.rowStyle
  const cs = style.cellStyle
  const rowHeight = calculateRowHeight(rs.fontSize, rs.lineHeight, style)

  let colX = startX

  for (const col of columns) {
    const colWidth = col.width * scaleFactor
    const cellValue = row[col.key] ?? ''

    // REQ: Cell borders
    if (cs.borderWidth > 0) {
      doc.save()
      doc.lineWidth(cs.borderWidth).strokeColor(cs.borderColor)
      doc.rect(colX, startY, colWidth, rowHeight).stroke()
      doc.restore()
    }

    // REQ: Column style overrides for fontSize, fontWeight, color, textDecoration
    const fontSize = col.style?.fontSize ?? rs.fontSize
    const fontWeight = col.style?.fontWeight ?? rs.fontWeight
    const color = col.style?.color ?? rs.color
    const align = col.align ?? 'left'

    // Set font based on weight
    const fontFamily = rs.fontFamily ?? 'Helvetica'
    const fontName = fontWeight === 'bold' ? `${fontFamily}-Bold` : fontFamily
    doc.font(fontName)
    doc.fontSize(fontSize)
    doc.fillColor(color)

    const textX = colX + cs.paddingLeft
    const textY = startY + cs.paddingTop
    const textWidth = colWidth - cs.paddingLeft - cs.paddingRight
    const maxTextRows = 1 // Each cell is typically single-line in tables

    // REQ: Per-cell overflow handling using same logic as text fields
    if (rs.overflowMode === 'dynamic_font' && rs.fontSizeDynamic) {
      let currentSize = fontSize
      let result = measureText(doc, cellValue, currentSize, textWidth, maxTextRows)
      while (!result.fits && currentSize > rs.fontSizeMin) {
        currentSize -= 1
        doc.fontSize(currentSize)
        result = measureText(doc, cellValue, currentSize, textWidth, maxTextRows)
      }
      if (!result.fits) {
        const truncated = truncateLines(doc, result.lines, maxTextRows, textWidth)
        doc.text(truncated[0] ?? '', textX, textY, { width: textWidth, align, lineBreak: false })
      } else {
        doc.text(result.lines[0] ?? '', textX, textY, { width: textWidth, align, lineBreak: false })
      }
    } else {
      const result = measureText(doc, cellValue, fontSize, textWidth, maxTextRows)
      if (!result.fits) {
        const truncated = truncateLines(doc, result.lines, maxTextRows, textWidth)
        doc.text(truncated[0] ?? '', textX, textY, { width: textWidth, align, lineBreak: false })
      } else {
        doc.text(cellValue, textX, textY, { width: textWidth, align, lineBreak: false })
      }
    }

    // REQ: Text decoration (underline)
    if (col.style?.textDecoration === 'underline') {
      const textWidthActual = doc.widthOfString(cellValue)
      doc.save()
      doc.strokeColor(color)
      doc.lineWidth(0.5)
      doc
        .moveTo(textX, textY + fontSize + 1)
        .lineTo(textX + Math.min(textWidthActual, textWidth), textY + fontSize + 1)
        .stroke()
      doc.restore()
    }

    colX += colWidth
  }

  return startY + rowHeight
}

/**
 * Calculate row height based on font size, line height, and cell padding.
 */
function calculateRowHeight(fontSize: number, lineHeight: number, style: LoopFieldStyle): number {
  const cs = style.cellStyle
  return fontSize * lineHeight + cs.paddingTop + cs.paddingBottom
}
