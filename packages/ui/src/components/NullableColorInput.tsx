import { useCallback } from 'react'
import { ColorPickerPopover } from './ColorPickerPopover.js'

interface NullableColorInputProps {
  /** Hex string when a colour is set; `null` for transparent / no-fill. */
  value: string | null
  onChange: (value: string | null) => void
  /** Hex used to re-seed the picker when toggling back from null. */
  fallback?: string
  ariaLabel?: string
}

/**
 * Colour control that can express "transparent" alongside hex values.
 *
 * Shows a SketchPicker swatch when `value` is a hex, and a checker-pattern
 * swatch labelled Transparent when `value` is `null`. The "Clear / Color"
 * toggle flips between the two states.
 *
 * GH #76 — used wherever a CellStyle / page background colour field can be
 * opted out of (table header bg, row bg, odd/even row bg, borders, page bg).
 */
export function NullableColorInput({
  value,
  onChange,
  fallback = '#ffffff',
  ariaLabel,
}: NullableColorInputProps) {
  const isTransparent = value === null

  const clear = useCallback(() => onChange(null), [onChange])
  const restore = useCallback(() => onChange(fallback), [onChange, fallback])

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      {isTransparent ? (
        <button
          type="button"
          onClick={restore}
          aria-label={
            ariaLabel ? `${ariaLabel} — transparent (click to set colour)` : 'Transparent'
          }
          title="Transparent — click to set a colour"
          style={{
            width: 28,
            height: 24,
            padding: 0,
            border: '1px solid var(--border, #ccc)',
            borderRadius: 3,
            cursor: 'pointer',
            backgroundImage:
              'linear-gradient(45deg, #ccc 25%, transparent 25%), ' +
              'linear-gradient(-45deg, #ccc 25%, transparent 25%), ' +
              'linear-gradient(45deg, transparent 75%, #ccc 75%), ' +
              'linear-gradient(-45deg, transparent 75%, #ccc 75%)',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
          }}
        />
      ) : (
        <ColorPickerPopover value={value} onChange={onChange} ariaLabel={ariaLabel} />
      )}
      <button
        type="button"
        className="tg-btn"
        onClick={isTransparent ? restore : clear}
        title={isTransparent ? 'Set a colour' : 'Make transparent'}
        aria-pressed={isTransparent}
        style={{
          fontSize: 11,
          padding: '2px 6px',
          border: '1px solid var(--border)',
        }}
      >
        {isTransparent ? 'Color' : 'Clear'}
      </button>
    </span>
  )
}
