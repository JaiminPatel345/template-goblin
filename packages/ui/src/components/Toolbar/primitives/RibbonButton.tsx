import { type ReactNode, type CSSProperties } from 'react'
import { Tooltip } from '../../Tooltip.js'

/**
 * Single horizontal ribbon control (#64 v3 redesign). One row layout
 * across the entire toolbar — icon on the left, label on the right,
 * fixed height from `--control-height-md`. Drops the column / compact
 * split that made the old ribbon look unsorted (Left/Right stacked
 * vertically vs Zoom buttons row-compact vs Snap label-only — every
 * button now sits on the same baseline).
 *
 * Variants:
 *   - `default` — neutral text, hover lifts background.
 *   - `primary` — accent fill for the "do the thing" CTA (rare).
 *   - `success` — green fill for Save.
 *   - `toggle` — active state lights up via `tg-ribbon-btn--active`.
 *
 * If a `title` is supplied, the button is wrapped in a Radix Tooltip
 * (delay from `--tooltip-open-delay`) so non-technical users can hover
 * to learn what each control does without cluttering the visible label.
 *
 * Styling lives in `.tg-ribbon-btn` (App.css) — Tailwind v4 preflight
 * neutralises inline `<button>` backgrounds without CSS classes.
 */
export interface RibbonButtonProps {
  label?: string
  icon?: ReactNode
  onClick?: () => void
  title?: string
  disabled?: boolean
  active?: boolean
  variant?: 'default' | 'primary' | 'success' | 'toggle'
  /**
   * `compact` is retained for source-compatibility with #128 callers; in
   * the new system the only effect is that icon-only buttons (no label
   * passed) render as a 28×28 square via `.tg-ribbon-btn--icon-only`.
   */
  compact?: boolean
  testid?: string
  ariaLabel?: string
  /** Custom inline style overrides — used by pinned tools for type-tinted icons. */
  style?: CSSProperties
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
  testid,
  ariaLabel,
  style,
  dataAttrs,
}: RibbonButtonProps) {
  const iconOnly = !label && !!icon
  const cls = [
    'tg-ribbon-btn',
    iconOnly ? 'tg-ribbon-btn--icon-only' : '',
    variant === 'primary' ? 'tg-ribbon-btn--primary' : '',
    variant === 'success' ? 'tg-ribbon-btn--success' : '',
    active && (variant === 'toggle' || variant === 'default') ? 'tg-ribbon-btn--active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const button = (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
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

  // Skip the tooltip wrapper for disabled buttons — Radix's tooltip on
  // disabled buttons fights pointer-events; users get the visible label
  // instead. Also skip when there's no title to show.
  if (!title || disabled) return button
  return <Tooltip content={title}>{button}</Tooltip>
}
