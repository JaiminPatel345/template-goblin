import { useRef } from 'react'

/**
 * RotationDial (#167 follow-up) — a compact circular angle control. The user
 * drags the knob around the rim and the bound element rotates live; 0° points
 * up and the angle increases clockwise to match Fabric's `angle`. Lives in the
 * floating selection toolbar so rotation is reachable even though the toolbar
 * overlays Fabric's rotate handle.
 */
interface Props {
  /** Current angle in degrees [0, 360). */
  value: number
  /** Called continuously while dragging with the new angle [0, 360). */
  onChange: (deg: number) => void
  size?: number
}

/** Pointer position → angle in degrees, 0 = up, clockwise positive. */
function angleFromPointer(el: HTMLElement, clientX: number, clientY: number): number {
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const deg = (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI
  return ((Math.round(deg) % 360) + 360) % 360
}

export function RotationDial({ value, onChange, size = 30 }: Props) {
  const ref = useRef<HTMLButtonElement | null>(null)
  const radius = size / 2

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    onChange(angleFromPointer(el, e.clientX, e.clientY))
    const move = (ev: PointerEvent) => onChange(angleFromPointer(el, ev.clientX, ev.clientY))
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Knob position on the rim for the current angle (-90° so 0° points up).
  const rad = ((value - 90) * Math.PI) / 180
  const knobX = radius + Math.cos(rad) * (radius - 4)
  const knobY = radius + Math.sin(rad) * (radius - 4)

  return (
    <button
      type="button"
      ref={ref}
      onPointerDown={onPointerDown}
      title={`Rotate — ${value}°`}
      aria-label={`Rotate, ${value} degrees`}
      data-testid="toolbar-rotation-dial"
      style={{
        width: size,
        height: size,
        minWidth: size,
        padding: 0,
        flexShrink: 0,
        position: 'relative',
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-primary)',
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      {/* hub */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 3,
          height: 3,
          borderRadius: '50%',
          background: 'var(--text-muted)',
          transform: 'translate(-50%, -50%)',
        }}
      />
      {/* draggable knob showing the current angle */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: knobX,
          top: knobY,
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--accent)',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </button>
  )
}
