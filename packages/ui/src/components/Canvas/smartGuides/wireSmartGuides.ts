/**
 * wireSmartGuides — registers Fabric event handlers that drive the smart
 * alignment guides feature (#41).
 *
 * Behaviour summary:
 *   - mouse:down clears any stale guides + caches the page meta the gesture
 *     will work against.
 *   - object:moving rebuilds the candidate list from the current canvas
 *     state, computes the best snap on each axis, mutates the active
 *     object's left/top by the snap delta (delta-based so it works correctly
 *     for Groups whose origin differs from their bounding-rect left), then
 *     calls `clampToPage` so we don't override the page-bounds enforcement.
 *     Renders the matching guide lines + equal-spacing brackets.
 *   - object:scaling shows guides for the moving edges as visual feedback
 *     but does NOT mutate scaleX/scaleY (v1 — magnetic snap during resize is
 *     a follow-up; the issue prioritises guide visibility).
 *   - object:modified + mouse:up clear all guides.
 *
 * Hard-rule notes:
 *   - We don't depend on handler registration order with
 *     `usePageBoundsEnforcement`: this handler runs `snap → clampToPage`
 *     inline so the final position is always inside the page rect.
 *   - All measurements live in canvas object-space (points), never viewport
 *     pixels, so behaviour is consistent across zoom.
 */
import type { Canvas as FabricCanvas, FabricObject } from 'fabric'
import { getPageSize } from '@template-goblin/types'
import { useTemplateStore } from '../../../store/templateStore.js'
import { useUiStore } from '../../../store/uiStore.js'
import { clampToPage } from '../usePageBoundsEnforcement.js'
import { buildCandidates, type Rect } from './candidates.js'
import { computeSnap } from './snap.js'
import { detectEqualSpacing } from './equalSpacing.js'
import { GuideRenderer } from './render.js'
import { SPACING_MATCH_TOLERANCE_PT, snapToleranceForZoom } from './constants.js'

interface PageMeta {
  width: number
  height: number
}

/** Read the active page's dimensions via the canonical resolver. */
function readPageMeta(): PageMeta {
  const store = useTemplateStore.getState()
  const pageId = useUiStore.getState().currentPageId
  const page = store.pages.find((p) => p.id === pageId) ?? store.pages[0] ?? null
  return getPageSize(page, store.meta)
}

/** Read the current header/footer band heights from the store (#61). */
function readBandHeights(): { header: number; footer: number } {
  const s = useTemplateStore.getState()
  return {
    header: s.header?.enabled ? s.header.style.height : 0,
    footer: s.footer?.enabled ? s.footer.style.height : 0,
  }
}

/** Set of `FabricObject` filtered to the rects we want to align against. */
function collectOtherRects(fc: FabricCanvas, active: FabricObject): Rect[] {
  // Active selections expose members via `getObjects()` so we exclude all of them.
  const activeMembers = new Set<FabricObject>()
  const maybeGroup = active as unknown as { getObjects?: () => FabricObject[] }
  if (typeof maybeGroup.getObjects === 'function') {
    for (const m of maybeGroup.getObjects()) activeMembers.add(m)
  }
  activeMembers.add(active)

  const rects: Rect[] = []
  for (const o of fc.getObjects()) {
    if (o.__isGrid || o.__isPageBounds || o.__isSmartGuide) continue
    if (!o.__fieldId) continue
    if (activeMembers.has(o)) continue
    o.setCoords()
    const br = o.getBoundingRect()
    rects.push({ left: br.left, top: br.top, width: br.width, height: br.height })
  }
  return rects
}

/** Read Alt state defensively — `opt.e` may be undefined for programmatic moves. */
function isAltHeld(opt: { e?: Event }): boolean {
  const e = opt.e as MouseEvent | KeyboardEvent | undefined
  return !!e && 'altKey' in e && e.altKey === true
}

export function wireSmartGuides(fc: FabricCanvas): void {
  const meta = { width: 0, height: 0 }
  let renderer: GuideRenderer | null = null

  function ensureRenderer(): GuideRenderer {
    const next = readPageMeta()
    if (!renderer || next.width !== meta.width || next.height !== meta.height) {
      renderer?.clear()
      meta.width = next.width
      meta.height = next.height
      renderer = new GuideRenderer(fc, meta.width, meta.height)
    }
    return renderer
  }

  function clear(): void {
    renderer?.clear()
    fc.requestRenderAll()
  }

  fc.on('mouse:down', clear)
  fc.on('mouse:up', clear)
  fc.on('object:modified', clear)
  fc.on('selection:cleared', clear)

  fc.on('object:moving', (opt) => {
    const obj = opt.target
    if (!obj) return
    const r = ensureRenderer()
    r.clear()

    if (isAltHeld(opt)) {
      // Alt-bypass: no snap, no guides — user wants fine placement.
      r.requestRender()
      return
    }

    obj.setCoords()
    const br = obj.getBoundingRect()
    const activeRect: Rect = {
      left: br.left,
      top: br.top,
      width: br.width,
      height: br.height,
    }
    const others = collectOtherRects(fc, obj)
    const candidates = buildCandidates(others, meta.width, meta.height)
    const tolerance = snapToleranceForZoom(fc.getZoom())
    const result = computeSnap(activeRect, candidates, tolerance)

    let snappedRect = activeRect
    if (result.x) {
      obj.set({ left: (obj.left ?? 0) + result.x.delta })
      snappedRect = { ...snappedRect, left: snappedRect.left + result.x.delta }
      r.drawXGuide(result.x)
    }
    if (result.y) {
      obj.set({ top: (obj.top ?? 0) + result.y.delta })
      snappedRect = { ...snappedRect, top: snappedRect.top + result.y.delta }
      r.drawYGuide(result.y)
    }

    // Equal-spacing detection uses the post-snap rect so the brackets line up.
    const gaps = detectEqualSpacing(snappedRect, others, SPACING_MATCH_TOLERANCE_PT)
    if (gaps.length > 0) r.drawSpacing(gaps)

    // Re-clamp after our snap in case we pushed the object past the page
    // edge OR into a header/footer band (#61). Reading bandHeights from the
    // store on every tick is fine — these are tiny scalar lookups.
    obj.setCoords()
    clampToPage(obj, meta.width, meta.height, readBandHeights())
    r.requestRender()
  })

  fc.on('object:scaling', (opt) => {
    const obj = opt.target
    if (!obj) return
    const r = ensureRenderer()
    r.clear()
    if (isAltHeld(opt)) {
      r.requestRender()
      return
    }
    // v1: show guides as visual feedback during resize, no mutation.
    // Magnetic-snap during resize is intentionally deferred — handle math
    // is complex (anchor-dependent scaleX/left adjustment) and a wrong snap
    // mid-resize is more disorienting than no snap.
    obj.setCoords()
    const br = obj.getBoundingRect()
    const activeRect: Rect = {
      left: br.left,
      top: br.top,
      width: br.width,
      height: br.height,
    }
    const others = collectOtherRects(fc, obj)
    const candidates = buildCandidates(others, meta.width, meta.height)
    const tolerance = snapToleranceForZoom(fc.getZoom())
    const result = computeSnap(activeRect, candidates, tolerance)
    if (result.x) r.drawXGuide(result.x)
    if (result.y) r.drawYGuide(result.y)
    r.requestRender()
  })
}
