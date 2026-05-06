/**
 * wireWheelEvents — `mouse:wheel` handler. Extracted from `useFabricCanvas.ts`
 * to honour Hard Rule #11.
 *
 * GH #66: only ctrl/meta+wheel is intercepted (for zoom). Plain wheel and
 * shift+wheel pass through so the browser's native scroll on the wrapping
 * `overflow: auto` container handles vertical / horizontal scroll. Pre-#66
 * the handler called `preventDefault()` on every wheel and translated
 * `viewportTransform`, which under the new `page * zoom` canvas-sizing model
 * shifted Fabric's drawing INSIDE its own pixel area instead of scrolling
 * the visible viewport.
 *
 * Ctrl/meta+wheel zoom still uses `setZoom` (not `zoomToPoint`) — the
 * zoom-sync effect in `useFabricSync.ts` rewrites the viewportTransform to
 * identity-with-zoom, so any translate from `zoomToPoint` would be wiped
 * before the next paint anyway. Browser scroll preservation handles the
 * "stay near where you were" feel after a zoom step.
 */
import type { Canvas as FabricCanvas } from 'fabric'
import { useUiStore } from '../../store/uiStore.js'

/** Wire ctrl/meta+wheel zoom on the canvas; defer all other wheel events
 *  to the browser so native scrollbars on the wrapping container pick them
 *  up (vertical, shift+wheel horizontal, trackpad two-finger). */
export function wireWheelEvents(fc: FabricCanvas) {
  fc.on('mouse:wheel', (opt) => {
    const e = opt.e as WheelEvent
    const isZoom = e.ctrlKey || e.metaKey
    if (!isZoom) return

    e.preventDefault()
    e.stopPropagation()

    const currentZoom = fc.getZoom()
    const factor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(5, currentZoom * factor))
    useUiStore.getState().setZoom(newZoom)
  })
}
