import { forwardRef, type ReactNode } from 'react'

/**
 * A row-1 menu trigger (#128) — File / Edit / Insert / Format / View /
 * Help. Looks like a text-only button until hovered or active. Active
 * state mirrors the user's currently-selected tab so the ribbon below
 * stays in sync.
 *
 * Uses CSS variables (`--text-primary`, `--bg-tertiary`, `--accent`) so
 * the same component looks right in both light and dark themes.
 */
export interface MenuButtonProps {
  label: string
  active?: boolean
  onClick: () => void
  testid?: string
  /** Optional aria controls — useful when the button opens a dropdown. */
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
      style={{
        background: active ? 'var(--bg-tertiary)' : 'transparent',
        color: 'var(--text-primary)',
        border: 'none',
        padding: '6px 12px',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        borderRadius: 4,
        outline: 'none',
        transition: 'background 0.12s ease',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
      onFocus={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-tertiary)'
      }}
      onBlur={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
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
