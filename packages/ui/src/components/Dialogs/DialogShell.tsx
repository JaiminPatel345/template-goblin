import * as RadixDialog from '@radix-ui/react-dialog'
import { type ReactNode } from 'react'

/**
 * Shared Radix-Dialog wrapper used by Alert / Confirm / Prompt. Owns
 * overlay + content positioning + token-driven styling so the three
 * call-site shapes only differ in body content and action row.
 *
 * Radix handles focus-trap, scroll-lock, ESC, portal, ARIA labelling —
 * we just paint.
 */
export interface DialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  /** Action row, rendered at the bottom of the dialog body. */
  actions: ReactNode
  /** ARIA description id wiring is handled by Radix when set. */
  descriptionId?: string
  /** Optional accent stripe on the top edge — info/success/warn/danger. */
  accent?: 'info' | 'success' | 'warning' | 'danger'
  testid?: string
}

const ACCENT_COLOR: Record<NonNullable<DialogShellProps['accent']>, string> = {
  info: 'var(--info)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--error)',
}

export function DialogShell({
  open,
  onOpenChange,
  title,
  children,
  actions,
  accent,
  testid,
}: DialogShellProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-overlay)',
            backdropFilter: 'blur(4px)',
            zIndex: 'var(--z-overlay)' as unknown as number,
            animation: 'tg-dialog-overlay-in 0.16s var(--ease-out)',
          }}
        />
        <RadixDialog.Content
          data-testid={testid}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 'var(--z-modal)' as unknown as number,
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-modal)',
            minWidth: 360,
            maxWidth: 'min(520px, calc(100vw - 32px))',
            padding: 'var(--space-6)',
            outline: 'none',
            animation: 'tg-dialog-content-in 0.18s var(--ease-out)',
          }}
        >
          {accent && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: ACCENT_COLOR[accent],
                borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              }}
            />
          )}
          <RadixDialog.Title
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              margin: 0,
              marginBottom: 'var(--space-3)',
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </RadixDialog.Title>
          <div style={{ marginBottom: 'var(--space-6)' }}>{children}</div>
          <div
            style={{
              display: 'flex',
              gap: 'var(--space-2)',
              justifyContent: 'flex-end',
            }}
          >
            {actions}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
