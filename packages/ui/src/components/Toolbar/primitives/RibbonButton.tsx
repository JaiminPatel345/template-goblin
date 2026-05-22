import { type ReactNode, type CSSProperties } from 'react'

/**
 * A single icon+label button used inside row-2 ribbon groups (#128).
 * Variants:
 *   - `default` — neutral text + icon, used for most actions.
 *   - `primary` — accent fill (e.g. Upload), high visual weight.
 *   - `success` — green fill (used for the Save button on the menu bar).
 *   - `toggle` — active state lights up via `--bg-tertiary` background.
 *
 * Styling lives in `.tg-ribbon-btn` (App.css). Inline styles can't
 * override Tailwind v4 preflight's `button { background-color: transparent }`
 * without `!important`, so we use CSS classes instead.
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
  /** Arbitrary `data-*` attributes forwarded to the underlying button. */
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
  const cls = [
    'tg-ribbon-btn',
    compact ? 'tg-ribbon-btn--compact' : '',
    variant === 'primary' ? 'tg-ribbon-btn--primary' : '',
    variant === 'success' ? 'tg-ribbon-btn--success' : '',
    active && (variant === 'toggle' || variant === 'default') ? 'tg-ribbon-btn--active' : '',
  ]
    .filter(Boolean)
    .join(' ')

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
      className={cls}
      style={style}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {label && <span>{label}</span>}
    </button>
  )
}
