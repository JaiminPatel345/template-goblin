import { getPageSize } from '@template-goblin/types'
import type { PageBand } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'

/**
 * Band geometry for the page the user is VIEWING — the one truth the
 * three gesture-time call sites (drag/resize commit, draw-to-create zone
 * detection, smart-guides clamp) must share with the render side
 * (`deriveCanvasFields` / `useBandVisuals`).
 *
 * Two render-side rules these call sites used to ignore:
 *  1. Pages can carry their OWN width/height (`getPageSize`); using
 *     `meta.height` put the footer's top edge ~`meta.height - pageHeight`
 *     points off on custom-height pages, so footer fields jumped on
 *     every drop and bottom-of-page draws mis-routed.
 *  2. A band with `applyToFirstPage: false` does not render on page
 *     index 0 — its zone there is ordinary body space.
 */
export interface CurrentPageBandContext {
  /** The viewed page's height in pt (per-page override or meta fallback). */
  pageHeight: number
  /** The header band — `undefined` when absent, disabled, or not rendered
   *  on this page (`applyToFirstPage` rule). */
  header: PageBand | undefined
  /** Same for the footer. */
  footer: PageBand | undefined
}

/**
 * Imperative read of both stores — for Fabric event handlers that run
 * outside React's render cycle.
 */
export function currentPageBandContext(): CurrentPageBandContext {
  const store = useTemplateStore.getState()
  const pageId = useUiStore.getState().currentPageId
  const page = store.pages.find((p) => p.id === pageId) ?? store.pages.find((p) => p.index === 0)
  const pageHeight = getPageSize(page ?? null, store.meta).height
  const pageIndex = page?.index ?? 0

  const rendersHere = (band: PageBand | undefined): band is PageBand =>
    !!band && band.enabled && !(pageIndex === 0 && band.applyToFirstPage === false)

  return {
    pageHeight,
    header: rendersHere(store.header) ? store.header : undefined,
    footer: rendersHere(store.footer) ? store.footer : undefined,
  }
}
