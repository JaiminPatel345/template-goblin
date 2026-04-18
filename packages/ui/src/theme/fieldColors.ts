import type { FieldType } from '@template-goblin/types'

/**
 * Visual tokens per field type. Used by both the CanvasArea rectangles and the
 * Toolbar buttons so the two stay consistent: the toolbar "Text" / "Image" /
 * "Table" buttons render with the same hue as their drawn rectangles.
 *
 * Palette is intentionally soft (low opacity fills) so text labels and the
 * underlying background image remain readable through the rect.
 */
export interface FieldColorTokens {
  /** Rect fill for dynamic / non-static placeholderless fields on the canvas. */
  fill: string
  /** Rect stroke colour. */
  stroke: string
  /** Text colour for the inline label rendered inside the rect. */
  text: string
  /** Toolbar button background (shown regardless of active/hover state). */
  toolbarBg: string
  /** Toolbar button foreground / icon & label colour. */
  toolbarFg: string
  // String index signature so callers can iterate keys generically
  // (e.g. tests that loop over ["fill","stroke",...]). All tokens are strings.
  [k: string]: string
}

/**
 * Canonical per-FieldType colour record. Consumers MUST import from this
 * module rather than redeclaring tokens locally so canvas and toolbar stay
 * in lockstep.
 */
export const FIELD_COLORS: Record<FieldType, FieldColorTokens> = {
  text: {
    fill: 'rgba(96, 165, 250, 0.18)',
    stroke: '#60a5fa',
    text: '#1e40af',
    toolbarBg: '#dbeafe',
    toolbarFg: '#1e40af',
  },
  image: {
    fill: 'rgba(74, 222, 128, 0.18)',
    stroke: '#4ade80',
    text: '#166534',
    toolbarBg: '#dcfce7',
    toolbarFg: '#166534',
  },
  table: {
    fill: 'rgba(251, 146, 60, 0.18)',
    stroke: '#fb923c',
    text: '#92400e',
    toolbarBg: '#fef3c7',
    toolbarFg: '#92400e',
  },
}
