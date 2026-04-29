/**
 * usePageBoundsEnforcement — keep field manipulation inside the page rect.
 *
 * Combines three concerns that all consume the same `[0, 0, w, h]` rect and
 * MUST update together when the page bounds change (e.g. user switches to a
 * page with a different size — #46/#47):
 *
 *  1. `canvas.clipPath` — hard visual clip. Anything past the page rect is
 *     not rendered. `controlsAboveOverlay = true` keeps resize handles
 *     visible during drag (handles render above the clipPath).
 *  2. A non-interactive page-bounds outline `Rect` so users can see exactly
 *     where the printable area starts and ends.
 *  3. `object:moving` / `object:scaling` event handlers that clamp the
 *     active object back inside the rect using `getBoundingRect()`. The
 *     bounding rect is read in object-space (NOT canvas pixel coords —
 *     those break under viewport zoom; see Fabric.js issue #4042).
 *
 * Extracted from `useFabricSync.ts` per CLAUDE.md Hard Rule #11 (300-line
 * cap). Field reconciliation, selection sync, etc. continue to live there.
 */
import { useEffect } from 'react'
import { type Canvas as FabricCanvas, Rect as FabricRect } from 'fabric'
import type { FabricObject } from 'fabric'

export interface PageBoundsDeps {
  fabricRef: React.RefObject<FabricCanvas | null>
  /** State mirror of `fabricRef.current` — needed to retrigger on remount. */
  fabricInstance: FabricCanvas | null
  /** Current page's bounds in points. Same shape as `useFabricSync`'s `meta`. */
  meta: { width: number; height: number }
}

export function usePageBoundsEnforcement(deps: PageBoundsDeps) {
  const { fabricRef, fabricInstance, meta } = deps

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || meta.width <= 0 || meta.height <= 0) return

    fc.controlsAboveOverlay = true
    fc.clipPath = new FabricRect({
      left: 0,
      top: 0,
      width: meta.width,
      height: meta.height,
      absolutePositioned: true,
    })

    // Refresh the outline rect — remove any stale one first so a page
    // resize doesn't leave the previous border behind.
    const stale = fc.getObjects().filter((o) => o.__isPageBounds)
    if (stale.length > 0) fc.remove(...stale)

    const outline = buildPageBoundsRect(meta.width, meta.height)
    fc.add(outline)
    fc.sendObjectToBack(outline)

    const onMoving = (e: { target?: FabricObject }) => {
      if (e.target) clampToPage(e.target, meta.width, meta.height)
    }
    const onScaling = (e: { target?: FabricObject }) => {
      if (e.target) clampToPage(e.target, meta.width, meta.height)
    }

    fc.on('object:moving', onMoving)
    fc.on('object:scaling', onScaling)

    fc.requestRenderAll()

    return () => {
      fc.off('object:moving', onMoving)
      fc.off('object:scaling', onScaling)
    }
  }, [fabricRef, fabricInstance, meta.width, meta.height])
}

/**
 * Build the non-interactive page-bounds outline rect. Exported so tests can
 * assert its shape without mounting the canvas hook.
 */
export function buildPageBoundsRect(width: number, height: number): FabricRect {
  const r = new FabricRect({
    left: 0,
    top: 0,
    width,
    height,
    fill: 'transparent',
    stroke: 'rgba(120, 120, 140, 0.6)',
    strokeWidth: 1,
    strokeUniform: true,
    selectable: false,
    evented: false,
    excludeFromExport: true,
  })
  r.__isPageBounds = true
  return r
}

/**
 * Shift `obj.left`/`obj.top` so the object's bounding rect sits inside
 * `[0, 0, pageW, pageH]`. Mutates the object in place and calls
 * `setCoords()`. Returns whether a clamp was applied.
 */
export function clampToPage(obj: FabricObject, pageW: number, pageH: number): boolean {
  obj.setCoords()
  const r = obj.getBoundingRect()
  let dx = 0
  let dy = 0
  if (r.left < 0) dx = -r.left
  else if (r.left + r.width > pageW) dx = pageW - (r.left + r.width)
  if (r.top < 0) dy = -r.top
  else if (r.top + r.height > pageH) dy = pageH - (r.top + r.height)
  if (dx === 0 && dy === 0) return false
  obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy })
  obj.setCoords()
  return true
}
