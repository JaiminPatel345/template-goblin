import type { FieldDefinition, TextFieldStyle, LoopFieldStyle } from '@template-goblin/types'
import { generateExampleJson } from './jsonGenerator.js'
import type { JsonPreviewMode } from '../store/uiStore.js'

/**
 * Generate a PDF-like preview as an HTML Blob.
 *
 * Renders an HTML document that closely mimics what the PDF would look like,
 * including text fields, loop tables, and image placeholders at their exact
 * positions on the canvas.
 *
 * Note: Actual PDF generation for download uses the Node.js core library (PDFKit).
 * Browser preview uses this HTML approach for compatibility — no Node.js polyfills needed.
 */
export async function generatePreviewHtml(
  fields: FieldDefinition[],
  meta: { name: string; width: number; height: number },
  backgroundDataUrl: string | null,
  mode: JsonPreviewMode,
  repeatCount: number,
): Promise<Blob> {
  const data = generateExampleJson(fields, mode, repeatCount)
  const sorted = [...fields].sort((a, b) => a.zIndex - b.zIndex)

  let fieldsHtml = ''

  for (const field of sorted) {
    const parts = field.jsonKey.split('.')
    const category = parts[0]
    const name = parts.slice(1).join('.')
    if (!name) continue

    switch (field.type) {
      case 'text': {
        const value = category === 'texts' ? (data.texts[name] ?? '') : ''
        fieldsHtml += renderTextHtml(field, value)
        break
      }
      case 'loop': {
        const rows = category === 'loops' ? (data.loops[name] ?? []) : []
        fieldsHtml += renderLoopHtml(field, rows)
        break
      }
      case 'image': {
        fieldsHtml += renderImageHtml(field)
        break
      }
    }
  }

  const html = `<!DOCTYPE html>
<html><head><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${meta.width}pt; height: ${meta.height}pt; position: relative; overflow: hidden; font-family: Helvetica, Arial, sans-serif; }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
  .field { position: absolute; overflow: hidden; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; }
</style></head>
<body>
  ${backgroundDataUrl ? `<img class="bg" src="${backgroundDataUrl}" />` : '<div class="bg" style="background:#fff"></div>'}
  ${fieldsHtml}
</body></html>`

  return new Blob([html], { type: 'text/html' })
}

function renderTextHtml(field: FieldDefinition, value: string): string {
  const style = field.style as TextFieldStyle
  const css = [
    `left:${field.x}pt`,
    `top:${field.y}pt`,
    `width:${field.width}pt`,
    `height:${field.height}pt`,
    `font-family:${style.fontFamily || 'Helvetica'},sans-serif`,
    `font-size:${style.fontSize}pt`,
    `font-weight:${style.fontWeight || 'normal'}`,
    `font-style:${style.fontStyle || 'normal'}`,
    `color:${style.color || '#000'}`,
    `text-align:${style.align || 'left'}`,
    `line-height:${style.lineHeight || 1.2}`,
    `text-decoration:${style.textDecoration === 'underline' ? 'underline' : 'none'}`,
    `display:flex`,
    `align-items:${style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'}`,
  ].join(';')

  return `<div class="field" style="${css}"><span>${escapeHtml(value)}</span></div>`
}

function renderLoopHtml(field: FieldDefinition, rows: Record<string, string>[]): string {
  const style = field.style as LoopFieldStyle
  const columns = style.columns || []
  if (columns.length === 0) return ''

  const hs = style.headerStyle
  const rs = style.rowStyle
  const cs = style.cellStyle

  const headerCells = columns
    .map(
      (col) =>
        `<th style="padding:${cs?.paddingTop ?? 4}pt ${cs?.paddingRight ?? 6}pt ${cs?.paddingBottom ?? 4}pt ${cs?.paddingLeft ?? 6}pt;background:${hs?.backgroundColor || '#f0f0f0'};color:${hs?.color || '#000'};font-size:${hs?.fontSize ?? 10}pt;font-weight:${hs?.fontWeight || 'bold'};text-align:${hs?.align || 'center'};border:${cs?.borderWidth ?? 1}pt solid ${cs?.borderColor || '#000'};width:${col.width}pt">${escapeHtml(col.label || col.key)}</th>`,
    )
    .join('')

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map(
          (col) =>
            `<td style="padding:${cs?.paddingTop ?? 4}pt ${cs?.paddingRight ?? 6}pt ${cs?.paddingBottom ?? 4}pt ${cs?.paddingLeft ?? 6}pt;font-size:${rs?.fontSize ?? 10}pt;color:${rs?.color || '#000'};font-weight:${rs?.fontWeight || 'normal'};text-align:${col.align || 'left'};border:${cs?.borderWidth ?? 1}pt solid ${cs?.borderColor || '#000'}">${escapeHtml(row[col.key] ?? '')}</td>`,
        )
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const css = `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt`

  return `<div class="field" style="${css}"><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`
}

function renderImageHtml(field: FieldDefinition): string {
  const css = `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;border:1px dashed #999;display:flex;align-items:center;justify-content:center;color:#999;font-size:10pt`
  return `<div class="field" style="${css}">[Image: ${field.jsonKey}]</div>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
