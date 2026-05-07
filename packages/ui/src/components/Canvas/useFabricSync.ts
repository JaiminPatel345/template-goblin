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
import type { FieldDefinition, InputJSON } from '@template-goblin/types'
import {
  createFieldGroup,
  applyFieldToGroup,
  buildGridLines,
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
  /**
   * The id of the page the user is currently viewing. Drives the GH #84
   * "reset zoom to 100% on page switch" effect — same-sized pages don't
   * change `meta`, so we depend on the id explicitly.
   */
  currentPageId: string | null
  selectedFieldIds: string[]
  showGrid: boolean
  gridSize: number
  zoom: number
  isPlacing: boolean
  /**
   * The `InputJSON` the canvas should render against (#79). When present,
   * dynamic text fields render their `data.texts[jsonKey]` value and
   * dynamic tables render `data.tables[jsonKey]` rows. `null` falls back
   * to design-time placeholder rendering.
   */
  data: InputJSON | null
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFabricSync(deps: SyncDeps) {
  const {
    fabricRef,
    fabricInstance,
    pageFields,
    bgImage,
    currentBgColor,
    resolveImage,
    meta,
    currentPageId,
    selectedFieldIds,
    showGrid,
    gridSize,
    zoom,
    isPlacing,
    data,
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
        applyFieldToGroup(g, field, resolveImage, data)
        existing.delete(field.id)
      } else {
        const newGroup = createFieldGroup(field, resolveImage, data)
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
  }, [fabricRef, fabricInstance, pageFields, resolveImage, data])

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

  // ═══════════════ Reset Zoom to 100% on Page / Meta Change (GH #84) ═════
  // When the user switches pages, adds a page, or otherwise changes the
  // current page's bounds, default the zoom back to 1× (raw points).
  // `currentPageId` is depended on explicitly so same-sized page switches
  // — where `meta.width`/`meta.height` don't change — still reset.
  //
  // Resize the canvas synchronously here AND update store.zoom — delegating
  // the resize to the zoom-sync effect is fragile: if the previous page
  // left fabric's zoom already at 1 but with stale dimensions, the zoom-
  // sync's `fc.getZoom() === zoom` early-return skips the setDimensions
  // call, leaving the canvas painting at the old page's `meta * zoom` while
  // the indicator reads 100%.
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || meta.width <= 0 || meta.height <= 0) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[#84 reset SKIP]', { fc: !!fc, meta })
      }
      return
    }
    const wrapper = (fc as unknown as { wrapperEl?: HTMLElement }).wrapperEl
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[#84 reset BEFORE]', {
        pageId: currentPageId,
        meta: { w: meta.width, h: meta.height },
        fc: { zoom: fc.getZoom(), w: fc.width, h: fc.height },
        wrapperStyle: wrapper && { w: wrapper.style.width, h: wrapper.style.height },
      })
    }
    fc.setDimensions({ width: meta.width, height: meta.height })
    fc.setViewportTransform([1, 0, 0, 1, 0, 0])
    fc.requestRenderAll()
    useUiStore.getState().setZoom(1)
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[#84 reset AFTER]', {
        fc: { zoom: fc.getZoom(), w: fc.width, h: fc.height },
        wrapperStyle: wrapper && { w: wrapper.style.width, h: wrapper.style.height },
        wrapperRect: wrapper && {
          ow: wrapper.offsetWidth,
          oh: wrapper.offsetHeight,
        },
      })
    }
  }, [fabricRef, fabricInstance, currentPageId, meta.width, meta.height])

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
