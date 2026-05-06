/**
 * Per-field HTML emitters for the preview generator. Splitting each render
 * concern into its own function (and this file out of the orchestrator)
 * keeps `previewGenerator.ts` under the 300-line cap (CLAUDE.md Hard Rule
 * #11) and makes individual renderers independently testable.
 */
import type { FieldDefinition, TextField, TableField } from '@template-goblin/types'
import { esc, sc } from './previewEscape.js'
import { fitFontSize } from './previewFitFontSize.js'

/**
 * Render a text field as an absolutely-positioned `<div>`. Honours
 * `fontSizeDynamic` (auto-fit), `overflowMode: 'truncate'` (single-line
 * ellipsis), and the full set of typography style properties.
 */
export function renderTextHtml(field: TextField, value: string): string {
  const s = field.style
  const fontFamily = s.fontFamily || 'Helvetica'
  // Effective font size: when `fontSizeDynamic` is set OR the declared
  // size would overflow the rect at single-line/wrapped layout, shrink to
  // the largest size that fits. Mirrors the canvas's `fitFontSize` so the
  // printed PDF looks like what the user sees on the canvas (#44).
  const declared = typeof s.fontSize === 'number' && s.fontSize > 0 ? s.fontSize : 12
  const innerPad = 2
  const labelW = Math.max(1, field.width - innerPad * 2)
  const labelH = Math.max(1, field.height - innerPad * 2)
  const fitted = fitFontSize(value, labelW, labelH, fontFamily, s.lineHeight || 1.2)
  // GH #73: only static text may use the canvas's max-fit preview — the
  // literal `source.value` is what the PDF will print so growing it is
  // honest. Dynamic text is WYSIWYG with the authored `fontSize`; the PDF
  // generator only ever shrinks (never grows), so the preview must too.
  const isDynamicSource = field.source?.mode === 'dynamic'
  const useAutoFit = !isDynamicSource && s.fontSizeDynamic
  const fontSize = useAutoFit ? fitted : Math.min(declared, fitted)

  const truncate = s.overflowMode === 'truncate'
  const cls = `f${truncate ? ' f-truncate' : ''}`
  const css =
    `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;` +
    `padding:${innerPad}pt;` +
    `font-family:${sc(fontFamily)},sans-serif;font-size:${fontSize}pt;` +
    `font-weight:${s.fontWeight || 'normal'};font-style:${s.fontStyle || 'normal'};` +
    `color:${sc(s.color || '#000')};text-align:${s.align || 'center'};` +
    `line-height:${s.lineHeight || 1.2};` +
    `text-decoration:${
      s.textDecoration === 'underline'
        ? 'underline'
        : s.textDecoration === 'line-through'
          ? 'line-through'
          : 'none'
    };` +
    `display:flex;align-items:${
      // Mirror the horizontal-align default — undefined verticalAlign
      // defaults to 'middle' (GH #39), so the flexbox cross-axis
      // alignment matches.
      !s.verticalAlign || s.verticalAlign === 'middle'
        ? 'center'
        : s.verticalAlign === 'bottom'
          ? 'flex-end'
          : 'flex-start'
    };justify-content:${
      // Mirror the `text-align` default — undefined `align` defaults to
      // 'center' (GH #39), so the flexbox justification matches.
      !s.align || s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start'
    }`
  return `<div class="${cls}" style="${css}"><span style="width:100%">${esc(value)}</span></div>`
}

/**
 * Render a table field as `<table>` inside an absolutely-positioned wrapper.
 * Clips rows to `style.maxRows` and skips the header when `showHeader: false`
 * (#44 fixes for both behaviours).
 */
export function renderTableHtml(field: TableField, rows: Record<string, string>[]): string {
  const s = field.style
  const cols = s.columns || []
  if (cols.length === 0) return ''

  // Clip rows to maxRows the same way the SDK does (#44). Without this, a
  // 50-row payload renders in a 10-row rect and silently overflows the
  // page rect — the bug visible in temp/preview.pdf as the table bleeding
  // off the bottom edge.
  const maxRows = s.maxRows && s.maxRows > 0 ? s.maxRows : rows.length
  const limited = rows.slice(0, maxRows)

  const hs = s.headerStyle
  const rs = s.rowStyle

  const showHeader = s.showHeader !== false
  const hdr = showHeader
    ? cols
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
    : ''

  const body = limited
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
            const align = sc(c.style?.align ?? rs.align ?? 'center')
            return `<td style="padding:${rowPt}pt ${rowPr}pt ${rowPb}pt ${rowPl}pt;font-size:${fontSize}pt;color:${color};font-weight:${fontWeight};text-align:${align};border:${bw}pt solid ${bc};width:${c.width}pt">${esc(row[c.key] ?? '')}</td>`
          })
          .join('') +
        '</tr>',
    )
    .join('')

  const headHtml = showHeader ? `<thead><tr>${hdr}</tr></thead>` : ''
  return `<div class="f" style="left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt"><table>${headHtml}<tbody>${body}</tbody></table></div>`
}

/**
 * Render an image field. When `imageDataUrls` resolves the filename we emit
 * an actual `<img>` (real bitmap); otherwise a labelled placeholder rect so
 * the user still sees where the image belongs (#44).
 */
export function renderImageHtml(
  field: FieldDefinition,
  filenameOrLabel: string,
  imageDataUrls: Map<string, string>,
): string {
  const dataUrl = imageDataUrls.get(filenameOrLabel)
  const fit =
    field.type === 'image' && field.style && typeof field.style === 'object'
      ? ((field.style as { fit?: 'fill' | 'contain' | 'cover' }).fit ?? 'contain')
      : 'contain'
  const objectFit = fit === 'fill' ? 'fill' : fit === 'cover' ? 'cover' : 'contain'
  if (dataUrl) {
    const css = `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt`
    return `<div class="f-img" style="${css}"><img src="${dataUrl}" style="object-fit:${objectFit};display:block" /></div>`
  }
  const css = `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;border:1pt dashed #ccc;display:flex;align-items:center;justify-content:center;color:#999;font-size:9pt;background:rgba(0,0,0,0.03)`
  return `<div class="f" style="${css}">[${esc(filenameOrLabel)}]</div>`
}
