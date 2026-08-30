/**
 * Portrait / Landscape orientation toggle for the page-size step (#119).
 *
 * Orientation is *derived* from the page dimensions — landscape when the page
 * is wider than it is tall — so the control needs no extra state and stays in
 * sync with whatever size the user picked. Choosing the opposite orientation
 * swaps width and height via the `onSwap` callback; choosing the current one
 * is a no-op.
 */
export type Orientation = 'portrait' | 'landscape'

/** Landscape when strictly wider than tall; portrait otherwise (square → portrait). */
export function orientationOf(width: number, height: number): Orientation {
  return width > height ? 'landscape' : 'portrait'
}

/** Swap a dimension pair — the operation a landscape⇄portrait flip performs. */
export function swapDimensions(width: number, height: number): { width: number; height: number } {
  return { width: height, height: width }
}

export interface OrientationToggleProps {
  /** Current effective page width (pt). */
  width: number
  /** Current effective page height (pt). */
  height: number
  /** Called when the user picks the opposite orientation — swap w↔h. */
  onSwap: () => void
}

export function OrientationToggle({ width, height, onSwap }: OrientationToggleProps) {
  const current = orientationOf(width, height)
  const select = (target: Orientation) => {
    if (target !== current) onSwap()
  }
  return (
    <div>
      <span
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          display: 'block',
          marginBottom: 6,
        }}
      >
        Orientation
      </span>
      <div role="group" aria-label="Page orientation" style={{ display: 'flex', gap: 6 }}>
        <OrientationButton
          kind="portrait"
          active={current === 'portrait'}
          onClick={() => select('portrait')}
        />
        <OrientationButton
          kind="landscape"
          active={current === 'landscape'}
          onClick={() => select('landscape')}
        />
      </div>
    </div>
  )
}

function OrientationButton({
  kind,
  active,
  onClick,
}: {
  kind: Orientation
  active: boolean
  onClick: () => void
}) {
  const label = kind === 'portrait' ? 'Portrait' : 'Landscape'
  return (
    <button
      type="button"
      className={`tg-btn${active ? ' tg-btn--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      data-testid={`orientation-${kind}`}
      style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' }}
    >
      <PageGlyph landscape={kind === 'landscape'} />
      {label}
    </button>
  )
}

/** A tiny page outline — tall for portrait, wide for landscape. */
function PageGlyph({ landscape }: { landscape: boolean }) {
  const w = landscape ? 18 : 13
  const h = landscape ? 13 : 18
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <rect
        x={(20 - w) / 2}
        y={(20 - h) / 2}
        width={w}
        height={h}
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  )
}
