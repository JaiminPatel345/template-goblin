/**
 * useCanvasKeyboard — keyboard shortcuts for the canvas:
 *   - Space: pan mode (REQ-035)
 *   - Delete/Backspace: remove selected fields
 *   - Ctrl+0: zoom to fit (REQ-041)
 *   - Ctrl+1: zoom 100% at same centre (REQ-042)
 */
import { useEffect } from 'react'
import type { Canvas as FabricCanvas } from 'fabric'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { fitZoomLevel, centreViewport } from './fabricUtils.js'

export function useCanvasKeyboard(
  fabricRef: React.RefObject<FabricCanvas | null>,
  spacePanModeRef: React.MutableRefObject<boolean>,
) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isTyping =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)

      // ── Space → pan mode ────────────────────────────────────────────
      if (e.code === 'Space' && !isTyping) {
        e.preventDefault()
        spacePanModeRef.current = true
        const fc = fabricRef.current
        if (fc) {
          fc.defaultCursor = 'grab'
          fc.hoverCursor = 'grab'
          fc.selection = false
          fc.skipTargetFind = true
        }
      }

      // ── Delete / Backspace → remove selected ────────────────────────
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        const ids = useUiStore.getState().selectedFieldIds
        if (ids.length > 0) {
          useTemplateStore.getState().removeFields(ids)
          useUiStore.getState().clearSelection()
        }
      }

      // ── Ctrl/Cmd + 0 → zoom to fit ────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        const fc = fabricRef.current
        if (!fc) return
        const canW = fc.width ?? 0
        const canH = fc.height ?? 0
        const { width: pw, height: ph } = useTemplateStore.getState().meta
        if (pw <= 0 || ph <= 0) return
        const z = fitZoomLevel(pw, ph, canW, canH, 16)
        const vpt = centreViewport(z, pw, ph, canW, canH)
        fc.setViewportTransform(vpt)
        fc.requestRenderAll()
        useUiStore.getState().setZoom(z)
      }

      // ── Ctrl/Cmd + 1 → zoom 100% (keep centre point) ──────────────
      if ((e.ctrlKey || e.metaKey) && e.key === '1') {
        e.preventDefault()
        const fc = fabricRef.current
        if (!fc) return
        const canW = fc.width ?? 0
        const canH = fc.height ?? 0
        const currentVpt = fc.viewportTransform
        const currentZoom = currentVpt[0]
        // Page point currently at the viewport centre
        const cx = (canW / 2 - currentVpt[4]) / currentZoom
        const cy = (canH / 2 - currentVpt[5]) / currentZoom
        // New transform at zoom 1 centred on the same point
        fc.setViewportTransform([1, 0, 0, 1, canW / 2 - cx, canH / 2 - cy])
        fc.requestRenderAll()
        useUiStore.getState().setZoom(1)
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        spacePanModeRef.current = false
        const fc = fabricRef.current
        if (fc) {
          fc.defaultCursor = 'default'
          fc.hoverCursor = 'move'
          fc.selection = true
          fc.skipTargetFind = false
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [fabricRef, spacePanModeRef])
}
