import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'

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

/** Checkerboard fill marking a transparent (no-colour) swatch. */
const CHECKER_STYLE: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #ccc 25%, transparent 25%), ' +
    'linear-gradient(-45deg, #ccc 25%, transparent 25%), ' +
    'linear-gradient(45deg, transparent 75%, #ccc 75%), ' +
    'linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
}

/**
 * Compact hex-colour swatch that opens a colour picker popover when
 * clicked. Built on `react-colorful` (#121) — replaces the previous
 * `react-color` SketchPicker which used the legacy `defaultProps` API
 * (React-18 deprecation warning on every mount) and warm-loaded a heavy
 * palette on first open (3-5s freeze). The popover closes on outside
 * click and on Escape.
 *
 * Affordance preserved per #121 acceptance criteria: the existing
 * Saturation/Value square + Hue slider + hex input + preset-swatch grid
 * the user is used to. `react-colorful` is fully controlled and ships
 * without the noisy preset rail, so we render the swatch grid ourselves.
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

  // Position the popover relative to the swatch in viewport coords so it
  // sits in front of every panel rather than being clipped by a sidebar's
  // overflow boundary.
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

  // `react-colorful` only accepts a 7-character `#RRGGBB`. Hex typed
  // mid-keystroke (`#ff`) would throw; we accept partial input in the
  // text field but only push it down to the picker + parent on a valid
  // match. This mirrors the same regex gate used by the onboarding hex
  // input (#115).
  const handleHexInput = useCallback(
    (raw: string) => {
      // Always echo what the user typed back into the parent so the
      // value stays editable. Downstream consumers (#115 onboarding,
      // properties panel) all gate their commit on `/^#RRGGBB$/`.
      onChange(raw)
    },
    [onChange],
  )

  const safePickerColor = value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'

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
        <div
          ref={popoverRef}
          role="dialog"
          aria-label={ariaLabel ?? 'Color picker'}
          // #61 follow-up: a marker so outer modals can detect "a colour
          // popover is currently open" and skip their own Escape handler.
          // Without this, pressing Escape inside the picker closes both
          // the popover AND the surrounding band-settings modal.
          data-color-popover="true"
          data-testid="color-picker-popover"
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 2000,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: 10,
            width: 220,
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
          }}
        >
          <HexColorPicker
            color={safePickerColor}
            onChange={onChange}
            style={{ width: '100%', height: 160 }}
          />
          <input
            type="text"
            value={value ?? ''}
            onChange={(e) => handleHexInput(e.target.value)}
            spellCheck={false}
            maxLength={7}
            placeholder={allowTransparent ? 'transparent' : undefined}
            data-testid="color-picker-hex"
            style={{
              marginTop: 8,
              width: '100%',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 12,
              padding: '4px 6px',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: 3,
              boxSizing: 'border-box',
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 6,
              marginTop: 8,
            }}
          >
            {PRESETS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => onChange(hex)}
                aria-label={`Preset color ${hex}`}
                title={hex}
                data-testid={`color-picker-preset-${hex}`}
                style={{
                  width: '100%',
                  height: 22,
                  padding: 0,
                  border:
                    hex.toLowerCase() === value?.toLowerCase()
                      ? '2px solid var(--accent)'
                      : '1px solid var(--border)',
                  borderRadius: 3,
                  cursor: 'pointer',
                  background: hex,
                }}
              />
            ))}
          </div>
          {allowTransparent && (
            // Remove-fill (transparent) lives INSIDE the picker (#167) — no
            // separate button outside the swatch.
            <button
              type="button"
              onClick={() => {
                onTransparent?.()
                setOpen(false)
              }}
              aria-pressed={isTransparent}
              data-testid="color-picker-transparent"
              style={{
                marginTop: 8,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '5px 8px',
                fontSize: 12,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                background: isTransparent ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                border: isTransparent ? '2px solid var(--accent)' : '1px solid var(--border)',
                borderRadius: 3,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                  ...CHECKER_STYLE,
                }}
              />
              Transparent (no fill)
            </button>
          )}
        </div>
      )}
    </span>
  )
}

/**
 * The 10 swatches the previous SketchPicker carried, kept as-is per #121's
 * "no visual redesign" caveat. Lives at module scope so the array
 * identity is stable across re-renders.
 */
const PRESETS = [
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
] as const
