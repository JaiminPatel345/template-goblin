import type { FieldDefinition } from '@template-goblin/types'
import { esc, sc } from './previewEscape.js'
import { renderTextHtml, renderTableHtml, renderImageHtml } from './previewFieldRenderers.js'

/**
 * Per-page resolved background and size. Callers pre-resolve `inherit` and
 * the legacy `backgroundDataUrl` into either an image data URL or a solid
 * colour, and resolve per-page width/height (via `getPageSize`) so the
 * preview generator doesn't need to know about resolution rules.
 *
 * `width`/`height` are optional — when omitted the renderer falls back to
 * `meta.width`/`meta.height`. New per-page-sized templates (#46/#47) always
 * include them so each PDF page prints at its own dimensions.
 */
export interface PagePreviewInput {
  /** Stable page id, or `null` for the implicit (legacy) page 0. */
  id: string | null
  /** Solid background colour (hex). Ignored when `imageDataUrl` is set. */
  backgroundColor?: string | null
  /** Background image data URL. Wins over `backgroundColor` when present. */
  backgroundDataUrl?: string | null
  /** Page width in points; falls back to `meta.width` when undefined. */
  width?: number
  /** Page height in points; falls back to `meta.height` when undefined. */
  height?: number
}

/**
 * Options for the preview's page rendering.
 */
export interface PreviewBackgroundOptions {
  /**
   * Map of `filename → dataUrl` for image fields. Used to render real
   * bitmaps for static images and dynamic-image placeholders. Caller
   * builds this from the store's `staticImageDataUrls` plus a derived
   * `placeholderBuffers → dataUrl` mapping.
   */
  imageDataUrls?: Map<string, string>
}

/**
 * Generate a PDF-accurate multi-page preview as an HTML document.
 *
 * Each page is its own `<section class="page">` block sized to
 * `meta.width × meta.height` and separated by `page-break-after: always` so
 * Print → Save as PDF produces one PDF page per template page. Fields are
 * grouped by `pageId`; orphans (`pageId === null` or undefined) land on the
 * page with `index === 0` to match the canvas filter (#37).
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
 *
 * GH #49: multi-page templates print one sheet per page instead of stacking
 * every field on a single sheet.
 */
export async function generatePreviewHtml(
  fields: FieldDefinition[],
  meta: { name: string; width: number; height: number },
  pages: PagePreviewInput[],
  data: {
    texts: Record<string, string>
    tables: Record<string, Record<string, string>[]>
    images: Record<string, string | null>
  },
  options: PreviewBackgroundOptions = {},
): Promise<Blob> {
  const imageDataUrls = options.imageDataUrls ?? new Map<string, string>()
  // Always have at least one page — a template that hasn't been onboarded
  // yet has no `pages[]` entry, but we still want to render its fields on
  // an implicit white page rather than emitting empty HTML.
  const pageList: PagePreviewInput[] =
    pages.length > 0 ? pages : [{ id: null, backgroundColor: '#ffffff' }]

  // GH #37 orphan rule: fields with no `pageId` land on the page that
  // claims the index-0 slot. The first entry of `pageList` is page 1 by
  // construction (caller is responsible for ordering).
  const firstPageId = pageList[0]?.id ?? null

  // Resolve per-page dimensions up front so both the named-@page CSS rules
  // and the per-section inline sizes use the same source of truth. Pages
  // without explicit dimensions inherit `meta` (legacy single-size templates).
  const resolvedSizes = pageList.map((p) => ({
    width: p.width && p.width > 0 ? p.width : meta.width,
    height: p.height && p.height > 0 ? p.height : meta.height,
  }))
  // Each page gets its own named @page rule so Print → Save as PDF emits
  // sheets at the right size when pages mix dimensions (#46/#47). Chrome
  // honours `@page name { size: ... }`; the `.page-N` class points the
  // matching `<section>` at it via the `page` CSS property.
  const pageRules = resolvedSizes
    .map(
      (sz, i) =>
        `@page page${i} { size: ${sz.width}pt ${sz.height}pt; margin: 0; }\n  .page-${i} { page: page${i}; }`,
    )
    .join('\n  ')

  const pagesHtml = pageList
    .map((page, idx) => {
      // `resolvedSizes` is built from `pageList` so the index is always
      // valid; the fallback to `meta` is defensive only.
      const size = resolvedSizes[idx] ?? { width: meta.width, height: meta.height }
      return renderPageHtml(page, idx, size, fields, data, imageDataUrls, firstPageId)
    })
    .join('')

  const html = `<!DOCTYPE html>
<html><head>
<title>${esc(meta.name)} — Preview</title>
<style>
  ${pageRules}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { font-family: Helvetica, Arial, sans-serif; background: #555; }
  body { padding-top: 48px; }
  .page {
    position: relative;
    margin: 0 auto 16px;
    overflow: hidden;
    background: #ffffff;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; margin-bottom: 0; }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
  .f { position: absolute; overflow: hidden; }
  .f-img { position: absolute; overflow: hidden; }
  .f-img img { width: 100%; height: 100%; }
  .f-truncate { white-space: nowrap; text-overflow: ellipsis; }
  .f-truncate > span { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  td, th { word-wrap: break-word; overflow: hidden; }
  @media print {
    html, body { background: #fff; padding: 0; }
    .page { margin: 0; box-shadow: none; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
  .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #1c1c27; color: #fff; padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; font-family: sans-serif; font-size: 13px; z-index: 1000; }
  .toolbar button { background: #e94560; color: #fff; border: none; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; }
  .toolbar button:hover { background: #ff6b81; }
  @media print { .toolbar { display: none; } }
</style>
</head>
<body>
  <div class="toolbar">
    <span><strong>${esc(meta.name)}</strong> &mdash; ${meta.width} x ${meta.height} pt &mdash; ${pageList.length} page${pageList.length === 1 ? '' : 's'}</span>
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${pagesHtml}
</body></html>`

  return new Blob([html], { type: 'text/html' })
}

function renderPageHtml(
  page: PagePreviewInput,
  pageIndex: number,
  size: { width: number; height: number },
  fields: FieldDefinition[],
  data: {
    texts: Record<string, string>
    tables: Record<string, Record<string, string>[]>
    images: Record<string, string | null>
  },
  imageDataUrls: Map<string, string>,
  firstPageId: string | null,
): string {
  // Page-relative field selection. The first page also picks up orphan
  // fields (pageId == null/undefined) — same rule as the canvas filter
  // post-#37 — so legacy single-page templates keep working. Strict
  // equality on `page.id` is guarded so that a non-first synthetic page
  // with `id: null` (currently unreachable, but defensible) doesn't
  // silently claim orphans that belong to the first page.
  const isFirstPage = pageIndex === 0
  const pageFields = fields
    .filter((f) => {
      if (page.id !== null && f.pageId === page.id) return true
      if (isFirstPage && (f.pageId === null || f.pageId === undefined)) return true
      if (isFirstPage && firstPageId !== null && f.pageId === firstPageId) return true
      return false
    })
    .sort((a, b) => a.zIndex - b.zIndex)

  let fieldsHtml = ''
  for (const field of pageFields) {
    if (!field.source) {
      console.warn('[previewGenerator] skipping field with missing source:', field.id)
      continue
    }
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

  const bodyBg = sc(page.backgroundColor ?? '#ffffff')
  const bgImg = page.backgroundDataUrl ? `<img class="bg" src="${page.backgroundDataUrl}" />` : ''
  const inlineSize = `width:${size.width}pt;height:${size.height}pt;`
  return `<section class="page page-${pageIndex}" style="${inlineSize}background:${bodyBg}">${bgImg}${fieldsHtml}</section>`
}
