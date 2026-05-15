/**
 * Constants for the smart-alignment-guides feature (#41).
 *
 * Tolerances are in canvas object-space points (NOT viewport pixels) so
 * snapping behaves consistently across zoom levels — see Fabric.js issue
 * #4042 and the comment block in `usePageBoundsEnforcement.ts` for context.
 */

/** Base magnetic-snap radius, in points. The user-visible target. */
export const SNAP_DISTANCE_PT = 6

/**
 * Lower / upper clamps for the zoom-adjusted tolerance. At 25% zoom 6pt is
 * only 1.5 visual px (effectively unreachable), and at 400% zoom 6pt is
 * 24 visual px (sticks too aggressively). Clamping keeps the snap usable
 * across the full zoom range.
 */
export const SNAP_DISTANCE_MIN_PT = 6
export const SNAP_DISTANCE_MAX_PT = 24

/** Compute the zoom-aware snap tolerance for a given Fabric viewport zoom. */
export function snapToleranceForZoom(zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0) return SNAP_DISTANCE_PT
  const scaled = SNAP_DISTANCE_PT / zoom
  return Math.min(SNAP_DISTANCE_MAX_PT, Math.max(SNAP_DISTANCE_MIN_PT, scaled))
}

/** Guide-line stroke colours. Pink for object alignment, cyan for page edges. */
export const GUIDE_COLOR_OBJECT = '#FF3D7F'
export const GUIDE_COLOR_PAGE = '#22D3EE'
export const GUIDE_COLOR_SPACING = '#FF3D7F'

/** Guide line width in screen px (kept uniform under zoom via `strokeUniform`). */
export const GUIDE_STROKE_WIDTH = 1

/** Equal-spacing match tolerance in points. */
export const SPACING_MATCH_TOLERANCE_PT = 1
