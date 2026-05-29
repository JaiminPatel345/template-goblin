/**
 * TextStyleRibbonGroup (#167) — the Format ribbon's "Text style" cluster:
 * B / I / U / S toggles, font size, font family, text colour, and text
 * background colour.
 *
 * Selection-aware: every control is disabled when there isn't exactly one
 * text field selected, and live-binds to that field's style when there is —
 * via the shared `useSelectedTextField` hook, so the ribbon, the right
 * panel, and the floating toolbar all stay in sync.
 *
 * Extracted from `FormatRibbon` so that file stays small and this group can
 * be reasoned about (and tested) on its own (Hard Rule #11).
 */
import { useTemplateStore } from '../../../store/templateStore.js'
import { useSelectedTextField } from '../../../hooks/useSelectedTextField.js'
import { RibbonGroup } from '../primitives/RibbonGroup.js'
import { StyleToggleGroup } from '../../StyleToggleGroup.js'
import { NumberInput } from '../../NumberInput.js'
import { ColorPickerPopover } from '../../ColorPickerPopover.js'
import { NullableColorInput } from '../../NullableColorInput.js'

const BUILTIN_FONTS = ['Helvetica', 'Times-Roman', 'Courier']

/** Greyed, non-interactive swatch shown when no text field is selected. */
function DisabledSwatch() {
  return (
    <span
      aria-hidden
      style={{
        width: 28,
        height: 24,
        borderRadius: 3,
        border: '1px solid var(--border)',
        background: 'var(--bg-disabled, var(--bg-primary))',
        opacity: 0.5,
      }}
    />
  )
}

export function TextStyleRibbonGroup() {
  const selected = useSelectedTextField()
  const fonts = useTemplateStore((s) => s.fonts)
  const allFontFamilies = [...BUILTIN_FONTS, ...fonts.map((f) => f.name)]

  const disabled = selected === null
  const style = selected?.field.style
  const update = selected?.updateStyle

  return (
    <RibbonGroup label="Text style" testid="ribbon-text-style">
      <StyleToggleGroup
        size="sm"
        disabled={disabled}
        value={{
          fontWeight: style?.fontWeight ?? 'normal',
          fontStyle: style?.fontStyle ?? 'normal',
          textDecoration: style?.textDecoration ?? 'none',
        }}
        onChange={(patch) => update?.(patch)}
        testIdPrefix="ribbon"
      />

      <NumberInput
        value={style?.fontSize ?? 12}
        min={1}
        defaultValue={12}
        disabled={disabled}
        onChange={(v) => update?.({ fontSize: v })}
        style={{ width: 50, height: 26, padding: '2px 4px' }}
        data-testid="ribbon-font-size"
      />

      <select
        className="tg-select"
        aria-label="Font family"
        data-testid="ribbon-font-family"
        disabled={disabled}
        value={style?.fontFamily ?? 'Helvetica'}
        onChange={(e) => update?.({ fontFamily: e.target.value })}
        style={{ width: 116, height: 26 }}
      >
        {allFontFamilies.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      {selected ? (
        <ColorPickerPopover
          value={style?.color ?? '#000000'}
          onChange={(c) => update?.({ color: c })}
          ariaLabel="Text color"
        />
      ) : (
        <DisabledSwatch />
      )}

      {selected ? (
        <NullableColorInput
          value={style?.backgroundColor ?? null}
          onChange={(v) => update?.({ backgroundColor: v })}
          ariaLabel="Text background color"
        />
      ) : (
        <DisabledSwatch />
      )}
    </RibbonGroup>
  )
}
