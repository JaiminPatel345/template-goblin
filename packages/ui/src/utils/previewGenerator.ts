import type { FieldDefinition, TextField, TableField } from '@template-goblin/types'

/**
 * Options for the preview's page-1 background. Callers pass either a
 * `backgroundDataUrl` (image) OR a `backgroundColor` (hex, e.g. `#ffffff`).
 * If both are supplied the image wins. If neither, the page renders white.
 */
export interface PreviewBackgroundOptions {
  backgroundColor?: string | null
  /**
   * Map of `filename → dataUrl` for image fields. Used to render real
   * bitmaps for static images and dynamic-image placeholders. Caller
   * builds this from the store's `staticImageDataUrls` plus a derived
   * `placeholderBuffers → dataUrl` mapping.
   */
  imageDataUrls?: Map<string, string>
}

/**
 * Generate a PDF-accurate preview as an HTML page.
 *
 * Renders text at exact positions with correct fonts/sizes/colors,
 * tables with headers/rows/borders, and images (when supplied) — all
 * positioned absolutely over the background. The user can print this
 * page (Ctrl+P) to get an actual PDF.
 *
 * GH #44 fixes vs the previous implementation:
 * - Static text with `style.fontSizeDynamic` auto-fits to its rect using
 *   the same `fitFontSize` algorithm the canvas uses, so a title set at
 *   71pt no longer overflows the rect when the rect is smaller than the
 *   text would naturally need.
 * - Text fields with `overflowMode: 'truncate'` get `text-overflow: ellipsis`
 *   so single-line cut-off doesn't leak content past the rect.
 * - Table rows are clipped to `style.maxRows`, matching the SDK's behaviour.
 * - Images render as actual bitmaps when `options.imageDataUrls` resolves
 *   the filename. Falls back to a labelled placeholder rect when no
 *   bitmap is available (mirrors the on-canvas placeholder appearance).
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
  options: PreviewBackgroundOptions = {},
): Promise<Blob> {
  const sorted = [...fields].sort((a, b) => a.zIndex - b.zIndex)
  const imageDataUrls = options.imageDataUrls ?? new Map<string, string>()
  let fieldsHtml = ''

  for (const field of sorted) {
    // Defence in depth: skip fields that are missing `source` (corrupt
    // rehydrated state). These can't be rendered because they have no
    // addressable value.
    if (!field.source) {
      console.warn('[previewGenerator] skipping field with missing source:', field.id)
      continue
    }
    // Static fields render the baked-in `source.value`; dynamic fields render
    // the supplied preview input data, falling back to `source.placeholder`
    // when no input is provided. Matches design §8.3 canvas/preview semantics.
    if (field.source.mode === 'static') {
      switch (field.type) {
        case 'text': {
          const value = (field.source as { mode: 'static'; value: string }).value
          if (value) fieldsHtml += renderTextHtml(field, value)
          break
        }
        case 'table': {
          const rows = (field.source as { mode: 'static'; value: Record<string, string>[] }).value
          if (rows && rows.length > 0) fieldsHtml += renderTableHtml(field, rows)
          break
        }
        case 'image': {
          const filename = (field.source as { mode: 'static'; value: { filename: string } }).value
            ?.filename
          fieldsHtml += renderImageHtml(field, filename || field.id, imageDataUrls)
          break
        }
      }
      continue
    }

    // Dynamic field
    const name = field.source.jsonKey
    if (!name) continue

    switch (field.type) {
      case 'text': {
        const supplied = data.texts[name]
        const placeholder = (field.source as { placeholder: string | null }).placeholder
        const value = supplied && supplied.length > 0 ? supplied : (placeholder ?? '')
        if (value) fieldsHtml += renderTextHtml(field, value)
        break
      }
      case 'table': {
        const supplied = data.tables[name]
        const placeholder = (field.source as { placeholder: Record<string, string>[] | null })
          .placeholder
        const rows = supplied && supplied.length > 0 ? supplied : (placeholder ?? [])
        if (rows.length > 0) fieldsHtml += renderTableHtml(field, rows)
        break
      }
      case 'image': {
        const placeholder = (field.source as { placeholder: { filename: string } | null })
          .placeholder
        const filename = placeholder?.filename ?? name
        fieldsHtml += renderImageHtml(field, filename, imageDataUrls)
        break
      }
    }
  }

  // Body background: solid hex (if supplied) falls through when no image is
  // present so the printed page shows the right color. When an image IS
  // supplied, it still overlays via the `.bg` <img>.
  const bodyBg = sc(options.backgroundColor ?? '#ffffff')

  const html = `<!DOCTYPE html>
<html><head>
<title>${esc(meta.name)} — Preview</title>
<style>
  @page { size: ${meta.width}pt ${meta.height}pt; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${meta.width}pt; height: ${meta.height}pt; }
  body { position: relative; overflow: hidden; font-family: Helvetica, Arial, sans-serif; background: ${bodyBg}; }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
  .f { position: absolute; overflow: hidden; }
  .f-img { position: absolute; overflow: hidden; }
  .f-img img { width: 100%; height: 100%; }
  .f-truncate { white-space: nowrap; text-overflow: ellipsis; }
  .f-truncate > span { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { word-wrap: break-word; overflow: hidden; }
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

// ─── Text rendering ─────────────────────────────────────────────────────────

function renderTextHtml(field: TextField, value: string): string {
  const s = field.style
  const fontFamily = s.fontFamily || 'Helvetica'
  // Effective font size: when `fontSizeDynamic` is set OR the declared size
  // would overflow the rect at single-line/wrapped layout, shrink to the
  // largest size that fits. This is the canvas's `fitFontSize` ported into
  // the preview path (#44) so the printed PDF looks like what the user
  // sees on the canvas.
  const declared = typeof s.fontSize === 'number' && s.fontSize > 0 ? s.fontSize : 12
  const innerPad = 2
  const labelW = Math.max(1, field.width - innerPad * 2)
  const labelH = Math.max(1, field.height - innerPad * 2)
  const fitted = fitFontSize(value, labelW, labelH, fontFamily, s.lineHeight || 1.2)
  // Honour the declared size only when it actually fits; otherwise clamp.
  // `fontSizeDynamic` is a hint that the canvas was already auto-fitting,
  // so the right size to print is the fitted one regardless.
  const fontSize = s.fontSizeDynamic ? fitted : Math.min(declared, fitted)

  const truncate = s.overflowMode === 'truncate'
  const cls = `f${truncate ? ' f-truncate' : ''}`
  const css =
    `left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt;` +
    `padding:${innerPad}pt;` +
    `font-family:${sc(fontFamily)},sans-serif;font-size:${fontSize}pt;` +
    `font-weight:${s.fontWeight || 'normal'};font-style:${s.fontStyle || 'normal'};` +
    `color:${sc(s.color || '#000')};text-align:${s.align || 'left'};` +
    `line-height:${s.lineHeight || 1.2};` +
    `text-decoration:${
      s.textDecoration === 'underline'
        ? 'underline'
        : s.textDecoration === 'line-through'
          ? 'line-through'
          : 'none'
    };` +
    `display:flex;align-items:${
      s.verticalAlign === 'middle'
        ? 'center'
        : s.verticalAlign === 'bottom'
          ? 'flex-end'
          : 'flex-start'
    };justify-content:${
      s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start'
    }`
  return `<div class="${cls}" style="${css}"><span style="width:100%">${esc(value)}</span></div>`
}

// ─── Table rendering ────────────────────────────────────────────────────────

function renderTableHtml(field: TableField, rows: Record<string, string>[]): string {
  const s = field.style
  const cols = s.columns || []
  if (cols.length === 0) return ''

  // Clip rows to maxRows the same way the SDK does (#44). Without this,
  // a 50-row payload renders in a 10-row rect and silently overflows the
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
            const align = sc(c.style?.align ?? rs.align ?? 'left')
            return `<td style="padding:${rowPt}pt ${rowPr}pt ${rowPb}pt ${rowPl}pt;font-size:${fontSize}pt;color:${color};font-weight:${fontWeight};text-align:${align};border:${bw}pt solid ${bc};width:${c.width}pt">${esc(row[c.key] ?? '')}</td>`
          })
          .join('') +
        '</tr>',
    )
    .join('')

  const headHtml = showHeader ? `<thead><tr>${hdr}</tr></thead>` : ''
  return `<div class="f" style="left:${field.x}pt;top:${field.y}pt;width:${field.width}pt;height:${field.height}pt"><table>${headHtml}<tbody>${body}</tbody></table></div>`
}

// ─── Image rendering ────────────────────────────────────────────────────────

function renderImageHtml(
  field: FieldDefinition,
  filenameOrLabel: string,
  imageDataUrls: Map<string, string>,
): string {
  // Look up the bitmap by filename (#44). When the resolver doesn't have
  // an entry — e.g. dynamic image with no upload supplied yet — fall back
  // to a labelled placeholder so the user can still see where the image
  // belongs.
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

// ─── Auto-fit text helper ───────────────────────────────────────────────────

/**
 * Cached 2D context for measuring text. Reused across all `fitFontSize` calls
 * because creating a fresh canvas per call would dominate preview generation
 * time on templates with many text fields.
 */
let _measureCtx: CanvasRenderingContext2D | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (_measureCtx) return _measureCtx
  const cv = document.createElement('canvas')
  _measureCtx = cv.getContext('2d')
  return _measureCtx
}

/**
 * Fit font size to a bounding rect using greedy word-wrap and binary search.
 * Returns the largest integer size in `[6, min(rectHeight*0.9, 200)]` such
 * that the wrapped text fits within `rectWidth × rectHeight`.
 *
 * Mirrors `fitFontSize` in `Canvas/fabricUtils.ts` so the preview matches
 * the canvas. Pulling the canvas helper directly would force the preview
 * module to import Fabric.js, which is undesirable.
 */
function fitFontSize(
  text: string,
  rectWidth: number,
  rectHeight: number,
  fontFamily: string,
  lineHeightFactor: number,
): number {
  if (!text || rectWidth <= 0 || rectHeight <= 0) return 6
  const ctx = getMeasureCtx()
  if (!ctx) return Math.max(6, Math.min(200, Math.floor(rectHeight * 0.7)))

  const upper = Math.max(6, Math.min(200, Math.floor(rectHeight * 0.9)))
  let lo = 6
  let hi = upper
  let best = 6
  const lh = lineHeightFactor > 0 ? lineHeightFactor : 1.2

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    ctx.font = `${mid}px ${fontFamily}`
    const lines = wrapToLines(ctx, text, rectWidth)
    const totalH = lines.length * mid * lh
    const maxW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
    if (maxW <= rectWidth && totalH <= rectHeight) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}

function wrapToLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text]
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (ctx.measureText(test).width <= maxWidth || current === '') {
      current = test
    } else {
      lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
}

// ─── Escape helpers ─────────────────────────────────────────────────────────

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
