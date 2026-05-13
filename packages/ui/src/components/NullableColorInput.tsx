import { useCallback } from 'react'

interface NullableColorInputProps {
  /** Hex string when a colour is set; `null` for transparent / no-fill. */
  value: string | null
  onChange: (value: string | null) => void
  /** Hex used to re-seed the native picker when toggling back from null. */
  fallback?: string
  className?: string
  ariaLabel?: string
}

/**
 * Colour picker that can express "transparent" alongside hex values.
 *
 * Renders the native `<input type="color">` when `value` is a hex string and
 * a checker-pattern swatch with the label "Transparent" when `value` is
 * `null`. The "✕" button toggles to `null`; clicking the transparent swatch
 * returns to the previous hex (or `fallback`).
 *
 * GH #76 — used wherever a CellStyle / page background colour field can be
 * opted out of (table header bg, row bg, odd/even row bg, borders, page bg).
 */
export function NullableColorInput({
  value,
  onChange,
  fallback = '#ffffff',
  className = 'tg-color-input',
  ariaLabel,
}: NullableColorInputProps) {
  const isTransparent = value === null

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value)
    },
    [onChange],
  )

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
        <input
          type="color"
          className={className}
          value={value ?? fallback}
          aria-label={ariaLabel}
          onChange={handleColorChange}
        />
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
