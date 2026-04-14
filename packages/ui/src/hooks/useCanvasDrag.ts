import { useCallback } from 'react'
import { useTemplateStore } from '../store/templateStore.js'
import { useUiStore } from '../store/uiStore.js'

/**
 * Hook for handling canvas drag events on fields.
 * Snaps to grid when snap mode is enabled.
 */
export function useCanvasDrag() {
  const moveField = useTemplateStore((s) => s.moveField)
  const showGrid = useUiStore((s) => s.showGrid)
  const gridSize = useUiStore((s) => s.gridSize)

  const snapToGrid = useCallback(
    (value: number) => {
      if (!showGrid) return value
      return Math.round(value / gridSize) * gridSize
    },
    [showGrid, gridSize],
  )

  const handleDragEnd = useCallback(
    (fieldId: string, x: number, y: number) => {
      moveField(fieldId, snapToGrid(x), snapToGrid(y))
    },
    [moveField, snapToGrid],
  )

  return { handleDragEnd, snapToGrid }
}
