import { useState } from 'react'
import { SourceModeToggle } from './SourceModeToggle.js'
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

export function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false)
  return (
    <span
      style={{
        cursor: 'help',
        marginLeft: 4,
        color: 'var(--text-muted)',
        fontSize: 11,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      {show && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            color: 'var(--text-primary)',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            marginBottom: 4,
            maxWidth: 250,
            whiteSpace: 'normal',
            lineHeight: 1.4,
          }}
        >
          {text}
        </span>
      )}
    </span>
  )
}

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

  // Defensive fallback: a field rehydrated from a stale localStorage entry may
  // be missing `source` entirely. Show a stub notice instead of crashing.
  if (!field.source) {
    return (
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Legacy field</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          This text field was saved in an older format and cannot be edited. Please recreate it.
        </p>
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

  function onMaxRowsChange(maxRows: number) {
    updateFieldStyle(field.id, { maxRows })
    // Recalculate height: maxRows * fontSize * lineHeight
    const newHeight = maxRows * style.fontSize * style.lineHeight
    resizeField(field.id, field.width, newHeight)
  }

  function onLineHeightChange(lineHeight: number) {
    updateFieldStyle(field.id, { lineHeight })
    const newHeight = style.maxRows * style.fontSize * lineHeight
    resizeField(field.id, field.width, newHeight)
  }

  function onFontSizeChange(fontSize: number) {
    updateFieldStyle(field.id, { fontSize })
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

      {/* Typography */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Typography</div>

        <div className="tg-form-row">
          <label>Font Family</label>
          <select
            className="tg-select"
            value={style.fontFamily}
            onChange={(e) => updateFieldStyle(field.id, { fontFamily: e.target.value })}
          >
            {allFontFamilies.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="tg-form-row">
          <label>Font Size</label>
          <NumberInput
            value={style.fontSize}
            min={1}
            defaultValue={12}
            onChange={(v) => onFontSizeChange(v)}
          />
        </div>

        {/* Auto-fit + min-font-size only apply to dynamic text fields — the
            content varies per row, so we may need to shrink to fit. Static
            text has a fixed string and the user explicitly chose its size. */}
        {isDynamic && (
          <>
            <div className="tg-toggle-row">
              <label>
                Dynamic Font Size
                <InfoTip text="When enabled, font size shrinks automatically if text overflows." />
              </label>
              <input
                type="checkbox"
                className="tg-checkbox"
                checked={style.fontSizeDynamic}
                onChange={(e) => updateFieldStyle(field.id, { fontSizeDynamic: e.target.checked })}
              />
            </div>

            {style.fontSizeDynamic && (
              <div className="tg-form-row">
                <label>
                  Min Font Size
                  <InfoTip text="The smallest font size allowed when dynamic sizing is enabled." />
                </label>
                <NumberInput
                  value={style.fontSizeMin}
                  min={1}
                  defaultValue={11}
                  onChange={(v) => updateFieldStyle(field.id, { fontSizeMin: v })}
                />
              </div>
            )}
          </>
        )}

        {/* Overflow Mode only applies to dynamic text — the rendered string
            varies per row so we may need to shrink-or-truncate. Static text
            has a fixed string and a fixed fontSize, so nothing to overflow. */}
        {isDynamic && (
          <div className="tg-form-row">
            <label>
              Overflow Mode
              <InfoTip text="Dynamic Font: automatically shrinks text to fit. Truncate: cuts text with ellipsis." />
            </label>
            <select
              className="tg-select"
              value={style.overflowMode}
              onChange={(e) =>
                updateFieldStyle(field.id, {
                  overflowMode: e.target.value as 'dynamic_font' | 'truncate',
                })
              }
            >
              <option value="dynamic_font">Dynamic Font</option>
              <option value="truncate">Truncate</option>
            </select>
          </div>
        )}

        <div className="tg-form-row">
          <label>Font Weight</label>
          <select
            className="tg-select"
            value={style.fontWeight}
            onChange={(e) =>
              updateFieldStyle(field.id, { fontWeight: e.target.value as 'normal' | 'bold' })
            }
          >
            <option value="normal">Normal</option>
            <option value="bold">Bold</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Font Style</label>
          <select
            className="tg-select"
            value={style.fontStyle}
            onChange={(e) =>
              updateFieldStyle(field.id, { fontStyle: e.target.value as 'normal' | 'italic' })
            }
          >
            <option value="normal">Normal</option>
            <option value="italic">Italic</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Text Decoration</label>
          <select
            className="tg-select"
            value={style.textDecoration}
            onChange={(e) =>
              updateFieldStyle(field.id, { textDecoration: e.target.value as 'none' | 'underline' })
            }
          >
            <option value="none">None</option>
            <option value="underline">Underline</option>
          </select>
        </div>

        <div className="tg-form-row">
          <label>Text Color</label>
          <input
            type="color"
            className="tg-color-input"
            value={style.color}
            onChange={(e) => updateFieldStyle(field.id, { color: e.target.value })}
          />
        </div>
      </div>

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
    </>
  )
}

function AlignButtonGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {options.map((opt) => (
        <button
          key={opt}
          className={`tg-btn ${value === opt ? 'tg-btn--active' : ''}`}
          style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '4px 6px' }}
          onClick={() => onChange(opt)}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  )
}
