import type { SVGProps } from 'react'

/**
 * Inline SVG icons shared across the UI. Centralising them here avoids
 * duplicating the same path data in multiple components. Every icon accepts
 * standard `SVGProps`: callers pass `width`, `height`, `stroke`, etc. to
 * customise, and the component renders a `currentColor`-stroked SVG by
 * default so callers can colour via CSS `color`.
 *
 * CLAUDE.md Hard Rule 7: no external icon libraries — inline SVGs only.
 */

type IconProps = SVGProps<SVGSVGElement>

function Base({ children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={rest.width ?? 16}
      height={rest.height ?? 16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={rest.strokeWidth ?? 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** Close / dismiss — two crossing diagonal lines. */
export function CloseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Base>
  )
}

/** Image frame with mountain + sun used for the background upload zone. */
export function ImageFrameIcon(props: IconProps) {
  return (
    <Base strokeWidth={1.5} {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </Base>
  )
}

/** Target dot inside a ring — used for the solid-color picker entry. */
export function ColorTargetIcon(props: IconProps) {
  return (
    <Base strokeWidth={1.5} {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </Base>
  )
}

/** Text "A" icon for the text-field toolbar button. */
export function TextIcon(props: IconProps) {
  return (
    <Base {...props}>
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </Base>
  )
}

/** Table grid icon for the table-field toolbar button. */
export function TableIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </Base>
  )
}

/** Padlock / template lock icon. */
export function LockIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </Base>
  )
}

/** Plus / add icon. */
export function PlusIcon(props: IconProps) {
  return (
    <Base {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Base>
  )
}

/** Open eye — "selection toolbar visible" affordance (#167). */
export function EyeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  )
}

/** Eye with a slash — "hide the floating selection toolbar" button (#167). */
export function EyeOffIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </Base>
  )
}
