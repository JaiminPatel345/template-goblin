import { type ReactNode } from 'react'

/**
 * Shared button shape used inside dialog action rows. Three variants:
 *  - 'primary' — accent-filled, default confirm action.
 *  - 'danger'  — destructive variant, painted in --error.
 *  - 'ghost'   — text + border, used for Cancel.
 *
 * Sized to --control-height-lg (32 px) so dialog actions read a bit
 * larger than the toolbar's 28 px controls.
 */
export interface DialogButtonProps {
  variant?: 'primary' | 'danger' | 'ghost'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
  autoFocus?: boolean
  testid?: string
  children: ReactNode
}

export function DialogButton({
  variant = 'ghost',
  onClick,
  disabled,
  type = 'button',
  autoFocus,
  testid,
  children,
}: DialogButtonProps) {
  const styles = stylesFor(variant)
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      autoFocus={autoFocus}
      data-testid={testid}
      style={{
        height: 'var(--control-height-lg)',
        padding: '0 14px',
        borderRadius: 'var(--radius-md)',
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--font-weight-medium)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'background var(--duration-fast) var(--ease-out)',
        ...styles,
      }}
    >
      {children}
    </button>
  )
}

function stylesFor(variant: NonNullable<DialogButtonProps['variant']>): React.CSSProperties {
  if (variant === 'primary') {
    return {
      background: 'var(--accent)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent',
    }
  }
  if (variant === 'danger') {
    return {
      background: 'var(--error)',
      color: 'var(--text-on-accent)',
      border: '1px solid transparent',
    }
  }
  return {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  }
}
