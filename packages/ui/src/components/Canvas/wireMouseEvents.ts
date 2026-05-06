/**
 * wireMouseEvents — Fabric `mouse:*` handlers covering context menu,
 * draw-to-create, space/middle-click pan, and double-click selection.
 * Extracted from `useFabricCanvas.ts` to honour Hard Rule #11.
 *
 * GH #66: space+drag pan now drives the *container's* `scrollLeft`/`scrollTop`
 * instead of mutating Fabric's `viewportTransform`. The canvas is sized to
 * `page * zoom` and the wrapping div has `overflow: auto`, so navigating the
 * visible viewport is a scroll operation, not a transform translate. This
 * keeps space-pan additive with the native scrollbars added in the same
 * issue and survives the zoom-sync effect (which writes the transform to
 * identity-with-zoom on every zoom change).
 */
import { Rect as FabricRect, type Canvas as FabricCanvas } from 'fabric'
import type { FieldType } from '@template-goblin/types'
import type { FieldCreationDraft } from './FieldCreationPopup.js'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { snap } from './fabricUtils.js'

/** Wire mouse-related Fabric events on the canvas. */
export function wireMouseEvents(
  fc: FabricCanvas,
  containerRef: React.RefObject<HTMLDivElement | null>,
  drawStartRef: React.MutableRefObject<{ x: number; y: number } | null>,
  drawPreviewRef: React.MutableRefObject<FabricRect | null>,
  isPanningRef: React.MutableRefObject<boolean>,
  spacePanModeRef: React.MutableRefObject<boolean>,
  panLastRef: React.MutableRefObject<{ x: number; y: number } | null>,
  setPendingDraft: React.Dispatch<React.SetStateAction<FieldCreationDraft | null>>,
) {
  // Double-click → selectAndFocus
  fc.on('mouse:dblclick', (opt) => {
    if (opt.target?.__fieldId) {
      useUiStore.getState().selectAndFocus(opt.target.__fieldId)
    }
  })

  // ── Mouse down ──────────────────────────────────────────────────────────
  fc.on('mouse:down', (opt) => {
    const e = opt.e as MouseEvent

    // Right-click → context menu
    if (e.button === 2) {
      e.preventDefault()
      if (opt.target?.__fieldId) {
        useUiStore.getState().setContextMenu({
          x: e.clientX,
          y: e.clientY,
          fieldId: opt.target.__fieldId,
        })
      }
      return
    }

    // Pan: middle button OR space + left button
    if (e.button === 1 || (e.button === 0 && spacePanModeRef.current)) {
      isPanningRef.current = true
      panLastRef.current = { x: e.clientX, y: e.clientY }
      fc.selection = false
      fc.defaultCursor = 'grabbing'
      fc.hoverCursor = 'grabbing'
      return
    }

    // Draw-to-create
    const uiState = useUiStore.getState()
    const placing =
      uiState.activeTool === 'addText' ||
      uiState.activeTool === 'addImage' ||
      uiState.activeTool === 'addLoop'

    if (placing && !opt.target) {
      const pt = fc.getScenePoint(e)
      const sx = snap(pt.x, uiState.gridSize, uiState.showGrid)
      const sy = snap(pt.y, uiState.gridSize, uiState.showGrid)
      drawStartRef.current = { x: sx, y: sy }

      const preview = new FabricRect({
        left: sx,
        top: sy,
        width: 0,
        height: 0,
        fill: 'rgba(233,69,96,0.15)',
        stroke: '#e94560',
        strokeWidth: 1,
        strokeDashArray: [6, 3],
        selectable: false,
        evented: false,
        originX: 'left',
        originY: 'top',
      })
      drawPreviewRef.current = preview
      fc.add(preview)
      fc.selection = false
    }
  })

  // ── Mouse move ──────────────────────────────────────────────────────────
  fc.on('mouse:move', (opt) => {
    const e = opt.e as MouseEvent

    if (isPanningRef.current && panLastRef.current) {
      // GH #66: drive the container's native scroll instead of Fabric's
      // viewportTransform. The transform is zoom-only after the canvas
      // sizing change, and any translate written here is wiped by the
      // next zoom-sync effect. Scrolling the container also keeps space-
      // pan in sync with the user's scrollbar position.
      const container = containerRef.current
      if (container) {
        const dx = e.clientX - panLastRef.current.x
        const dy = e.clientY - panLastRef.current.y
        container.scrollLeft -= dx
        container.scrollTop -= dy
        panLastRef.current = { x: e.clientX, y: e.clientY }
      }
      return
    }

    if (drawStartRef.current && drawPreviewRef.current) {
      const pt = fc.getScenePoint(e)
      const { showGrid: sg, gridSize: gs } = useUiStore.getState()
      const sx = snap(pt.x, gs, sg)
      const sy = snap(pt.y, gs, sg)
      const start = drawStartRef.current
      drawPreviewRef.current.set({
        left: Math.min(start.x, sx),
        top: Math.min(start.y, sy),
        width: Math.abs(sx - start.x),
        height: Math.abs(sy - start.y),
      })
      drawPreviewRef.current.setCoords()
      fc.requestRenderAll()
    }
  })

  // ── Mouse up ────────────────────────────────────────────────────────────
  fc.on('mouse:up', () => {
    // End pan
    if (isPanningRef.current) {
      isPanningRef.current = false
      panLastRef.current = null
      fc.selection = true
      fc.defaultCursor = spacePanModeRef.current ? 'grab' : 'default'
      fc.hoverCursor = spacePanModeRef.current ? 'grab' : 'move'
      return
    }

    // End draw-to-create
    if (drawStartRef.current && drawPreviewRef.current) {
      const rect = drawPreviewRef.current
      const rw = rect.width ?? 0
      const rh = rect.height ?? 0
      const rx = rect.left ?? 0
      const ry = rect.top ?? 0

      fc.remove(rect)
      drawPreviewRef.current = null
      drawStartRef.current = null
      fc.selection = true

      if (rw >= 10 && rh >= 10) {
        const uiState = useUiStore.getState()
        const toolToType: Record<string, FieldType> = {
          addText: 'text',
          addImage: 'image',
          addLoop: 'table',
        }
        const fieldType = toolToType[uiState.activeTool]
        if (fieldType) {
          // Prefer the explicit page-0 id when `currentPageId` is null but an
          // explicit Page 1 entry exists (i.e. solid-color onboarding leaves
          // `currentPageId` at null even though `pages[0]` is now real). Without
          // this, the field is stamped with `pageId: null` and disappears the
          // moment the user clicks the Page 1 tab — see GH #37.
          const ts = useTemplateStore.getState()
          const explicit = ts.pages.find((p) => p.index === 0)?.id ?? null
          const stampedPageId = useUiStore.getState().currentPageId ?? explicit
          setPendingDraft({
            type: fieldType,
            x: rx,
            y: ry,
            width: rw,
            height: rh,
            zIndex: ts.fields.length,
            pageId: stampedPageId,
            groupId: null,
          })
        }
      }

      useUiStore.getState().setActiveTool('select')
      fc.requestRenderAll()
    }
  })
}
