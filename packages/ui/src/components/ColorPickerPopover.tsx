import { useState } from 'react'
import { CHECKER_STYLE } from './colorSwatch.js'
import { ColorPopoverPanel } from './ColorPopoverPanel.js'
import { usePopoverAnchor } from './usePopoverAnchor.js'

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
  const { wrapperRef, popoverRef, position } = usePopoverAnchor(open, setOpen)

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
