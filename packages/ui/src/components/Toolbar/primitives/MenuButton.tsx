import { forwardRef, type ReactNode } from 'react'

/**
 * A row-1 menu trigger (#128) — File / Edit / Insert / Format / View /
 * Help. Looks like a text-only button until hovered or active. Active
 * state mirrors the user's currently-selected tab so the ribbon below
 * stays in sync. Styling lives in `.tg-menu-tab` (App.css) so it
 * outranks Tailwind preflight's button reset.
 */
export interface MenuButtonProps {
  label: string
  active?: boolean
  onClick: () => void
  testid?: string
  ariaControls?: string
}

export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(function MenuButton(
  { label, active, onClick, testid, ariaControls },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      data-testid={testid}
      aria-haspopup="menu"
      aria-expanded={active}
      aria-controls={ariaControls}
      className={`tg-menu-tab${active ? ' tg-menu-tab--active' : ''}`}
    >
      {label}
    </button>
  )
})

/** Vertical separator between row-1 groups (menus / pinned tools / CTAs). */
export function MenuSeparator() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 1,
        height: 18,
        background: 'var(--border)',
        margin: '0 6px',
      }}
    />
  )
}

/** Generic SVG-icon wrapper so menus can pass concise icon nodes. */
export function MenuIcon({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {children}
    </span>
  )
}
