/**
 * useSelectionAnchor (#167) — track the on-screen bounding box of a single
 * selected field's Fabric group so a floating overlay (the selection
 * toolbar) can anchor to it.
 *
 * Coordinate model (matches the rest of the canvas, see `useFabricSync`):
 *  - Objects live in *scene* coordinates (page points); `getBoundingRect()`
 *    returns that scene-space AABB.
 *  - Zoom is applied via `viewportTransform = [zoom,0,0,zoom,0,0]` with no
 *    pan translation — panning is the container's native scroll. So
 *    `sceneCoord * zoom` is the offset inside the `<canvas>` element, and
 *    the element's own `getBoundingClientRect()` already folds in the scroll
 *    position. Screen coord = `canvasRect + sceneCoord * zoom`.
 *
 * Re-anchors on every Fabric repaint (`after:render` fires for drag, scale,
 * rotate, and zoom) plus window scroll/resize (which Fabric does NOT repaint
 * on — that is how pan reaches us). Returns `null` whenever the field can't
 * be located, so callers render nothing.
 */
import { useEffect, useState } from 'react'
import type { Canvas as FabricCanvas, FabricObject } from 'fabric'

export interface SelectionAnchor {
  /** Viewport X of the selection's horizontal centre. */
  centerX: number
  /** Viewport Y of the selection's top edge. */
  top: number
  /** Viewport Y of the selection's bottom edge. */
  bottom: number
}

const EPSILON = 0.5

export function useSelectionAnchor(
  fc: FabricCanvas | null,
  fieldId: string | null,
): SelectionAnchor | null {
  const [anchor, setAnchor] = useState<SelectionAnchor | null>(null)

  useEffect(() => {
    if (!fc || !fieldId) {
      setAnchor(null)
      return
    }

    const findGroup = (): FabricObject | null => {
      const active = fc.getActiveObject()
      if (active && active.__fieldId === fieldId) return active
      return fc.getObjects().find((o) => o.__fieldId === fieldId) ?? null
    }

    const compute = () => {
      const g = findGroup()
      const canvasEl = fc.upperCanvasEl ?? fc.lowerCanvasEl
      if (!g || !canvasEl) {
        setAnchor(null)
        return
      }
      g.setCoords()
      const br = g.getBoundingRect()
      const zoom = fc.getZoom()
      const rect = canvasEl.getBoundingClientRect()
      const left = rect.left + br.left * zoom
      const top = rect.top + br.top * zoom
      const width = br.width * zoom
      const height = br.height * zoom
      const next: SelectionAnchor = {
        centerX: left + width / 2,
        top,
        bottom: top + height,
      }
      setAnchor((prev) =>
        prev &&
        Math.abs(prev.centerX - next.centerX) < EPSILON &&
        Math.abs(prev.top - next.top) < EPSILON &&
        Math.abs(prev.bottom - next.bottom) < EPSILON
          ? prev
          : next,
      )
    }

    compute()
    fc.on('after:render', compute)
    // Pan is container scroll + window scroll/resize never repaint Fabric, so
    // listen for them explicitly. Capture phase catches scrolls in any
    // ancestor scroll container, not just the window.
    window.addEventListener('scroll', compute, true)
    window.addEventListener('resize', compute)
    return () => {
      fc.off('after:render', compute)
      window.removeEventListener('scroll', compute, true)
      window.removeEventListener('resize', compute)
    }
  }, [fc, fieldId])

  return anchor
}
