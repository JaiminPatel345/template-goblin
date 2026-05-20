/**
 * useBandVisuals — paint the header / footer chrome + page-number stamp
 * on the canvas (#61).
 *
 * Renders only the band's NON-INTERACTIVE chrome — background rect,
 * divider line, and the page-number Textbox. Band-LOCAL FIELD GROUPS are
 * reconciled through `useFabricSync` (the same diff path body fields
 * use) so they preserve Fabric identity across store updates. That's
 * critical: when this effect owned the groups it had to tear down + rebuild
 * all of them on every band-field edit, which dropped the selection mid-
 * keystroke and made font-size inputs unusable.
 *
 * The effect still tears down its own (decorative) objects on dep changes
 * so config tweaks don't leave stale chrome behind.
 */
import { useEffect } from 'react'
import {
  Rect as FabricRect,
  Line as FabricLine,
  Textbox,
  type Canvas as FabricCanvas,
  type FabricObject,
} from 'fabric'
import type { PageBand, PageNumberConfig } from '@template-goblin/types'
import { formatPageNumber } from '@template-goblin/types'

export interface BandVisualsDeps {
  fabricRef: React.RefObject<FabricCanvas | null>
  fabricInstance: FabricCanvas | null
  meta: { width: number; height: number }
  header: PageBand | undefined
  footer: PageBand | undefined
  pageNumber: PageNumberConfig | undefined
  /** 0-based index of the page currently shown on the canvas. */
  currentPageIndex: number
}

export function useBandVisuals(deps: BandVisualsDeps): void {
  const { fabricRef, fabricInstance, meta, header, footer, pageNumber, currentPageIndex } = deps

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || meta.width <= 0 || meta.height <= 0) return

    const added: FabricObject[] = []
    const add = (o: FabricObject): void => {
      added.push(o)
      fc.add(o)
    }

    if (header && shouldRender(header, currentPageIndex)) {
      paintBand(add, header, 0, meta.width, /* isHeader */ true)
    }
    if (footer && shouldRender(footer, currentPageIndex)) {
      paintBand(add, footer, meta.height - footer.style.height, meta.width, false)
    }

    paintPageNumberIfDue(add, header, footer, pageNumber, currentPageIndex, meta)

    fc.requestRenderAll()

    return () => {
      if (added.length === 0) return
      fc.remove(...added)
      fc.requestRenderAll()
    }
  }, [
    fabricRef,
    fabricInstance,
    meta.width,
    meta.height,
    header,
    footer,
    pageNumber,
    currentPageIndex,
  ])
}

function shouldRender(band: PageBand, pageIndex: number): boolean {
  // #61 follow-up: a hidden band keeps its config but doesn't render.
  if (band.enabled === false) return false
  if (band.style.height <= 0) return false
  if (pageIndex === 0 && !band.applyToFirstPage) return false
  return true
}

function paintBand(
  add: (o: FabricObject) => void,
  band: PageBand,
  bandTop: number,
  pageWidth: number,
  isHeader: boolean,
): void {
  // Background rect. Editor-only: when the band has no explicit
  // background colour we paint a very faint stroke so the band's bounds
  // are discoverable. The user otherwise sees nothing if they configured
  // a tall band but haven't added content yet (Improvement 2 from the
  // QA pass). `excludeFromExport: true` keeps this hint out of the PDF.
  const editorOnlyHint = !band.style.backgroundColor
  const bg = new FabricRect({
    left: 0,
    top: bandTop,
    width: pageWidth,
    height: band.style.height,
    fill: band.style.backgroundColor ?? 'rgba(0,0,0,0)',
    stroke: editorOnlyHint ? 'rgba(100, 130, 200, 0.25)' : null,
    strokeWidth: editorOnlyHint ? 0.5 : 0,
    strokeDashArray: editorOnlyHint ? [4, 4] : undefined,
    strokeUniform: true,
    selectable: false,
    evented: false,
    excludeFromExport: true,
  })
  bg.__isBand = true
  add(bg)

  // Band-LOCAL field groups are NOT rendered here. They flow through
  // `useFabricSync`'s reconciler (CanvasArea translates band fields into
  // page coords with a `__bandKind` marker so the reconciler can stamp
  // them on the Fabric group). This is what keeps band-field identity
  // stable across store updates — without it, editing a band field's
  // font size in the right panel re-creates its group on every keystroke
  // and the selection drops.

  // Auto-divider at the body-facing edge.
  if (band.style.divider && band.style.divider.color && band.style.divider.width > 0) {
    const gap = band.style.divider.gap ?? 0
    const dividerY = isHeader ? bandTop + band.style.height + gap : bandTop - gap
    const line = new FabricLine([0, dividerY, pageWidth, dividerY], {
      stroke: band.style.divider.color,
      strokeWidth: band.style.divider.width,
      strokeUniform: true,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })
    line.__isBand = true
    add(line)
  }
}

function paintPageNumberIfDue(
  add: (o: FabricObject) => void,
  header: PageBand | undefined,
  footer: PageBand | undefined,
  config: PageNumberConfig | undefined,
  pageIndex: number,
  meta: { width: number; height: number },
): void {
  if (!config?.enabled) return
  if (pageIndex === 0 && !config.showOnFirstPage) return
  const band = config.placement === 'header' ? header : footer
  if (!band || !shouldRender(band, pageIndex)) return
  const bandTop = config.placement === 'header' ? 0 : meta.height - band.style.height
  const innerX = band.style.paddingLeft
  const innerY = bandTop + band.style.paddingTop
  const innerW = Math.max(0, meta.width - band.style.paddingLeft - band.style.paddingRight)
  const innerH = Math.max(0, band.style.height - band.style.paddingTop - band.style.paddingBottom)
  if (innerW <= 0 || innerH <= 0) return
  const text = formatPageNumber(pageIndex + 1, config.numeralStyle)
  const tb = new Textbox(text, {
    left: innerX,
    top: innerY + (innerH - config.fontSize) / 2,
    width: innerW,
    fontFamily: config.fontFamily,
    fontSize: config.fontSize,
    fill: config.color,
    textAlign: config.align,
    selectable: false,
    evented: false,
    excludeFromExport: true,
  })
  tb.__isBand = true
  add(tb)
}
