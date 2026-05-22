import type { ReactNode } from 'react'

/**
 * Visual cluster inside the row-2 ribbon (#128). Mirrors Word's ribbon
 * groups — a labelled box of related controls, separated from siblings
 * by a subtle vertical divider. Label shrinks to the bottom so the
 * cluster's primary controls dominate the eye.
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
        gap: 4,
        padding: '4px 10px',
        borderRight: '1px solid var(--border-light)',
        minHeight: 56,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>
      {label && (
        <div
          style={{
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: 0.4,
          }}
        >
          {label}
        </div>
      )}
    </div>
  )
}
