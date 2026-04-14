import { useRef, useCallback, useState } from 'react'

interface ResizeHandleProps {
  /** Which side of the parent the handle sits on */
  side: 'left' | 'right'
  /** Current width of the panel */
  width: number
  /** Callback to update width */
  onResize: (newWidth: number) => void
  /** Minimum width */
  min?: number
  /** Maximum width */
  max?: number
}

/**
 * Draggable resize handle for sidebars.
 * Place this inside a panel — it renders as a thin vertical strip
 * on the specified side that the user can drag to resize.
 */
export function ResizeHandle({ side, width, onResize, min = 180, max = 500 }: ResizeHandleProps) {
  const [active, setActive] = useState(false)
  const startRef = useRef<{ x: number; w: number } | null>(null)

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startRef.current = { x: e.clientX, w: width }
      setActive(true)

      function onMove(ev: MouseEvent) {
        if (!startRef.current) return
        const diff = ev.clientX - startRef.current.x
        const newWidth =
          side === 'right'
            ? Math.max(min, Math.min(max, startRef.current.w - diff))
            : Math.max(min, Math.min(max, startRef.current.w + diff))
        onResize(newWidth)
      }

      function onUp() {
        startRef.current = null
        setActive(false)
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    },
    [width, side, min, max, onResize],
  )

  return (
    <div
      className={`tg-resize-handle tg-resize-handle--${side} ${active ? 'tg-resize-handle--active' : ''}`}
      onMouseDown={handleMouseDown}
    />
  )
}
