/**
 * deriveCanvasFields — pure derivation of the field list the Fabric
 * reconciler renders for the current page, plus that page's size.
 *
 * Extracted from `CanvasArea.tsx` (Hard Rule #11) when the floating
 * selection toolbar (#167) pushed the orchestrator over the 300-line cap.
 * Behaviour is byte-for-byte the same as the inline version — it just
 * lives here now so the component stays a slim composition root.
 *
 * Responsibilities:
 *  - Resolve which body fields belong to the current page (the GH #37
 *    inclusive page-1 rule for orphaned `pageId: null` fields).
 *  - Translate enabled header / footer band fields into page coordinates
 *    and tag them with `__bandKind` so the reconciler / drag-commit path
 *    can route them back to the right band (#61).
 *  - Resolve the current page's size for clipping / zoom-fit / clamping.
 */
import { getPageSize } from '@template-goblin/types'
import type {
  FieldDefinition,
  PageBand,
  PageDefinition,
  TemplateMeta,
} from '@template-goblin/types'

/**
 * Translate a band-local field into a page-coord field copy the reconciler
 * can hand to `createFieldGroup` / `applyFieldToGroup` (#61). The original
 * store entry keeps its band-local x/y; the translated copy is renderer-only.
 */
function translateForCanvas(
  f: FieldDefinition,
  offset: { x: number; y: number },
  kind: 'header' | 'footer',
): FieldDefinition & { __bandKind: 'header' | 'footer' } {
  return {
    ...f,
    x: f.x + offset.x,
    y: f.y + offset.y,
    __bandKind: kind,
  } as FieldDefinition & { __bandKind: 'header' | 'footer' }
}

/**
 * Does this band render on the page the user is currently viewing? We
 * mirror the renderer's rule — only page index 0 needs the
 * `applyToFirstPage` check; every later page always renders bands.
 */
function currentPageIndexIsZeroOrApplied(
  currentPageId: string | null,
  pages: PageDefinition[],
  applyToFirstPage: boolean,
): boolean {
  const currentIndex = pages.findIndex((p) => p.id === currentPageId)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  if (safeIndex === 0 && !applyToFirstPage) return false
  return true
}

export interface CanvasFieldsInput {
  meta: TemplateMeta
  fields: FieldDefinition[]
  pages: PageDefinition[]
  currentPageId: string | null
  header: PageBand | undefined
  footer: PageBand | undefined
}

export interface CanvasFieldsResult {
  /** Body + translated band fields for the current page (render order). */
  pageFields: FieldDefinition[]
  /** The current page's size — drives clipping, grid, zoom-fit, clamping. */
  pageBounds: { width: number; height: number }
}

/** Compute the render field list + page size for the current page. */
export function deriveCanvasFields(input: CanvasFieldsInput): CanvasFieldsResult {
  const { meta, fields, pages, currentPageId, header, footer } = input

  // Page 1 (index 0) is special: orphaned fields (pageId === null) and fields
  // tagged with the explicit pages[0] id both belong here (GH #37). Other
  // pages match strictly on id.
  const page1Id = pages.find((p) => p.index === 0)?.id ?? null
  const isOnPage1 = currentPageId === null || currentPageId === page1Id
  const bodyFields = fields.filter((f) => {
    if (isOnPage1) {
      return f.pageId === null || f.pageId === undefined || f.pageId === page1Id
    }
    return f.pageId === currentPageId
  })

  const currentPage = pages.find((p) => p.id === currentPageId) ?? null
  const fallbackPage = pages.find((p) => p.index === 0) ?? null
  const pageBounds = getPageSize(currentPage ?? fallbackPage, meta)

  // #61 — only render band fields when the band is enabled. Band fields'
  // x/y are stored band-local, so we add the band offset before handing
  // them to the reconciler.
  const headerActive = !!header?.enabled
  const footerActive = !!footer?.enabled
  const headerOffset =
    headerActive && header ? { x: header.style.paddingLeft, y: header.style.paddingTop } : null
  const footerOffset =
    footerActive && footer
      ? {
          x: footer.style.paddingLeft,
          y: pageBounds.height - footer.style.height + footer.style.paddingTop,
        }
      : null
  const headerPageFields =
    headerActive &&
    header &&
    headerOffset &&
    currentPageIndexIsZeroOrApplied(currentPageId, pages, header.applyToFirstPage)
      ? header.fields.map((f) => translateForCanvas(f, headerOffset, 'header'))
      : []
  const footerPageFields =
    footerActive &&
    footer &&
    footerOffset &&
    currentPageIndexIsZeroOrApplied(currentPageId, pages, footer.applyToFirstPage)
      ? footer.fields.map((f) => translateForCanvas(f, footerOffset, 'footer'))
      : []

  return { pageFields: [...bodyFields, ...headerPageFields, ...footerPageFields], pageBounds }
}
