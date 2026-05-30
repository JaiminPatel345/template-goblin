import { ColorPickerPopover } from './ColorPickerPopover.js'

interface NullableColorInputProps {
  /** Hex string when a colour is set; `null` for transparent / no-fill. */
  value: string | null
  onChange: (value: string | null) => void
  ariaLabel?: string
}

/**
 * Colour control that can express "transparent" alongside hex values.
 *
 * #167 — this is now just the colour swatch: clicking it opens the picker,
 * and the "Transparent (no fill)" option lives INSIDE that popover. There is
 * no separate Clear / Color button beside the swatch. A `null` value shows a
 * checker-pattern swatch.
 *
 * Used wherever a colour field can be opted out of (text background, table
 * header / row / border backgrounds, page background).
 */
export function NullableColorInput({ value, onChange, ariaLabel }: NullableColorInputProps) {
  return (
    <ColorPickerPopover
      value={value}
      onChange={onChange}
      onTransparent={() => onChange(null)}
      allowTransparent
      ariaLabel={ariaLabel}
    />
  )
}
