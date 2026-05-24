import type { ReactNode } from 'react'

/**
 * Visual cluster of related controls inside row-2 of the toolbar
 * (#64 v3). Mirrors Linear/Figma/Word groupings — a row of controls
 * with an uppercase label under it and a hairline divider on the
 * right. Sizing is driven by tokens so every group reads as the same
 * size regardless of how many controls it carries.
 */
export interface RibbonGroupProps {
  label?: string
  children: ReactNode
  testid?: string
}

export function RibbonGroup({ label, children, testid }: RibbonGroupProps) {
  return (
    <div
      data-testid={testid}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRight: '1px solid var(--border-light)',
        minHeight: 64,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
      {label && (
        <div
          style={{
            fontSize: 'var(--text-2xs)',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            lineHeight: 1,
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
