import { useTemplateStore } from '../store/templateStore.js'

/**
 * Provides undo/redo methods from the template store.
 * Also binds to keyboard shortcuts (handled by useKeyboard).
 */
export function useUndoRedo() {
  const undo = useTemplateStore((s) => s.undo)
  const redo = useTemplateStore((s) => s.redo)
  const canUndo = useTemplateStore((s) => s.canUndo())
  const canRedo = useTemplateStore((s) => s.canRedo())

  return { undo, redo, canUndo, canRedo }
}
