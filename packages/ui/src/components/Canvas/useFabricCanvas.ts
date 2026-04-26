/**
 * useFabricCanvas — manages the Fabric.Canvas lifecycle.
 *
 * Creates the canvas via a ref-callback (REQ-040), wires all Fabric events
 * (selection, drag/resize, draw-to-create, pan, zoom), and disposes cleanly.
 *
 * Returns `{ fabricRef, setCanvasEl }` to be consumed by CanvasArea.
 */
import { useRef, useCallback, useState } from 'react'
import {
  Canvas as FabricCanvas,
  Rect as FabricRect,
  Point,
  type Group as FabricGroup,
} from 'fabric'
import type { FieldType } from '@template-goblin/types'
import type { FieldCreationDraft } from './FieldCreationPopup.js'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import {
  groupToFieldPatch,
  fitZoomLevel,
  centreViewport,
  snap,
  syncSelectionEmphasis,
  fitFontSize,
} from './fabricUtils.js'
import { fieldCanvasLabel } from './fieldLabel.js'
import type { TextField } from '@template-goblin/types'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FabricCanvasHandle {
  /** Ref to the live Fabric canvas instance (null before mount). */
  fabricRef: React.RefObject<FabricCanvas | null>
  /**
   * State mirror of `fabricRef.current`. Effects that react to the canvas
   * being created or disposed MUST depend on this (refs have stable identity
   * and don't re-fire deps). Introduced to fix GH #17 — the ResizeObserver
   * and auto-fit effects were attached to the onboarding picker on first
   * render and never re-ran after the canvas subtree mounted.
   */
  fabricInstance: FabricCanvas | null
  /** Ref-callback for the <canvas> element. */
  setCanvasEl: (el: HTMLCanvasElement | null) => void
  /** Ref for pan-mode state (read/written by keyboard handler). */
  spacePanModeRef: React.MutableRefObject<boolean>
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFabricCanvas(
  containerRef: React.RefObject<HTMLDivElement | null>,
  setPendingDraft: React.Dispatch<React.SetStateAction<FieldCreationDraft | null>>,
): FabricCanvasHandle {
  const fabricRef = useRef<FabricCanvas | null>(null)
  // State mirror of fabricRef — used by effects as a dep so they re-run when
  // the Fabric instance is created or disposed (fixes GH #17).
  const [fabricInstance, setFabricInstance] = useState<FabricCanvas | null>(null)

  // Draw-to-create state (refs for perf — no re-render during gestures)
  const drawStartRef = useRef<{ x: number; y: number } | null>(null)
  const drawPreviewRef = useRef<FabricRect | null>(null)

  // Pan state (refs — Fabric handles its own cursor rendering)
  const isPanningRef = useRef(false) as React.MutableRefObject<boolean>
  const spacePanModeRef = useRef(false) as React.MutableRefObject<boolean>
  const panLastRef = useRef<{ x: number; y: number } | null>(null)

  // ── Ref-callback (REQ-040, AC-041, AC-052) ─────────────────────────────
  const setCanvasEl = useCallback(
    (el: HTMLCanvasElement | null) => {
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
        setFabricInstance(null)
      }
      if (!el) return

      // Container ref is populated by the *parent* div's ref-callback which
      // fires after this canvas ref-callback (React attaches child refs before
      // parent refs in the same commit).  Read from the DOM element directly
      // if containerRef.current is not yet set; fall back to 800×600 only when
      // the parent element itself cannot be found.
      const container =
        containerRef.current ?? (el.parentElement?.parentElement as HTMLDivElement | null)
      const w = container?.clientWidth || 800
      const h = container?.clientHeight || 600

      const fc = new FabricCanvas(el, {
        width: w,
        height: h,
        selection: true,
        preserveObjectStacking: true,
        controlsAboveOverlay: true,
        fireMiddleClick: true,
        fireRightClick: true,
      })
      fabricRef.current = fc
      setFabricInstance(fc)

      // Expose for Playwright / dev-mode inspection
      if (import.meta.env.DEV) {
        ;(window as unknown as { __fabricCanvas?: FabricCanvas }).__fabricCanvas = fc
      }

      wireSelectionEvents(fc)
      wireDragResizeEvents(fc)
      wireMouseEvents(
        fc,
        drawStartRef,
        drawPreviewRef,
        isPanningRef,
        spacePanModeRef,
        panLastRef,
        setPendingDraft,
      )
      wireWheelEvents(fc)

      // Auto-fit zoom on canvas creation.  Re-read container dimensions after
      // the current micro-task so the parent ref-callback has a chance to fire
      // and the DOM has been laid out (avoids 800×600 fallback when the
      // container ref fires after this canvas ref in the same React commit).
      const { width: pageW, height: pageH } = useTemplateStore.getState().meta
      if (pageW > 0 && pageH > 0) {
        requestAnimationFrame(() => {
          const cw = containerRef.current?.clientWidth || fc.width || 800
          const ch = containerRef.current?.clientHeight || fc.height || 600
          if (fc.width !== cw || fc.height !== ch) {
            fc.setDimensions({ width: cw, height: ch })
          }
          const z = fitZoomLevel(pageW, pageH, cw, ch, 40)
          const vpt = centreViewport(z, pageW, pageH, cw, ch)
          fc.setViewportTransform(vpt)
          useUiStore.getState().setZoom(z)
        })
      }
    },
    [setPendingDraft, containerRef],
  )

  return { fabricRef, fabricInstance, setCanvasEl, spacePanModeRef }
}

// ─── Event wiring helpers (pure functions, no hooks) ─────────────────────────

/** Selection events → store sync (REQ-011, REQ-017, REQ-052, REQ-053) */
function wireSelectionEvents(fc: FabricCanvas) {
  // Fabric's `opt.selected` / `opt.deselected` carry only the DELTA for an
  // event — not the full active set. For shift+click multi-select we need
  // the current snapshot of the canvas's active objects; read via
  // `fc.getActiveObjects()` which returns every individually-selected
  // object (flattening ActiveSelection wrappers).
  const sync = () => {
    const ids = fc
      .getActiveObjects()
      .map((o) => o.__fieldId)
      .filter((id): id is string => !!id)
    const current = useUiStore.getState().selectedFieldIds
    const sortedNew = [...ids].sort()
    const sortedCur = [...current].sort()
    const storeInSync =
      sortedNew.length === sortedCur.length && sortedNew.every((id, i) => id === sortedCur[i])
    if (!storeInSync) {
      if (ids.length === 0) {
        if (current.length > 0) useUiStore.getState().clearSelection()
      } else if (ids.length === 1) {
        const onlyId = ids[0]
        if (onlyId) useUiStore.getState().selectAndFocus(onlyId)
      } else {
        useUiStore.getState().selectFields(ids)
        // Multi-select still wants the properties panel visible so the user
        // can see "Multiple fields selected" context. Under GH #19 that
        // panel lives on the left.
        useUiStore.getState().setShowLeftPanel(true)
      }
    }
    // Visual emphasis reflects the canvas active-object set regardless of
    // whether the store changed (the set itself may still differ from the
    // previous emphasis state — e.g. on a shift-click that grew the selection).
    syncSelectionEmphasis(fc)
  }

  fc.on('selection:created', sync)
  fc.on('selection:updated', sync)
  fc.on('selection:cleared', () => {
    if (useUiStore.getState().selectedFieldIds.length > 0) {
      useUiStore.getState().clearSelection()
    }
    syncSelectionEmphasis(fc)
  })
}

/** Drag/resize commit + snap (REQ-008, REQ-012, REQ-013, REQ-051) */
function wireDragResizeEvents(fc: FabricCanvas) {
  fc.on('object:modified', (opt) => {
    const g = opt.target
    if (!g?.__fieldId) return
    const { showGrid: sg, gridSize: gs } = useUiStore.getState()
    const patch = groupToFieldPatch(g as FabricGroup, gs, sg)
    const store = useTemplateStore.getState()
    store.moveField(g.__fieldId, patch.x, patch.y)
    store.resizeField(g.__fieldId, patch.width, patch.height)

    // Sync fitted fontSize back to the store so the sidebar reflects what
    // the user actually sees on the canvas. Applies to text fields where
    // the rendered fontSize is auto-fitted: every static text field
    // (fixed string, fitted to rect) and dynamic text with auto-fit on.
    const field = store.fields.find((f) => f.id === g.__fieldId)
    if (!field || field.type !== 'text') return
    const tf = field as TextField
    const isStatic = tf.source?.mode === 'static'
    const autoFit = tf.style.fontSizeDynamic === true
    if (!isStatic && !autoFit) return
    const label = fieldCanvasLabel(tf)
    if (!label) return
    const innerPad = 6
    const labelW = Math.max(1, patch.width - innerPad * 2)
    const labelH = Math.max(1, patch.height - innerPad * 2)
    const fitted = fitFontSize(label, labelW, labelH, tf.style.fontFamily || 'sans-serif')
    if (fitted >= 8 && fitted !== tf.style.fontSize) {
      store.updateFieldStyle(g.__fieldId, { fontSize: fitted })
    }
  })

  fc.on('object:moving', (opt) => {
    const obj = opt.target
    if (!obj) return
    const { showGrid: sg, gridSize: gs } = useUiStore.getState()
    obj.set({
      left: snap(obj.left ?? 0, gs, sg),
      top: snap(obj.top ?? 0, gs, sg),
    })
  })
}

/** Mouse events: context menu, draw-to-create, pan, dblclick */
function wireMouseEvents(
  fc: FabricCanvas,
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
      const vpt = fc.viewportTransform
      if (vpt) {
        vpt[4] += e.clientX - panLastRef.current.x
        vpt[5] += e.clientY - panLastRef.current.y
        fc.requestRenderAll()
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

/** Wheel events: zoom + pan (REQ-037..039, AC-037..040) */
function wireWheelEvents(fc: FabricCanvas) {
  fc.on('mouse:wheel', (opt) => {
    const e = opt.e as WheelEvent
    e.preventDefault()
    e.stopPropagation()

    const isZoom = e.ctrlKey || e.metaKey
    if (isZoom) {
      const currentZoom = fc.getZoom()
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = Math.max(0.1, Math.min(5, currentZoom * factor))
      fc.zoomToPoint(new Point(e.offsetX, e.offsetY), newZoom)
      useUiStore.getState().setZoom(newZoom)
    } else if (e.shiftKey) {
      const vpt = fc.viewportTransform
      if (vpt) {
        vpt[4] -= e.deltaY || e.deltaX
        fc.requestRenderAll()
      }
    } else {
      const vpt = fc.viewportTransform
      if (vpt) {
        vpt[5] -= e.deltaY
        vpt[4] -= e.deltaX
        fc.requestRenderAll()
      }
    }
  })
}
