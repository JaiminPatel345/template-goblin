import * as RadixTooltip from '@radix-ui/react-tooltip'
import { type ReactNode, useState } from 'react'

/**
 * App-wide tooltip primitive (#64 v3 redesign). Wraps Radix's headless
 * tooltip with our token-driven styling so every hover affordance in
 * the app reads as one consistent surface — same delay, same shadow,
 * same radius, same arrow.
 *
 * Default open-delay matches `--tooltip-open-delay` (600 ms) so the
 * tooltip doesn't flash on accidental pointer transit but feels snappy
 * once the user lingers — the production convention (Linear, Figma,
 * GitHub all sit in 500–700 ms).
 */
export interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayMs?: number
}

export function Tooltip({ content, children, side = 'bottom', delayMs = 600 }: TooltipProps) {
  const [open, setOpen] = useState(false)
  return (
    <RadixTooltip.Provider delayDuration={delayMs} skipDelayDuration={150}>
      <RadixTooltip.Root open={open} onOpenChange={setOpen}>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-weight-medium)',
              lineHeight: 1.3,
              maxWidth: 280,
              zIndex: 'var(--z-tooltip)' as unknown as number,
              animation: 'tg-tooltip-in 0.12s var(--ease-out)',
            }}
          >
            {content}
            <RadixTooltip.Arrow style={{ fill: 'var(--bg-elevated)' }} width={10} height={5} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  )
}
