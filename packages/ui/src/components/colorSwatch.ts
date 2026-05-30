import type { CSSProperties } from 'react'

/** Checkerboard fill marking a transparent (no-colour) swatch. */
export const CHECKER_STYLE: CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, #ccc 25%, transparent 25%), ' +
    'linear-gradient(-45deg, #ccc 25%, transparent 25%), ' +
    'linear-gradient(45deg, transparent 75%, #ccc 75%), ' +
    'linear-gradient(-45deg, transparent 75%, #ccc 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
}

/**
 * The 10 preset swatches the previous SketchPicker carried, kept as-is per
 * #121's "no visual redesign" caveat. Module-scope for stable identity.
 */
export const COLOR_PRESETS = [
  '#000000',
  '#ffffff',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#64748b',
  '#0a0a0a',
] as const
