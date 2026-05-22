import { type ReactNode, type CSSProperties } from 'react'

/**
 * A single icon+label button used inside row-2 ribbon groups (#128).
 * Variants:
 *   - `default` — neutral text + icon, used for most actions.
 *   - `primary` — accent fill (e.g. Save), high visual weight.
 *   - `success` — green fill (used for the Save button on the menu bar).
 *   - `toggle` — active state lights up via `--bg-tertiary` background.
 *
 * Layout is two-line by default (icon above, label below) to match the
 * Word ribbon aesthetic; pass `compact` for a single-line variant when
 * a control lives in a tight cluster (e.g. zoom +/-).
 */
export interface RibbonButtonProps {
  label?: string
  icon?: ReactNode
  onClick?: () => void
  title?: string
  disabled?: boolean
  active?: boolean
  variant?: 'default' | 'primary' | 'success' | 'toggle'
  compact?: boolean
  testid?: string
  ariaLabel?: string
  /** Custom inline style overrides — used by the field-creation buttons
   *  that carry their type-specific colour. */
  style?: CSSProperties
  /** Arbitrary `data-*` attributes forwarded to the underlying button.
   *  Used e.g. by `PageLayoutMenu` to find its anchor via
   *  `[data-page-layout-anchor="true"]`. */
  dataAttrs?: Record<string, string>
}

export function RibbonButton({
  label,
  icon,
  onClick,
  title,
  disabled,
  active,
  variant = 'default',
  compact,
  testid,
  ariaLabel,
  style,
  dataAttrs,
}: RibbonButtonProps) {
  const base: CSSProperties = {
    display: 'flex',
    flexDirection: compact ? 'row' : 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: compact ? 4 : 2,
    minWidth: compact ? 28 : 48,
    padding: compact ? '4px 8px' : '4px 8px',
    fontSize: 11,
    fontWeight: 500,
    color: variant === 'primary' || variant === 'success' ? '#fff' : 'var(--text-primary)',
    background:
      variant === 'primary'
        ? 'var(--accent)'
        : variant === 'success'
          ? '#16a34a'
          : active
            ? 'var(--bg-tertiary)'
            : 'transparent',
    border: variant === 'primary' || variant === 'success' ? 'none' : '1px solid transparent',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    transition: 'background 0.12s ease, border-color 0.12s ease',
    whiteSpace: 'nowrap',
  }

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      title={title}
      disabled={disabled}
      aria-pressed={variant === 'toggle' ? active : undefined}
      aria-label={ariaLabel ?? label ?? title}
      data-testid={testid}
      {...(dataAttrs ?? {})}
      style={{ ...base, ...style }}
      onMouseEnter={(e) => {
        if (disabled) return
        const el = e.currentTarget as HTMLElement
        if (variant === 'primary') el.style.background = 'var(--accent-hover)'
        else if (variant === 'success') el.style.background = '#0a7a32'
        else if (!active) el.style.background = 'var(--bg-tertiary)'
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        const el = e.currentTarget as HTMLElement
        if (variant === 'primary') el.style.background = 'var(--accent)'
        else if (variant === 'success') el.style.background = '#16a34a'
        else if (!active) el.style.background = 'transparent'
      }}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label && <span>{label}</span>}
    </button>
  )
}
