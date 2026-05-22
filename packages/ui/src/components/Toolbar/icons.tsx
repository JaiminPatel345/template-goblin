import type { ReactNode } from 'react'

/**
 * Shared SVG icon set for the new menu bar + ribbon (#128). All icons
 * inherit colour via `stroke="currentColor"` so they automatically adapt
 * to light + dark themes through `--text-primary`. Hard Rule #7 — no
 * icon library; these are inline SVGs.
 */

interface IconBoxProps {
  size?: number
  children: ReactNode
  title?: string
}

function IconBox({ size = 16, children, title }: IconBoxProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={!title}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  )
}

export const OpenIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </IconBox>
)

export const NewIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </IconBox>
)

export const SaveIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </IconBox>
)

export const BackgroundIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </IconBox>
)

export const TextIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <polyline points="4 7 4 4 20 4 20 7" />
    <line x1="9" y1="20" x2="15" y2="20" />
    <line x1="12" y1="4" x2="12" y2="20" />
  </IconBox>
)

export const ImageIcon = BackgroundIcon

export const TableIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </IconBox>
)

export const PageLayoutIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <line x1="3" y1="8" x2="21" y2="8" />
    <line x1="3" y1="16" x2="21" y2="16" />
  </IconBox>
)

export const UndoIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </IconBox>
)

export const RedoIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
  </IconBox>
)

export const PreviewIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </IconBox>
)

export const LockedIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </IconBox>
)

export const UnlockedIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 9.9-1" />
  </IconBox>
)

export const SunIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </IconBox>
)

export const MoonIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </IconBox>
)

export const PanelLeftIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </IconBox>
)

export const ZoomInIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </IconBox>
)

export const ZoomOutIcon = ({ size }: { size?: number }) => (
  <IconBox size={size}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </IconBox>
)
