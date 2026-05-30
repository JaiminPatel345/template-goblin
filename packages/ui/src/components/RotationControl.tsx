import { useState } from 'react'
import { createPortal } from 'react-dom'
import { DialFace, RotationDial } from './RotationDial.js'
import { NumberInput } from './NumberInput.js'
import { usePopoverAnchor } from './usePopoverAnchor.js'

/**
 * RotationControl (#167) — a compact toolbar trigger (a tiny dial preview +
 * the current angle) that opens a popover with a LARGE, easy-to-drag dial, a
 * numeric input for an exact angle, and 0/90/180/270 quick presets. Replaces
 * the bare inline dial, which was too small to use precisely.
 */
const PRESETS = [0, 90, 180, 270]
const norm = (deg: number) => ((Math.round(deg) % 360) + 360) % 360

interface Props {
  value: number
  onChange: (deg: number) => void
}

export function RotationControl({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { wrapperRef, popoverRef, position } = usePopoverAnchor(open, setOpen, {
    width: 168,
    height: 240,
  })

  return (
    <span ref={wrapperRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        className="tg-btn"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={`Rotate — ${value}°`}
        data-testid="toolbar-rotation"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          height: 26,
          padding: '0 6px',
        }}
      >
        <DialFace angle={value} size={16} />
        <span style={{ fontSize: 11, minWidth: 26, textAlign: 'left' }}>{value}°</span>
      </button>

      {open &&
        position &&
        // Portal to <body> so the fixed popover is positioned against the
        // viewport, not the floating toolbar — that toolbar uses
        // `transform: translateX(-50%)`, and a transformed ancestor becomes
        // the containing block for `position: fixed` descendants, which
        // otherwise pushed this popover off over the right panel (#167).
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Rotation"
            data-testid="rotation-popover"
            style={{
              position: 'fixed',
              top: position.top,
              left: position.left,
              zIndex: 2000,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 12,
              width: 168,
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <RotationDial value={value} onChange={onChange} size={130} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Angle</label>
              <NumberInput
                value={value}
                min={0}
                max={360}
                defaultValue={0}
                onChange={(v) => onChange(norm(v))}
                style={{ width: 64, height: 26 }}
                data-testid="rotation-angle-input"
              />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>°</span>
            </div>

            <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="tg-btn"
                  onClick={() => onChange(p)}
                  style={{
                    flex: 1,
                    fontSize: 11,
                    padding: '3px 0',
                    justifyContent: 'center',
                    ...(value === p ? { borderColor: 'var(--accent)' } : {}),
                  }}
                >
                  {p}°
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </span>
  )
}
