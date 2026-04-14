import { Line } from 'react-konva'
import { useUiStore } from '../../store/uiStore.js'
import { useTemplateStore } from '../../store/templateStore.js'

/**
 * Renders a grid overlay on the canvas when snap-to-grid is enabled.
 */
export function GridOverlay() {
  const showGrid = useUiStore((s) => s.showGrid)
  const gridSize = useUiStore((s) => s.gridSize)
  const meta = useTemplateStore((s) => s.meta)

  if (!showGrid) return null

  const lines = []

  // Vertical lines
  for (let x = gridSize; x < meta.width; x += gridSize) {
    lines.push(
      <Line
        key={`v-${x}`}
        points={[x, 0, x, meta.height]}
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={0.5}
        listening={false}
      />,
    )
  }

  // Horizontal lines
  for (let y = gridSize; y < meta.height; y += gridSize) {
    lines.push(
      <Line
        key={`h-${y}`}
        points={[0, y, meta.width, y]}
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={0.5}
        listening={false}
      />,
    )
  }

  return <>{lines}</>
}
