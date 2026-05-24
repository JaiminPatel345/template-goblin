import { SourceModeToggle } from './SourceModeToggle.js'
import { HyperlinkSection } from './HyperlinkSection.js'
import { NumberInput } from '../NumberInput.js'
import type {
  FieldDefinition,
  TextField,
  TextFieldStyle,
  TextAlign,
  VerticalAlign,
} from '@template-goblin/types'
import { isSafeKey } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { autoShrinkStaticField } from '../../utils/autoShrinkDispatch.js'
import { InfoTip } from './InfoTip.js'
import { AlignButtonGroup } from './AlignButtonGroup.js'
import { TextTypographySection } from './TextTypographySection.js'

// `InfoTip` is re-exported for backward compatibility with sibling files
// (e.g. LoopFieldProps) that imported it from here before the split.
export { InfoTip }

interface Props {
  field: TextField
}

const BUILTIN_FONTS = ['Helvetica', 'Times-Roman', 'Courier']

export function TextFieldProps({ field }: Props) {
  const updateField = useTemplateStore((s) => s.updateField)
  const updateFieldStyle = useTemplateStore((s) => s.updateFieldStyle)
  const groups = useTemplateStore((s) => s.groups)
  const fonts = useTemplateStore((s) => s.fonts)
  const resizeField = useTemplateStore((s) => s.resizeField)

  // QA BUG-08: legacy fields rehydrated from an older format used to be
  // labelled 'cannot be edited' with no recourse. Surface a one-click
  // Upgrade button that injects the default source shape so the user can
  // continue editing immediately.
  if (!field.source) {
    return (
      <div className="tg-panel-section" data-testid="legacy-field-upgrade">
        <div className="tg-panel-section-title">Legacy field</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
          This text field was saved in an older format. Click below to convert it to the new
          editable format.
        </p>
        <button
          type="button"
          className="tg-btn tg-btn--primary"
          data-testid="legacy-field-upgrade-text"
          onClick={() =>
            updateField(field.id, {
              source: {
                mode: 'dynamic',
                jsonKey: '',
                required: false,
                placeholder: '',
              },
            } as Partial<FieldDefinition>)
          }
        >
          Convert to new format
        </button>
      </div>
    )
  }

  const style: TextFieldStyle = field.style

  const isDynamic = field.source.mode === 'dynamic'
  const isStatic = !isDynamic
  const dynamicSource = isDynamic
    ? (field.source as {
        mode: 'dynamic'
        jsonKey: string
        required: boolean
        placeholder: string | null
      })
    : null
  const staticValue = isStatic
    ? ((field.source as { mode: 'static'; value: string }).value ?? '')
    : ''
  const displayKey = dynamicSource?.jsonKey ?? ''

  function onStaticValueChange(value: string) {
    updateField(field.id, { source: { mode: 'static', value } } as Partial<FieldDefinition>)
  }

  function onJsonKeyChange(value: string) {
    // Strip any `texts.` the user might have typed — we only store the suffix.
    const cleaned = value.replace(/^texts\./, '')
    // Reject keys that the core validator would reject (prototype pollution
    // guard). Empty string is allowed during editing; `isSafeKey` rejects it.
    if (cleaned !== '' && !isSafeKey(cleaned)) return
    if (!dynamicSource) return
    updateField(field.id, {
      source: { ...dynamicSource, jsonKey: cleaned },
    } as Partial<FieldDefinition>)
  }

  function onRequiredChange(required: boolean) {
    if (!dynamicSource) return
    updateField(field.id, {
      source: { ...dynamicSource, required },
    } as Partial<FieldDefinition>)
  }

  function onPlaceholderChange(value: string) {
    if (!dynamicSource) return
    updateField(field.id, {
      source: { ...dynamicSource, placeholder: value || null },
    } as Partial<FieldDefinition>)
  }

  // GH #73: typography changes auto-resize the rect ONLY for static text —
  // the literal value is known at design time so growing the rect to fit is
  // reasonable. Dynamic text fields hold an author-drawn rect that's the
  // contract for runtime data, and changing fontSize/maxRows/lineHeight
  // would silently move the rect out from under the author's hands.
  function onMaxRowsChange(maxRows: number) {
    updateFieldStyle(field.id, { maxRows })
    if (!isStatic) return
    const newHeight = maxRows * style.fontSize * style.lineHeight
    resizeField(field.id, field.width, newHeight)
  }

  function onLineHeightChange(lineHeight: number) {
    updateFieldStyle(field.id, { lineHeight })
    if (!isStatic) return
    const newHeight = style.maxRows * style.fontSize * lineHeight
    resizeField(field.id, field.width, newHeight)
  }

  function onFontSizeChange(fontSize: number) {
    updateFieldStyle(field.id, { fontSize })
    if (!isStatic) return
    const newHeight = style.maxRows * fontSize * style.lineHeight
    resizeField(field.id, field.width, newHeight)
  }

  const allFontFamilies = [...BUILTIN_FONTS, ...fonts.map((f) => f.name)]

  return (
    <>
      {/* Source mode toggle (GH #26) — flipping migrates value↔placeholder. */}
      <SourceModeToggle field={field} />

      {/* Field properties — JSON Key / Required / Placeholder are dynamic-only;
          Value replaces them when the field is static (matrix per #26). */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Field Properties</div>

        {isStatic && (
          <div className="tg-form-row">
            <label>Value</label>
            <input
              className="tg-input"
              value={staticValue}
              onChange={(e) => onStaticValueChange(e.target.value)}
              onBlur={() => void autoShrinkStaticField(field.id)}
              data-testid="text-static-value"
            />
          </div>
        )}

        {isDynamic && (
          <div className="tg-form-row">
            <label>JSON Key</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                texts.
              </span>
              <input
                className="tg-input"
                value={displayKey}
                onChange={(e) => onJsonKeyChange(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="tg-form-row">
          <label>Group</label>
          <select
            className="tg-select"
            value={field.groupId ?? ''}
            onChange={(e) => updateField(field.id, { groupId: e.target.value || null })}
          >
            <option value="">None</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {isDynamic && (
          <>
            <div className="tg-toggle-row">
              <label>Required</label>
              <input
                type="checkbox"
                className="tg-checkbox"
                checked={dynamicSource?.required ?? false}
                onChange={(e) => onRequiredChange(e.target.checked)}
              />
            </div>

            <div className="tg-form-row">
              <label>Placeholder</label>
              <input
                className="tg-input"
                value={dynamicSource?.placeholder ?? ''}
                onChange={(e) => onPlaceholderChange(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {/* Layout */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Layout</div>

        <div className="tg-form-row">
          <label>
            Max Rows
            <InfoTip text="Maximum number of text lines. Changes the field height." />
          </label>
          <NumberInput
            value={style.maxRows}
            min={1}
            defaultValue={3}
            onChange={(v) => onMaxRowsChange(v)}
          />
        </div>

        <div className="tg-form-row">
          <label>Line Height</label>
          <NumberInput
            value={style.lineHeight}
            min={0.5}
            step={0.1}
            defaultValue={1.2}
            onChange={(v) => onLineHeightChange(v)}
          />
        </div>
      </div>

      <TextTypographySection
        field={field}
        style={style}
        isDynamic={isDynamic}
        allFontFamilies={allFontFamilies}
        onFontSizeChange={onFontSizeChange}
        updateFieldStyle={updateFieldStyle}
      />

      {/* Alignment */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Alignment</div>

        <div className="tg-form-row">
          <label>Horizontal</label>
          <AlignButtonGroup
            options={['left', 'center', 'right'] as TextAlign[]}
            value={style.align}
            onChange={(v) => updateFieldStyle(field.id, { align: v })}
          />
        </div>

        <div className="tg-form-row">
          <label>
            Vertical
            <InfoTip text="How text is positioned vertically within the field box." />
          </label>
          <AlignButtonGroup
            options={['top', 'middle', 'bottom'] as VerticalAlign[]}
            value={style.verticalAlign}
            onChange={(v) => updateFieldStyle(field.id, { verticalAlign: v })}
          />
        </div>
      </div>
      <HyperlinkSection field={field} />
    </>
  )
}
