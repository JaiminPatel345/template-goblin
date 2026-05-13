import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SketchPicker, type ColorResult } from 'react-color'

interface ColorPickerPopoverProps {
  value: string
  onChange: (hex: string) => void
  ariaLabel?: string
  /** Swatch dimensions — defaults to a compact rectangle. */
  swatchWidth?: number
  swatchHeight?: number
}

/**
 * Compact hex-colour swatch that opens a SketchPicker (react-color) in a
 * popover when clicked. Replaces the native `<input type="color">` which
 * caused the whole page to freeze on some browsers / GPU configurations
 * when the OS-level picker was open. The popover closes on outside click
 * and on Escape.
 */
export function ColorPickerPopover({
  value,
  onChange,
  ariaLabel,
  swatchWidth = 28,
  swatchHeight = 24,
}: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const wrapperRef = useRef<HTMLSpanElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)

  // Position the popover relative to the swatch in viewport coords so it
  // sits in front of every panel rather than being clipped by a sidebar's
  // overflow boundary.
  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return
    const r = wrapperRef.current.getBoundingClientRect()
    const POPOVER_W = 220
    const POPOVER_H = 280
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

  const handleChange = useCallback(
    (result: ColorResult) => {
      onChange(result.hex)
    },
    [onChange],
  )

  return (
    <span ref={wrapperRef} style={{ display: 'inline-block', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel ?? 'Select color'}
        aria-expanded={open}
        title={value}
        style={{
          width: swatchWidth,
          height: swatchHeight,
          padding: 0,
          border: '1px solid var(--border)',
          borderRadius: 3,
          cursor: 'pointer',
          background: value,
        }}
      />
      {open && position && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={ariaLabel ?? 'Color picker'}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 2000,
          }}
        >
          <SketchPicker
            color={value}
            onChange={handleChange}
            disableAlpha
            presetColors={[
              '#000000',
              '#ffffff',
              '#ef4444',
              '#f59e0b',
              '#22c55e',
              '#3b82f6',
              '#8b5cf6',
              '#ec4899',
              '#64748b',
              '#0a0a0a',
            ]}
          />
        </div>
      )}
    </span>
  )
}
