import type { FieldDefinition, TextFieldStyle, LoopFieldStyle } from '@template-goblin/types'

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
    loops: Record<string, Record<string, string>[]>
    images: Record<string, string | null>
  },
): Promise<Blob> {
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
        if (value) fieldsHtml += renderTextHtml(field, value)
        break
      }
      case 'loop': {
        const rows = category === 'loops' ? (data.loops[name] ?? []) : []
        if (rows.length > 0) fieldsHtml += renderLoopHtml(field, rows)
        break
      }
      case 'image': {
        fieldsHtml += renderImageHtml(field)
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

function renderTextHtml(field: FieldDefinition, value: string): string {
  const s = field.style as TextFieldStyle
  const css = `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;font-family:${sc(s.fontFamily || 'Helvetica')},sans-serif;font-size:${s.fontSize}pt;font-weight:${s.fontWeight || 'normal'};font-style:${s.fontStyle || 'normal'};color:${sc(s.color || '#000')};text-align:${s.align || 'left'};line-height:${s.lineHeight || 1.2};text-decoration:${s.textDecoration === 'underline' ? 'underline' : 'none'};display:flex;align-items:${s.verticalAlign === 'middle' ? 'center' : s.verticalAlign === 'bottom' ? 'flex-end' : 'flex-start'}`
  return `<div class="f" style="${css}"><span style="width:100%">${esc(value)}</span></div>`
}

function renderLoopHtml(field: FieldDefinition, rows: Record<string, string>[]): string {
  const s = field.style as LoopFieldStyle
  const cols = s.columns || []
  if (cols.length === 0) return ''

  const hs = s.headerStyle
  const rs = s.rowStyle
  const cs = s.cellStyle
  const bw = cs?.borderWidth ?? 1
  const bc = sc(cs?.borderColor || '#000')
  const pt = cs?.paddingTop ?? 4
  const pr = cs?.paddingRight ?? 6
  const pb = cs?.paddingBottom ?? 4
  const pl = cs?.paddingLeft ?? 6

  const hdr = cols
    .map(
      (c) =>
        `<th style="padding:${pt}pt ${pr}pt ${pb}pt ${pl}pt;background:${sc(hs?.backgroundColor || '#f0f0f0')};color:${sc(hs?.color || '#000')};font-size:${hs?.fontSize ?? 10}pt;font-weight:${hs?.fontWeight || 'bold'};text-align:${sc(hs?.align || 'center')};border:${bw}pt solid ${bc};width:${c.width}pt">${esc(c.label || c.key)}</th>`,
    )
    .join('')

  const body = rows
    .map(
      (row) =>
        '<tr>' +
        cols
          .map(
            (c) =>
              `<td style="padding:${pt}pt ${pr}pt ${pb}pt ${pl}pt;font-size:${rs?.fontSize ?? 10}pt;color:${sc(rs?.color || '#000')};font-weight:${rs?.fontWeight || 'normal'};text-align:${sc(c.align || 'left')};border:${bw}pt solid ${bc}">${esc(row[c.key] ?? '')}</td>`,
          )
          .join('') +
        '</tr>',
    )
    .join('')

  return `<div class="f" style="left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt"><table><thead><tr>${hdr}</tr></thead><tbody>${body}</tbody></table></div>`
}

function renderImageHtml(field: FieldDefinition): string {
  return `<div class="f" style="left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;border:1px dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;font-size:9pt;background:rgba(0,0,0,0.03)">[${esc(field.jsonKey)}]</div>`
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
