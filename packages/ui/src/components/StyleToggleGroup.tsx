/**
 * StyleToggleGroup (#167) — the Word / Docs / Canva-style B / I / U / S
 * inline toggle buttons, replacing the old Font Weight / Font Style /
 * Text Decoration dropdowns.
 *
 * One component drives all three surfaces (right-panel properties, the
 * Format ribbon, and the floating selection toolbar) so the toggles look
 * and behave identically everywhere and a fix lands in one place.
 *
 * Semantics:
 *  - **B** toggles `fontWeight` between `normal` and `bold`.
 *  - **I** toggles `fontStyle` between `normal` and `italic`.
 *  - **U** toggles `textDecoration` between `none` and `underline`.
 *  - **S** toggles `textDecoration` between `none` and `line-through`.
 *
 * `textDecoration` is a single field, so U and S are mutually exclusive by
 * construction — turning one on turns the other off (matching the data
 * model, which can only hold one decoration at a time).
 */
import type { FontWeight, FontStyle, TextDecoration } from '@template-goblin/types'

export interface StyleToggleState {
  fontWeight: FontWeight
  fontStyle: FontStyle
  textDecoration: TextDecoration
}

export type StyleToggleKey = 'bold' | 'italic' | 'underline' | 'strike'

/** Is the given toggle currently "on" for this style state? */
export function isStyleToggleActive(key: StyleToggleKey, value: StyleToggleState): boolean {
  switch (key) {
    case 'bold':
      return value.fontWeight === 'bold'
    case 'italic':
      return value.fontStyle === 'italic'
    case 'underline':
      return value.textDecoration === 'underline'
    case 'strike':
      return value.textDecoration === 'line-through'
  }
}

/**
 * The style patch produced by clicking a toggle. Clicking an active toggle
 * turns it back off; underline and strikethrough share `textDecoration`, so
 * turning one on implicitly clears the other (and turning one off resets the
 * single decoration field to `none`).
 */
export function styleTogglePatch(
  key: StyleToggleKey,
  value: StyleToggleState,
): Partial<StyleToggleState> {
  const active = isStyleToggleActive(key, value)
  switch (key) {
    case 'bold':
      return { fontWeight: active ? 'normal' : 'bold' }
    case 'italic':
      return { fontStyle: active ? 'normal' : 'italic' }
    case 'underline':
      return { textDecoration: active ? 'none' : 'underline' }
    case 'strike':
      return { textDecoration: active ? 'none' : 'line-through' }
  }
}

interface Props {
  value: StyleToggleState
  onChange: (patch: Partial<StyleToggleState>) => void
  /** Render a tighter button for dense surfaces (ribbon / floating toolbar). */
  size?: 'sm' | 'md'
  /** Disable all four toggles (e.g. ribbon with no text field selected). */
  disabled?: boolean
  /**
   * Prefix for each button's `data-testid` so the same group can be
   * targeted per-surface in e2e (`panel-bold`, `toolbar-bold`, …).
   */
  testIdPrefix?: string
}

interface ToggleDef {
  key: StyleToggleKey
  glyph: string
  label: string
  glyphStyle: React.CSSProperties
}

const TOGGLES: ToggleDef[] = [
  { key: 'bold', glyph: 'B', label: 'Bold', glyphStyle: { fontWeight: 700 } },
  {
    key: 'italic',
    glyph: 'I',
    label: 'Italic',
    glyphStyle: { fontStyle: 'italic', fontFamily: 'Georgia, serif' },
  },
  { key: 'underline', glyph: 'U', label: 'Underline', glyphStyle: { textDecoration: 'underline' } },
  {
    key: 'strike',
    glyph: 'S',
    label: 'Strikethrough',
    glyphStyle: { textDecoration: 'line-through' },
  },
]

export function StyleToggleGroup({
  value,
  onChange,
  size = 'md',
  disabled = false,
  testIdPrefix = 'style',
}: Props) {
  const dim = size === 'sm' ? 26 : 30
  return (
    <div style={{ display: 'flex', gap: 2 }} role="group" aria-label="Text style">
      {TOGGLES.map((t) => {
        const isActive = isStyleToggleActive(t.key, value)
        return (
          <button
            key={t.key}
            type="button"
            className={`tg-btn ${isActive ? 'tg-btn--active' : ''}`}
            aria-pressed={isActive}
            aria-label={t.label}
            title={t.label}
            disabled={disabled}
            data-testid={`${testIdPrefix}-${t.key}`}
            onClick={() => onChange(styleTogglePatch(t.key, value))}
            style={{
              width: dim,
              height: dim,
              minWidth: dim,
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: size === 'sm' ? 12 : 13,
              lineHeight: 1,
            }}
          >
            <span aria-hidden style={t.glyphStyle}>
              {t.glyph}
            </span>
          </button>
        )
      })}
    </div>
  )
}
