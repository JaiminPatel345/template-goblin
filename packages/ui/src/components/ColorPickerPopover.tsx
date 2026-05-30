import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CHECKER_STYLE } from './colorSwatch.js'
import { ColorPopoverPanel } from './ColorPopoverPanel.js'

interface ColorPickerPopoverProps {
  /** Hex colour, or `null` for transparent / no-fill (when `allowTransparent`). */
  value: string | null
  onChange: (hex: string) => void
  ariaLabel?: string
  /** Swatch dimensions — defaults to a compact rectangle. */
  swatchWidth?: number
  swatchHeight?: number
  /**
   * When true, the swatch can express "transparent": a `null` value renders a
   * checker-pattern swatch and the popover shows a "Transparent" button (#167
   * — keeps the remove-fill option INSIDE the picker rather than as a separate
   * button outside the swatch). `onTransparent` is invoked when chosen.
   */
  allowTransparent?: boolean
  onTransparent?: () => void
}

/**
 * Compact hex-colour swatch that opens a colour picker popover when clicked
 * (`react-colorful`, #121). The popover panel (picker + hex + presets +
 * optional transparent button) lives in `ColorPopoverPanel`; this owns the
 * swatch, open state, viewport positioning, and outside-click / Escape dismiss.
 */
export function ColorPickerPopover({
  value,
  onChange,
  ariaLabel,
  swatchWidth = 28,
  swatchHeight = 24,
  allowTransparent = false,
  onTransparent,
}: ColorPickerPopoverProps) {
  const isTransparent = !value
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // Position the popover relative to the swatch in viewport coords so it sits
  // in front of every panel rather than being clipped by a sidebar overflow.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return
    const r = wrapperRef.current.getBoundingClientRect()
    const POPOVER_W = 220
    const POPOVER_H = 320
    const left = Math.min(window.innerWidth - POPOVER_W - 8, Math.max(8, r.right - POPOVER_W))
    const top = Math.min(window.innerHeight - POPOVER_H - 8, r.bottom + 4)
    setPosition({ top, left })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onDocDown(e: MouseEvent) {
      const t = e.target as Node | null
      if (!t) return
      if (popoverRef.current?.contains(t)) return
      if (wrapperRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <span ref={wrapperRef} style={{ display: 'inline-block', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel ?? 'Select color'}
        aria-expanded={open}
        title={value ?? 'Transparent'}
        data-testid="color-picker-swatch"
        style={{
          width: swatchWidth,
          height: swatchHeight,
          padding: 0,
          border: '1px solid var(--border)',
          borderRadius: 3,
          cursor: 'pointer',
          ...(isTransparent ? CHECKER_STYLE : { background: value }),
        }}
      />
      {open && position && (
        <ColorPopoverPanel
          value={value}
          onChange={onChange}
          position={position}
          popoverRef={popoverRef}
          ariaLabel={ariaLabel}
          allowTransparent={allowTransparent}
          onTransparent={onTransparent}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  )
}
