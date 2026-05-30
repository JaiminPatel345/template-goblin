import { HexColorPicker } from 'react-colorful'
import { CHECKER_STYLE, COLOR_PRESETS } from './colorSwatch.js'

/**
 * The floating panel of `ColorPickerPopover` — the saturation/value picker,
 * hex input, preset grid, and (optionally) the in-picker "Transparent"
 * button. Extracted to keep `ColorPickerPopover` under the line cap.
 */
interface Props {
  value: string | null
  onChange: (hex: string) => void
  position: { top: number; left: number }
  popoverRef: React.RefObject<HTMLDivElement>
  ariaLabel?: string
  allowTransparent: boolean
  onTransparent?: () => void
  onClose: () => void
}

export function ColorPopoverPanel({
  value,
  onChange,
  position,
  popoverRef,
  ariaLabel,
  allowTransparent,
  onTransparent,
  onClose,
}: Props) {
  const isTransparent = !value
  const safePickerColor = value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={ariaLabel ?? 'Color picker'}
      // #61 follow-up: a marker so outer modals can detect "a colour popover is
      // open" and skip their own Escape handler.
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
        onChange={(e) => onChange(e.target.value)}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginTop: 8 }}>
        {COLOR_PRESETS.map((hex) => (
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
        // Remove-fill (transparent) lives INSIDE the picker (#167).
        <button
          type="button"
          onClick={() => {
            onTransparent?.()
            onClose()
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
  )
}
