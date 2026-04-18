import { useEffect } from 'react'
import { useTemplateStore } from '../store/templateStore.js'
import { useUiStore } from '../store/uiStore.js'
import { saveTemplate, openTemplate } from '../utils/saveOpen.js'

/**
 * Global keyboard shortcuts handler.
 *
 * - Ctrl/Cmd+S: Save template
 * - Ctrl/Cmd+O: Open template
 * - Ctrl/Cmd+Z: Undo
 * - Ctrl/Cmd+Shift+Z: Redo
 * - Ctrl/Cmd+0: Zoom to fit
 * - Ctrl/Cmd+1: Zoom to 100% (recenter viewport on canvas centre)
 * - Delete/Backspace: Remove selected fields
 * - Escape: Deselect / cancel tool
 */
export function useKeyboard(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey
      const locked = useTemplateStore.getState().meta.locked

      // Save (Ctrl+S)
      if (isMod && e.key === 's') {
        e.preventDefault()
        saveTemplate().catch((err) => {
          alert(err instanceof Error ? err.message : 'Save failed')
        })
        return
      }

      // Open (Ctrl+O)
      if (isMod && e.key === 'o') {
        e.preventDefault()
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.tgbl'
        input.onchange = () => {
          const file = input.files?.[0]
          if (file) {
            openTemplate(file).catch((err) => {
              alert(err instanceof Error ? err.message : 'Failed to open file')
            })
          }
        }
        input.click()
        return
      }

      // Zoom-to-fit (Ctrl/Cmd+0) and Zoom-to-100% (Ctrl/Cmd+1).
      // Both are wired into `uiStore`. We query the live canvas container by
      // data-testid so we can pass its real pixel size to `fitZoom`; if not
      // found (onboarding state), we fall back to the window size.
      if (isMod && e.key === '0') {
        e.preventDefault()
        const tmpl = useTemplateStore.getState()
        const ui = useUiStore.getState()
        const container = document.querySelector<HTMLDivElement>(
          '[data-testid="canvas-stage-wrapper"]',
        )?.parentElement as HTMLDivElement | null
        const cw = container?.clientWidth ?? window.innerWidth
        const ch = container?.clientHeight ?? window.innerHeight
        ui.fitZoom(cw, ch, tmpl.meta.width, tmpl.meta.height, 16)
        // Recentre the page inside the viewport.
        if (container) {
          requestAnimationFrame(() => {
            const newZoom = useUiStore.getState().zoom
            const stageW = tmpl.meta.width * newZoom
            const stageH = tmpl.meta.height * newZoom
            container.scrollLeft = Math.max(0, (stageW - container.clientWidth) / 2)
            container.scrollTop = Math.max(0, (stageH - container.clientHeight) / 2)
          })
        }
        return
      }

      if (isMod && e.key === '1') {
        e.preventDefault()
        const tmpl = useTemplateStore.getState()
        const ui = useUiStore.getState()
        const oldZoom = ui.zoom
        const container = document.querySelector<HTMLDivElement>(
          '[data-testid="canvas-stage-wrapper"]',
        )?.parentElement as HTMLDivElement | null
        // Remember the canvas point at the viewport centre so we can restore
        // it after the zoom change (AC-043 "viewport centre remains at the
        // same canvas point").
        let canvasCx = tmpl.meta.width / 2
        let canvasCy = tmpl.meta.height / 2
        if (container && oldZoom > 0) {
          canvasCx = (container.scrollLeft + container.clientWidth / 2) / oldZoom
          canvasCy = (container.scrollTop + container.clientHeight / 2) / oldZoom
        }
        ui.setZoom(1)
        if (container) {
          requestAnimationFrame(() => {
            container.scrollLeft = Math.max(0, canvasCx - container.clientWidth / 2)
            container.scrollTop = Math.max(0, canvasCy - container.clientHeight / 2)
          })
        }
        return
      }

      // Undo / Redo — skip if user is editing text in an input/textarea
      // so browser-native undo works for JSON editor, property inputs, etc.
      if (isMod && e.key === 'z') {
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return // let browser handle native undo/redo
        }
        e.preventDefault()
        if (e.shiftKey) {
          useTemplateStore.getState().redo()
        } else {
          useTemplateStore.getState().undo()
        }
        return
      }

      // Delete selected fields
      if ((e.key === 'Delete' || e.key === 'Backspace') && !locked) {
        const target = e.target as HTMLElement
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT'
        )
          return
        e.preventDefault()
        const selectedIds = useUiStore.getState().selectedFieldIds
        if (selectedIds.length > 0) {
          useTemplateStore.getState().removeFields(selectedIds)
          useUiStore.getState().clearSelection()
        }
        return
      }

      // Escape: deselect or cancel tool
      if (e.key === 'Escape') {
        const ui = useUiStore.getState()
        if (ui.activeTool !== 'select') {
          ui.setActiveTool('select')
        } else {
          ui.clearSelection()
        }
        ui.setContextMenu(null)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
