/**
 * useBandVisuals — paint the header / footer / page-number on the canvas
 * so the editor matches the generated PDF (#61).
 *
 * Adds three kinds of non-interactive Fabric objects, each tagged with
 * `__isBand: true` (or `__isBandField: true` for the band-local field
 * groups) so the body-field reconciler in `useFabricSync.ts` doesn't try
 * to manage them.
 *
 * Renders:
 *   - Header background rect at y = 0, height = header.style.height
 *   - Footer background rect at y = pageH - footer.style.height
 *   - Divider line for each band when `style.divider` is non-null
 *   - Band-local FieldDefinition groups translated to page coords
 *   - Page-number text in the chosen band (when enabled + visible for the
 *     current page)
 *
 * The effect tears down its own objects on every dependency change so
 * config tweaks don't leave stale visuals behind.
 */
import { useEffect } from 'react'
import {
  Rect as FabricRect,
  Line as FabricLine,
  Textbox,
  type Canvas as FabricCanvas,
  type FabricObject,
} from 'fabric'
import type { FieldDefinition, PageBand, PageNumberConfig } from '@template-goblin/types'
import { formatPageNumber } from '@template-goblin/types'
import { createFieldGroup } from './fabricUtils.js'

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
  // Background rect (transparent fill = pointer-events-only; we still mark
  // it non-interactive so dragging through it doesn't grab the rect).
  const bg = new FabricRect({
    left: 0,
    top: bandTop,
    width: pageWidth,
    height: band.style.height,
    fill: band.style.backgroundColor ?? 'rgba(0,0,0,0)',
    stroke: null,
    selectable: false,
    evented: false,
    excludeFromExport: true,
  })
  bg.__isBand = true
  add(bg)

  // Band-local fields, translated into page coords for the canvas. The
  // `__bandKind` tag lets `clampToPage` keep them inside the band on drag
  // and lets `wireDragResizeEvents` commit their position back to the
  // correct store array (header/footer instead of body).
  const kind: 'header' | 'footer' = isHeader ? 'header' : 'footer'
  for (const f of band.fields) {
    const translated: FieldDefinition = {
      ...f,
      x: f.x + band.style.paddingLeft,
      y: bandTop + band.style.paddingTop + f.y,
    } as FieldDefinition
    const group = createFieldGroup(translated, () => null, {
      texts: {},
      images: {},
      tables: {},
    })
    group.__isBandField = true
    group.__bandKind = kind
    add(group)
  }

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
