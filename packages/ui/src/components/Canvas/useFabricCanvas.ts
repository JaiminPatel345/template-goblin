/**
 * useFabricCanvas — manages the Fabric.Canvas lifecycle.
 *
 * Creates the canvas via a ref-callback (REQ-040), wires the per-concern
 * Fabric event handlers (split into `wire*` modules to honour Hard Rule
 * #11), and disposes cleanly. Returns the handle consumed by `CanvasArea`.
 */
import { useRef, useCallback, useState } from 'react'
import { Canvas as FabricCanvas } from 'fabric'
import type { Rect as FabricRect } from 'fabric'
import type { FieldCreationDraft } from './FieldCreationPopup.js'
import { wireSelectionEvents } from './wireSelectionEvents.js'
import { wireDragResizeEvents } from './wireDragResizeEvents.js'
import { wireMouseEvents } from './wireMouseEvents.js'
import { wireWheelEvents } from './wireWheelEvents.js'

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

/**
 * React hook that owns a single Fabric.Canvas instance, wires every
 * Fabric-side event listener, and exposes a ref-callback for the underlying
 * `<canvas>` element. See {@link FabricCanvasHandle} for the return shape.
 */
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
        containerRef,
        drawStartRef,
        drawPreviewRef,
        isPanningRef,
        spacePanModeRef,
        panLastRef,
        setPendingDraft,
      )
      wireWheelEvents(fc)

      // Canvas dimensions / zoom are fully owned by useFabricSync's
      // zoom-sync effect — it fires on mount (fabricInstance changing
      // null → fc) and on every zoom / meta change, sizing the wrapper
      // to `meta * store.zoom`. Doing a setDimensions or setZoom here
      // would stomp the persisted zoom restored by the store on refresh.
    },
    [setPendingDraft, containerRef],
  )

  return { fabricRef, fabricInstance, setCanvasEl, spacePanModeRef }
}
