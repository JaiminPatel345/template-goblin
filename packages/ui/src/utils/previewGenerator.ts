import type { FieldDefinition, TextFieldStyle, LoopFieldStyle } from '@template-goblin/types'
import { generateExampleJson } from './jsonGenerator.js'
import type { JsonPreviewMode } from '../store/uiStore.js'

/**
 * Generate a WYSIWYG preview as an HTML Blob.
 * Renders fields at their exact canvas positions over the background image.
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

  // Show all field outlines even if empty (so user can see layout)
  let outlineHtml = ''
  for (const field of sorted) {
    const typeColors: Record<string, string> = {
      text: 'rgba(37,99,235,0.3)',
      image: 'rgba(22,163,74,0.3)',
      loop: 'rgba(217,119,6,0.3)',
    }
    const borderColors: Record<string, string> = {
      text: '#60a5fa',
      image: '#4ade80',
      loop: '#fb923c',
    }
    outlineHtml += `<div style="position:absolute;left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;border:1px dashed ${borderColors[field.type] ?? '#999'};background:${typeColors[field.type] ?? 'transparent'};pointer-events:none;border-radius:2px"></div>`
  }

  const html = `<!DOCTYPE html>
<html><head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: ${meta.width}pt;
    height: ${meta.height}pt;
    position: relative;
    overflow: hidden;
    font-family: Helvetica, Arial, sans-serif;
    background: #fff;
  }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
  .field { position: absolute; overflow: hidden; }
  .outline-layer { position: absolute; inset: 0; pointer-events: none; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; }
  .label {
    position: absolute; bottom: 2pt; right: 4pt;
    font-size: 7pt; color: rgba(0,0,0,0.4);
    font-family: sans-serif;
  }
</style>
</head>
<body>
  ${backgroundDataUrl ? `<img class="bg" src="${backgroundDataUrl}" />` : ''}
  <div class="outline-layer">${outlineHtml}</div>
  ${fieldsHtml}
</body></html>`

  return new Blob([html], { type: 'text/html' })
}

function renderTextHtml(field: FieldDefinition, value: string): string {
  const style = field.style as TextFieldStyle
  if (!value && !field.placeholder) return ''

  const displayValue = value || field.placeholder || ''
  const opacity = value ? '1' : '0.4'

  const css = [
    `left:${field.x}pt`,
    `top:${field.y}pt`,
    `width:${field.width}pt`,
    `height:${field.height}pt`,
    `font-family:${sanitizeCss(style.fontFamily || 'Helvetica')},sans-serif`,
    `font-size:${style.fontSize}pt`,
    `font-weight:${style.fontWeight || 'normal'}`,
    `font-style:${style.fontStyle || 'normal'}`,
    `color:${sanitizeCss(style.color || '#000')}`,
    `text-align:${style.align || 'left'}`,
    `line-height:${style.lineHeight || 1.2}`,
    `text-decoration:${style.textDecoration === 'underline' ? 'underline' : 'none'}`,
    `display:flex`,
    `opacity:${opacity}`,
    `align-items:${style.verticalAlign === 'middle' ? 'center' : style.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'}`,
  ].join(';')

  return `<div class="field" style="${css}"><span>${escapeHtml(displayValue)}</span></div>`
}

function renderLoopHtml(field: FieldDefinition, rows: Record<string, string>[]): string {
  const style = field.style as LoopFieldStyle
  const columns = style.columns || []
  if (columns.length === 0) {
    return `<div class="field" style="left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;display:flex;align-items:center;justify-content:center;color:#999;font-size:10pt;border:1px dashed #fb923c">[Table: ${escapeHtml(field.jsonKey)} — add columns]</div>`
  }

  const hs = style.headerStyle
  const rs = style.rowStyle
  const cs = style.cellStyle

  const headerCells = columns
    .map(
      (col) =>
        `<th style="padding:${cs?.paddingTop ?? 4}pt ${cs?.paddingRight ?? 6}pt ${cs?.paddingBottom ?? 4}pt ${cs?.paddingLeft ?? 6}pt;background:${sanitizeCss(hs?.backgroundColor || '#f0f0f0')};color:${sanitizeCss(hs?.color || '#000')};font-size:${hs?.fontSize ?? 10}pt;font-weight:${hs?.fontWeight || 'bold'};text-align:${sanitizeCss(hs?.align || 'center')};border:${cs?.borderWidth ?? 1}pt solid ${sanitizeCss(cs?.borderColor || '#000')};width:${col.width}pt">${escapeHtml(col.label || col.key)}</th>`,
    )
    .join('')

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map(
          (col) =>
            `<td style="padding:${cs?.paddingTop ?? 4}pt ${cs?.paddingRight ?? 6}pt ${cs?.paddingBottom ?? 4}pt ${cs?.paddingLeft ?? 6}pt;font-size:${rs?.fontSize ?? 10}pt;color:${sanitizeCss(rs?.color || '#000')};font-weight:${rs?.fontWeight || 'normal'};text-align:${sanitizeCss(col.align || 'left')};border:${cs?.borderWidth ?? 1}pt solid ${sanitizeCss(cs?.borderColor || '#000')}">${escapeHtml(row[col.key] ?? '')}</td>`,
        )
        .join('')
      return `<tr>${cells}</tr>`
    })
    .join('')

  const css = `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt`

  return `<div class="field" style="${css}"><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`
}

function renderImageHtml(field: FieldDefinition): string {
  const css = `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;border:1px dashed #4ade80;display:flex;align-items:center;justify-content:center;color:#4ade80;font-size:9pt;background:rgba(22,163,74,0.1)`
  return `<div class="field" style="${css}">[Image: ${escapeHtml(field.jsonKey)}]</div>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function sanitizeCss(value: unknown): string {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return '0'
  if (/^[a-zA-Z0-9#.,\s%-]+$/.test(value)) return value
  return '0'
}
