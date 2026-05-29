/**
 * FloatingSelectionToolbar (#167) — a Word / Canva-style mini toolbar that
 * floats next to the selected text field, so the user can format without a
 * round-trip to the right panel.
 *
 * Shows only when exactly one text field is selected AND the user hasn't
 * hidden it via the eye-off button (`uiStore.showSelectionToolbar`). It
 * carries B / I / U / S, font size, text colour, and text background colour
 * — the same controls as the panel and ribbon, all driven by the shared
 * `useSelectedTextField` hook so every surface stays in sync.
 *
 * Position is owned by `useSelectionAnchor`: above the selection by default,
 * flipping below when there isn't room. It re-anchors on drag / resize /
 * rotate / zoom / pan. The toolbar is a fixed-position element outside the
 * Fabric canvas, so clicks on it never reach the canvas and never clear the
 * selection.
 */
import type { Canvas as FabricCanvas } from 'fabric'
import { useUiStore } from '../../store/uiStore.js'
import { useSelectedTextField } from '../../hooks/useSelectedTextField.js'
import { useSelectionAnchor } from './useSelectionAnchor.js'
import { StyleToggleGroup } from '../StyleToggleGroup.js'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { NullableColorInput } from '../NullableColorInput.js'
import { EyeOffIcon } from '../icons/index.js'

const TOOLBAR_HEIGHT = 40
const GAP = 10
const VIEWPORT_MARGIN = 8
/** Half the toolbar's nominal width, used to keep it inside the viewport. */
const HALF_WIDTH = 175

interface Props {
  fabric: FabricCanvas | null
}

export function FloatingSelectionToolbar({ fabric }: Props) {
  const showSelectionToolbar = useUiStore((s) => s.showSelectionToolbar)
  const setShowSelectionToolbar = useUiStore((s) => s.setShowSelectionToolbar)
  const selected = useSelectedTextField()
  const anchor = useSelectionAnchor(fabric, selected?.field.id ?? null)

  if (!selected || !showSelectionToolbar || !anchor) return null

  const { field, updateStyle } = selected
  const style = field.style

  // Above the selection when there's room, otherwise below it.
  const above = anchor.top - TOOLBAR_HEIGHT - GAP > VIEWPORT_MARGIN
  const top = above ? anchor.top - TOOLBAR_HEIGHT - GAP : anchor.bottom + GAP
  const centerX = Math.min(
    window.innerWidth - HALF_WIDTH - VIEWPORT_MARGIN,
    Math.max(HALF_WIDTH + VIEWPORT_MARGIN, anchor.centerX),
  )

  return (
    <div
      data-testid="floating-selection-toolbar"
      role="toolbar"
      aria-label="Text formatting"
      style={{
        position: 'fixed',
        top,
        left: centerX,
        transform: 'translateX(-50%)',
        // Above the canvas + sticky hints (--z-sticky 200) but BELOW the modal
        // overlay (--z-overlay 800) so an open dialog's backdrop covers the
        // toolbar instead of it floating on top of the modal.
        zIndex: 700,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        height: TOOLBAR_HEIGHT,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.25)',
      }}
    >
      <StyleToggleGroup
        size="sm"
        value={{
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          textDecoration: style.textDecoration,
        }}
        onChange={updateStyle}
        testIdPrefix="toolbar"
      />

      <span aria-hidden style={{ width: 1, height: 22, background: 'var(--border)' }} />

      <NumberInput
        value={style.fontSize}
        min={1}
        defaultValue={12}
        onChange={(v) => updateStyle({ fontSize: v })}
        style={{ width: 50, height: 26, padding: '2px 4px' }}
      />

      <ColorPickerPopover
        value={style.color}
        onChange={(c) => updateStyle({ color: c })}
        ariaLabel="Text color"
        swatchWidth={26}
        swatchHeight={26}
      />

      <NullableColorInput
        value={style.backgroundColor ?? null}
        onChange={(v) => updateStyle({ backgroundColor: v })}
        ariaLabel="Text background color"
      />

      <span aria-hidden style={{ width: 1, height: 22, background: 'var(--border)' }} />

      <button
        type="button"
        className="tg-btn"
        data-testid="toolbar-hide"
        aria-label="Hide formatting toolbar"
        title="Hide toolbar (re-enable from View → Selection toolbar)"
        onClick={() => setShowSelectionToolbar(false)}
        style={{
          width: 26,
          height: 26,
          minWidth: 26,
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <EyeOffIcon width={15} height={15} />
      </button>
    </div>
  )
}
