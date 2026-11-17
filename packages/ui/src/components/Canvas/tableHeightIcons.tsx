import type { ReactNode } from 'react'

/**
 * Inline SVG icon representing Fixed Height mode.
 */
export function FixedHeightIcon(): ReactNode {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <line x1="2" y1="6" x2="14" y2="6" strokeWidth="1.2" />
      <line x1="2" y1="10" x2="14" y2="10" strokeWidth="1.2" />
      <line x1="6" y1="2" x2="6" y2="14" strokeWidth="1.2" />
      <line x1="10" y1="2" x2="10" y2="14" strokeWidth="1.2" />
    </svg>
  )
}

/**
 * Inline SVG icon representing Single Page Dynamic Height mode.
 */
export function SinglePageDynamicIcon(): ReactNode {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="12" height="6" rx="1.5" />
      <path d="M5 5h6" strokeWidth="1.2" />
      <path
        d="M8 8v5m0 0l-2-2m2 2l2-2"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Inline SVG icon representing Multi-Page Continuation Dynamic mode.
 */
export function MultiPageDynamicIcon(): ReactNode {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <rect x="4" y="1" width="10" height="11" rx="1.5" />
      <path d="M2 5v8a2 2 0 002 2h7" strokeLinecap="round" />
      <line x1="6" y1="4" x2="12" y2="4" strokeWidth="1.2" />
      <line x1="6" y1="7" x2="12" y2="7" strokeWidth="1.2" />
      <line x1="6" y1="10" x2="10" y2="10" strokeWidth="1.2" />
    </svg>
  )
}

/**
 * Inline SVG icon for the Compare / Help button.
 */
export function TableHeightHelpIcon(): ReactNode {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" />
      <path d="M6.5 6.5a1.5 1.5 0 013 0c0 1-1.5 1.5-1.5 2.5" />
      <circle cx="8" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}
