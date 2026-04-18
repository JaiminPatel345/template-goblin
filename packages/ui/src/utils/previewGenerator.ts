import type { FieldDefinition, TextField, TableField } from '@template-goblin/types'

/**
 * Generate a PDF-accurate preview as an HTML page.
 *
 * Renders text at exact positions with correct fonts/sizes/colors,
 * tables with headers/rows/borders, and image placeholders —
 * all positioned absolutely over the background image.
 *
 * The user can print this page (Ctrl+P) to get an actual PDF.
 */
export async function generatePreviewHtml(
  fields: FieldDefinition[],
  meta: { name: string; width: number; height: number },
  backgroundDataUrl: string | null,
  data: {
    texts: Record<string, string>
    tables: Record<string, Record<string, string>[]>
    images: Record<string, string | null>
  },
): Promise<Blob> {
  const sorted = [...fields].sort((a, b) => a.zIndex - b.zIndex)
  let fieldsHtml = ''

  for (const field of sorted) {
    // Static fields don't take input from `data` — preview shows the baked-in
    // value. Phase 1 core renders static images; UI static rendering lands in
    // later phases. For now, static fields render as placeholders.
    if (field.source.mode !== 'dynamic') {
      if (field.type === 'image') fieldsHtml += renderImageHtml(field, field.id)
      continue
    }
    const name = field.source.jsonKey
    if (!name) continue

    switch (field.type) {
      case 'text': {
        const value = data.texts[name] ?? ''
        if (value) fieldsHtml += renderTextHtml(field, value)
        break
      }
      case 'table': {
        const rows = data.tables[name] ?? []
        if (rows.length > 0) fieldsHtml += renderTableHtml(field, rows)
        break
      }
      case 'image': {
        fieldsHtml += renderImageHtml(field, name)
        break
      }
    }
  }

  const html = `<!DOCTYPE html>
<html><head>
<title>${esc(meta.name)} — Preview</title>
<style>
  @page { size: ${meta.width}pt ${meta.height}pt; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${meta.width}pt; height: ${meta.height}pt; }
  body { position: relative; overflow: hidden; font-family: Helvetica, Arial, sans-serif; background: #fff; }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
  .f { position: absolute; overflow: hidden; }
  table { border-collapse: collapse; width: 100%; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1c1c27; color: #fff; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; font-family: sans-serif; font-size: 13px; z-index: 1000; }
  .toolbar button { background: #e94560; color: #fff; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
  .toolbar button:hover { background: #ff6b81; }
  @media print { .toolbar { display: none; } }
</style>
</head>
<body>
  <div class="toolbar">
    <span><strong>${esc(meta.name)}</strong> &mdash; ${meta.width} x ${meta.height} pt</span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${backgroundDataUrl ? `<img class="bg" src="${backgroundDataUrl}" />` : ''}
  ${fieldsHtml}
</body></html>`

  return new Blob([html], { type: 'text/html' })
}

function renderTextHtml(field: TextField, value: string): string {
  const s = field.style
  const css = `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;font-family:${sc(s.fontFamily || 'Helvetica')},sans-serif;font-size:${s.fontSize}pt;font-weight:${s.fontWeight || 'normal'};font-style:${s.fontStyle || 'normal'};color:${sc(s.color || '#000')};text-align:${s.align || 'left'};line-height:${s.lineHeight || 1.2};text-decoration:${s.textDecoration === 'underline' ? 'underline' : 'none'};display:flex;align-items:${s.verticalAlign === 'middle' ? 'center' : s.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'}`
  return `<div class="f" style="${css}"><span style="width:100%">${esc(value)}</span></div>`
}

function renderTableHtml(field: TableField, rows: Record<string, string>[]): string {
  const s = field.style
  const cols = s.columns || []
  if (cols.length === 0) return ''

  const hs = s.headerStyle
  const rs = s.rowStyle

  const hdr = cols
    .map((c) => {
      const headerPt = c.headerStyle?.paddingTop ?? hs.paddingTop ?? 4
      const headerPr = c.headerStyle?.paddingRight ?? hs.paddingRight ?? 6
      const headerPb = c.headerStyle?.paddingBottom ?? hs.paddingBottom ?? 4
      const headerPl = c.headerStyle?.paddingLeft ?? hs.paddingLeft ?? 6
      const bw = c.headerStyle?.borderWidth ?? hs.borderWidth ?? 1
      const bc = sc(c.headerStyle?.borderColor ?? hs.borderColor ?? '#000')
      const bg = sc(c.headerStyle?.backgroundColor ?? hs.backgroundColor ?? '#f0f0f0')
      const color = sc(c.headerStyle?.color ?? hs.color ?? '#000')
      const fontSize = c.headerStyle?.fontSize ?? hs.fontSize ?? 10
      const fontWeight = c.headerStyle?.fontWeight ?? hs.fontWeight ?? 'bold'
      const align = sc(c.headerStyle?.align ?? hs.align ?? 'center')
      return `<th style="padding:${headerPt}pt ${headerPr}pt ${headerPb}pt ${headerPl}pt;background:${bg};color:${color};font-size:${fontSize}pt;font-weight:${fontWeight};text-align:${align};border:${bw}pt solid ${bc};width:${c.width}pt">${esc(c.label || c.key)}</th>`
    })
    .join('')

  const body = rows
    .map(
      (row) =>
        '<tr>' +
        cols
          .map((c) => {
            const rowPt = c.style?.paddingTop ?? rs.paddingTop ?? 4
            const rowPr = c.style?.paddingRight ?? rs.paddingRight ?? 6
            const rowPb = c.style?.paddingBottom ?? rs.paddingBottom ?? 4
            const rowPl = c.style?.paddingLeft ?? rs.paddingLeft ?? 6
            const bw = c.style?.borderWidth ?? rs.borderWidth ?? 1
            const bc = sc(c.style?.borderColor ?? rs.borderColor ?? '#000')
            const fontSize = c.style?.fontSize ?? rs.fontSize ?? 10
            const color = sc(c.style?.color ?? rs.color ?? '#000')
            const fontWeight = c.style?.fontWeight ?? rs.fontWeight ?? 'normal'
            const align = sc(c.style?.align ?? rs.align ?? 'left')
            return `<td style="padding:${rowPt}pt ${rowPr}pt ${rowPb}pt ${rowPl}pt;font-size:${fontSize}pt;color:${color};font-weight:${fontWeight};text-align:${align};border:${bw}pt solid ${bc}">${esc(row[c.key] ?? '')}</td>`
          })
          .join('') +
        '</tr>',
    )
    .join('')

  return `<div class="f" style="left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt"><table><thead><tr>${hdr}</tr></thead><tbody>${body}</tbody></table></div>`
}

function renderImageHtml(field: FieldDefinition, label: string): string {
  return `<div class="f" style="left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;font-size:9pt;background:rgba(0,0,0,0.03)">[${esc(label)}]</div>`
}

function esc(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function sc(v: unknown): string {
  if (typeof v === 'number') return String(v)
  if (typeof v !== 'string') return '0'
  return /^[a-zA-Z0-9#.,\s%-]+$/.test(v) ? v : '0'
}
