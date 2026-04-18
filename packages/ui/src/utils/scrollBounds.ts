/**
 * Geometry helpers for the canvas scroll container (Workstream 5 fix).
 *
 * When the canvas Stage is rendered at zoom Z, its on-screen width is
 * `canvasWidth * zoom`. If that exceeds the scroll container's viewport
 * `viewportWidth`, we need scrollbars — and critically, the scrollable
 * overflow must be symmetric around centre so that scrolling fully left
 * reveals the Stage's left edge flush with the viewport's left edge,
 * mirroring the right side. The previous flex-center layout broke this
 * invariant because `justify-content: center` without `safe` pushes
 * negative free space to the end side only.
 *
 * These helpers are extracted from the component so they can be unit-tested
 * without rendering React.
 */

/** Dimensions of a single axis of the scroll container + canvas. */
export interface AxisGeometry {
  /** Unzoomed canvas extent (canvas-units, e.g. 595 for A4 width). */
  canvasExtent: number
  /** Current zoom factor (1.0 = 100%). */
  zoom: number
  /** Viewport extent of the scroll container, in CSS pixels. */
  viewportExtent: number
}

/** Scroll bounds for one axis, in CSS pixels. */
export interface ScrollBounds {
  /**
   * Overflow on the "start" side (left for X, top for Y). When the stage is
   * smaller than the viewport this is 0 (no scroll needed). When it's larger,
   * this is the amount of stage that lives to the left/above the centred
   * view, which is also the distance the user must scroll back to see it.
   */
  overflowStart: number
  /** Overflow on the "end" side (right/bottom). Always equal to overflowStart
   *  after the Workstream 5 fix: scroll bounds are symmetric around centre. */
  overflowEnd: number
  /** The scrollable extent total (`overflowStart + overflowEnd`). */
  totalOverflow: number
}

/**
 * Compute the symmetric scroll bounds for one axis of the canvas scroll
 * container.
 *
 * Contract:
 *   - If the zoomed stage fits in the viewport, both overflows are 0.
 *   - Otherwise the zoomed stage overflows by
 *     `(canvasExtent * zoom) - viewportExtent`, split evenly between the
 *     start and end sides so the user can scroll to either edge.
 *
 * This is what `justify-content: safe center` produces in the browser; the
 * function is both documentation and a testable invariant.
 */
export function computeScrollBounds(geo: AxisGeometry): ScrollBounds {
  const stageExtent = geo.canvasExtent * geo.zoom
  const total = Math.max(0, stageExtent - geo.viewportExtent)
  const half = total / 2
  return {
    overflowStart: half,
    overflowEnd: half,
    totalOverflow: total,
  }
}
