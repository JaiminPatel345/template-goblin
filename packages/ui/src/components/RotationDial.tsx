import { useRef } from 'react'

/**
 * RotationDial (#167) — a draggable circular angle control. 0° points up and
 * increases clockwise (matching Fabric's `angle`). The small dial proved too
 * fiddly inline, so the toolbar shows a compact `RotationControl` trigger that
 * opens a popover containing this dial at a large, easy-to-grab size.
 */

/** Pointer position → angle in degrees, 0 = up, clockwise positive. */
function angleFromPointer(el: HTMLElement, clientX: number, clientY: number): number {
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  const deg = (Math.atan2(clientX - cx, -(clientY - cy)) * 180) / Math.PI
  return ((Math.round(deg) % 360) + 360) % 360
}

/**
 * Presentational dial face — a circle with a hub and a knob placed on the rim
 * at `angle`. Shared by the interactive dial and the compact trigger preview.
 */
export function DialFace({ angle, size }: { angle: number; size: number }) {
  const radius = size / 2
  const inset = Math.max(3, size * 0.13)
  const knob = Math.max(5, size * 0.16)
  const rad = ((angle - 90) * Math.PI) / 180
  const knobX = radius + Math.cos(rad) * (radius - inset)
  const knobY = radius + Math.sin(rad) * (radius - inset)
  return (
    <span
      aria-hidden
      style={{
        position: 'relative',
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid var(--border)',
        background: 'var(--bg-primary)',
      }}
    >
      <span
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
      <span
        style={{
          position: 'absolute',
          left: knobX,
          top: knobY,
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: 'var(--accent)',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </span>
  )
}

interface Props {
  /** Current angle in degrees [0, 360). */
  value: number
  /** Called continuously while dragging with the new angle [0, 360). */
  onChange: (deg: number) => void
  size?: number
}

export function RotationDial({ value, onChange, size = 130 }: Props) {
  const ref = useRef<HTMLButtonElement | null>(null)

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

  return (
    <button
      type="button"
      ref={ref}
      onPointerDown={onPointerDown}
      aria-label={`Rotate, ${value} degrees`}
      data-testid="rotation-dial"
      style={{
        width: size,
        height: size,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'grab',
        touchAction: 'none',
      }}
    >
      <DialFace angle={value} size={size} />
    </button>
  )
}
