/**
 * useFabricSync — reconciliation effects that keep the Fabric canvas in sync
 * with the store (fields, selection, background, grid, zoom, resize).
 *
 * Each concern is a separate `useEffect` so React can skip unchanged deps.
 *
 * Sister hooks (split out per CLAUDE.md Hard Rule #11):
 *   - `useFabricImages` — bg / placeholder / static image loading.
 *   - `usePageBoundsEnforcement` — clipPath + outline rect + clamp handlers.
 */
import { useEffect } from 'react'
import {
  type Canvas as FabricCanvas,
  FabricImage,
  ActiveSelection,
  type Group as FabricGroup,
} from 'fabric'
import type { FabricObject } from 'fabric'
import { useUiStore } from '../../store/uiStore.js'
import type { FieldDefinition } from '@template-goblin/types'
import {
  createFieldGroup,
  applyFieldToGroup,
  buildGridLines,
  fitZoomLevel,
  type ImageResolver,
} from './fabricUtils.js'
import { usePageBoundsEnforcement } from './usePageBoundsEnforcement.js'

// Re-export image hooks so existing `import { useBackgroundImage, ... } from './useFabricSync'`
// callers don't have to update their imports immediately.
export { useBackgroundImage, usePlaceholderImages, useImageResolver } from './useFabricImages.js'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SyncDeps {
  fabricRef: React.RefObject<FabricCanvas | null>
  /**
   * State mirror of `fabricRef.current`. Effects that react to canvas
   * creation/disposal MUST depend on this — refs have stable identity and
   * don't trigger dep re-fires (GH #17).
   */
  fabricInstance: FabricCanvas | null
  containerRef: React.RefObject<HTMLDivElement | null>
  /**
   * State mirror of `containerRef.current`. Effects that must re-attach to
   * a new container element (e.g. the ResizeObserver) depend on this so the
   * observer doesn't stay bound to the unmounted onboarding picker on the
   * first visit (GH #17).
   */
  containerEl: HTMLDivElement | null
  pageFields: FieldDefinition[]
  bgImage: HTMLImageElement | null
  currentBgColor: string | null
  resolveImage: ImageResolver
  /**
   * Bounds of the *current* page, in points. Drives canvas clipping,
   * page-rect outline, grid extents, zoom-fit, and move/scale clamping.
   * For multi-page templates with mixed sizes, callers pass the page the
   * user is currently viewing (`getPageSize(currentPage, meta)`), not the
   * template-level meta.
   */
  meta: { width: number; height: number }
  selectedFieldIds: string[]
  showGrid: boolean
  gridSize: number
  zoom: number
  isPlacing: boolean
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFabricSync(deps: SyncDeps) {
  const {
    fabricRef,
    fabricInstance,
    containerRef,
    containerEl,
    pageFields,
    bgImage,
    currentBgColor,
    resolveImage,
    meta,
    selectedFieldIds,
    showGrid,
    gridSize,
    zoom,
    isPlacing,
  } = deps

  // ═══════════════ Reconciliation: store → canvas (REQ-050) ═══════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    const existing = new Map<string, FabricGroup>()
    fc.getObjects().forEach((o) => {
      if (o.__fieldId && !o.__isGrid && !o.__isPageBounds) {
        existing.set(o.__fieldId, o as FabricGroup)
      }
    })

    const sorted = [...pageFields].sort((a, b) => a.zIndex - b.zIndex)

    sorted.forEach((field) => {
      const g = existing.get(field.id)
      if (g) {
        applyFieldToGroup(g, field, resolveImage)
        existing.delete(field.id)
      } else {
        const newGroup = createFieldGroup(field, resolveImage)
        fc.add(newGroup)
      }
    })

    existing.forEach((g) => fc.remove(g))

    // Enforce z-index ordering (REQ-049). Background-only Fabric objects
    // (grid lines, page-bounds outline) sit at the bottom of the stack;
    // field groups slot in above them, preserving their declared zIndex.
    const ambientCount = fc.getObjects().filter((o) => o.__isGrid || o.__isPageBounds).length
    sorted.forEach((field, idx) => {
      const g = fc.getObjects().find((o) => o.__fieldId === field.id)
      if (g) fc.moveObjectTo(g, ambientCount + idx)
    })

    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, pageFields, resolveImage])

  // ═══════════════ Selection sync: store → canvas ═════════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    const activeIds = fc
      .getActiveObjects()
      .map((o) => o.__fieldId)
      .filter((id): id is string => !!id)

    const sortedActive = [...activeIds].sort()
    const sortedStore = [...selectedFieldIds].sort()
    if (
      sortedActive.length === sortedStore.length &&
      sortedActive.every((id, i) => id === sortedStore[i])
    ) {
      return
    }

    if (selectedFieldIds.length === 0) {
      fc.discardActiveObject()
    } else if (selectedFieldIds.length === 1) {
      const g = fc.getObjects().find((o) => o.__fieldId === selectedFieldIds[0])
      if (g) fc.setActiveObject(g)
    } else {
      const sel = selectedFieldIds
        .map((id) => fc.getObjects().find((o) => o.__fieldId === id))
        .filter(Boolean) as FabricObject[]
      if (sel.length > 0) {
        fc.setActiveObject(new ActiveSelection(sel, { canvas: fc }))
      }
    }
    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, selectedFieldIds])

  // ═══════════════ Background sync (REQ-034, AC-001) ═════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    if (bgImage) {
      const fabricImg = new FabricImage(bgImage, { originX: 'left', originY: 'top' })
      const imgW = fabricImg.width || meta.width
      const imgH = fabricImg.height || meta.height
      fabricImg.set({
        scaleX: meta.width / imgW,
        scaleY: meta.height / imgH,
      })
      fc.backgroundImage = fabricImg
    } else {
      fc.backgroundImage = undefined
    }
    // The page colour is painted by the page-bounds rect (managed in
    // `usePageBoundsEnforcement`), NOT by `canvas.backgroundColor` — the
    // latter would fill the whole framebuffer and spill outside the page
    // rect. Keep `canvas.backgroundColor` empty so only the rect's `fill`
    // shows.
    fc.backgroundColor = ''
    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, bgImage, currentBgColor, meta.width, meta.height])

  // ═══════════════ Grid sync (REQ-009, AC-008) ═══════════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    const oldGrid = fc.getObjects().filter((o) => o.__isGrid)
    if (oldGrid.length > 0) fc.remove(...oldGrid)

    if (showGrid && meta.width > 0 && meta.height > 0) {
      const lines = buildGridLines(meta.width, meta.height, gridSize)
      fc.add(...lines)
      lines.forEach((l) => fc.sendObjectToBack(l))
    }
    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, showGrid, gridSize, meta.width, meta.height])

  // ═══════════════ Zoom sync: store → canvas (REQ-037..042 + GH #66) ════
  // The canvas is sized to `page * zoom` so the container's `overflow:
  // auto` produces native scrollbars when the user zooms past the fit
  // level. The viewportTransform is identity-with-zoom (no centring
  // translate) — the container's flex centring places smaller-than-
  // viewport canvases instead.
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || meta.width <= 0 || meta.height <= 0) return
    if (Math.abs(fc.getZoom() - zoom) < 0.001) return

    fc.setDimensions({ width: meta.width * zoom, height: meta.height * zoom })
    fc.setViewportTransform([zoom, 0, 0, zoom, 0, 0])
    fc.requestRenderAll()
  }, [fabricRef, fabricInstance, zoom, meta.width, meta.height])

  // ═══════════════ Auto-fit Zoom on Meta Change ══════════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || meta.width <= 0 || meta.height <= 0) return
    const canW = containerRef.current?.clientWidth ?? fc.width ?? 800
    const canH = containerRef.current?.clientHeight ?? fc.height ?? 600
    const z = fitZoomLevel(meta.width, meta.height, canW, canH, 40)
    useUiStore.getState().setZoom(z)
  }, [fabricRef, fabricInstance, containerRef, containerEl, meta.width, meta.height])

  // ═══════════════ Resize observer (GH #17, #66) ═════════════════════════
  // Pre-#66 the observer resized the Fabric canvas to match the container
  // and recentred the page via `viewportTransform`. Now the canvas is
  // sized to `page * zoom` (independent of the container) and centring is
  // CSS flex; on a container-size change the only thing that needs to
  // update is the auto-fit zoom — useFabricSync's auto-fit-zoom-on-meta
  // effect already handles meta changes, but a window resize doesn't
  // touch meta so we recompute zoom here when the user is at (or below)
  // the previous fit level. Above fit-zoom we leave the user's zoom
  // alone — they're explicitly zoomed in and a window resize shouldn't
  // throw away their context.
  //
  // Depend on `containerEl` (state mirror) — refs have stable identity
  // so the old implementation stayed bound to the onboarding picker's
  // <div> after the canvas subtree mounted on the first visit.
  useEffect(() => {
    if (!containerEl || !fabricInstance) return

    const observer = new ResizeObserver(() => {
      const fc = fabricRef.current
      if (!fc) return
      if (meta.width <= 0 || meta.height <= 0) return
      const w = containerEl.clientWidth
      const h = containerEl.clientHeight
      const fit = fitZoomLevel(meta.width, meta.height, w, h, 40)
      const current = fc.getZoom()
      if (current <= fit + 0.001) {
        useUiStore.getState().setZoom(fit)
      }
      // Otherwise (current > fit, user zoomed in) leave zoom alone; the
      // canvas keeps its `page * current` size and scrollbars adjust.
    })
    observer.observe(containerEl)
    return () => observer.disconnect()
  }, [fabricRef, fabricInstance, containerEl, meta.width, meta.height])

  // ═══════════════ Cursor sync (REQ-043) ═════════════════════════════════
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    if (isPlacing) {
      fc.defaultCursor = 'crosshair'
      fc.hoverCursor = 'crosshair'
    } else {
      fc.defaultCursor = 'default'
      fc.hoverCursor = 'move'
    }
  }, [fabricRef, fabricInstance, isPlacing])

  // ═══════════════ Page bounds: clip + outline + clamp (#46/#47) ═════════
  usePageBoundsEnforcement({ fabricRef, fabricInstance, meta, pageFillColor: currentBgColor })
}
