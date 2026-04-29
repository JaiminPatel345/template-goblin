import type { PageDefinition, PageSize, TemplateMeta } from './template.js'

/** Standard PDF page-size presets in points (72 dpi). */
export const PAGE_SIZE_PRESETS: Record<
  Exclude<PageSize, 'custom'>,
  { width: number; height: number }
> = {
  A3: { width: 842, height: 1191 },
  A4: { width: 595, height: 842 },
  A5: { width: 420, height: 595 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
}

/**
 * Resolve a page's effective size in points.
 *
 * Pages saved before per-page sizing don't carry `width`/`height` — they
 * inherit the template-level `meta.width`/`meta.height`. New pages always
 * carry their own size; the explicit fields win when present.
 */
export function getPageSize(
  page: Pick<PageDefinition, 'width' | 'height'> | null | undefined,
  meta: Pick<TemplateMeta, 'width' | 'height'>,
): { width: number; height: number } {
  const w = page?.width
  const h = page?.height
  if (typeof w === 'number' && w > 0 && typeof h === 'number' && h > 0) {
    return { width: w, height: h }
  }
  return { width: meta.width, height: meta.height }
}
