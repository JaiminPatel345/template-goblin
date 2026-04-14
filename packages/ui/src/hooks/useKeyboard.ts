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
