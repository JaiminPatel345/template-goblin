import type {
  FieldDefinition,
  TextFieldStyle,
  TextAlign,
  VerticalAlign,
} from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'

interface Props {
  field: FieldDefinition
}

const BUILTIN_FONTS = ['Helvetica', 'Times-Roman', 'Courier']

export function TextFieldProps({ field }: Props) {
  const updateField = useTemplateStore((s) => s.updateField)
  const updateFieldStyle = useTemplateStore((s) => s.updateFieldStyle)
  const groups = useTemplateStore((s) => s.groups)
  const fonts = useTemplateStore((s) => s.fonts)
  const resizeField = useTemplateStore((s) => s.resizeField)

  const style = field.style as TextFieldStyle

  const prefix = 'texts.'
  const displayKey = field.jsonKey.startsWith(prefix)
    ? field.jsonKey.slice(prefix.length)
    : field.jsonKey

  function onJsonKeyChange(value: string) {
    const cleaned = value.replace(/^texts\./, '')
    updateField(field.id, { jsonKey: prefix + cleaned })
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
      {/* JSON Key */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Field Properties</div>

        <div className="tg-form-row">
          <label>JSON Key</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>texts.</span>
            <input
              className="tg-input"
              value={displayKey}
              onChange={(e) => onJsonKeyChange(e.target.value)}
            />
          </div>
        </div>

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

        <div className="tg-toggle-row">
          <label>Required</label>
          <input
            type="checkbox"
            className="tg-checkbox"
            checked={field.required}
            onChange={(e) => updateField(field.id, { required: e.target.checked })}
          />
        </div>

        <div className="tg-form-row">
          <label>Placeholder</label>
          <input
            className="tg-input"
            value={field.placeholder ?? ''}
            onChange={(e) => updateField(field.id, { placeholder: e.target.value || null })}
          />
        </div>
      </div>

      {/* Layout */}
      <div className="tg-panel-section">
        <div className="tg-panel-section-title">Layout</div>

        <div className="tg-form-row">
          <label>Max Rows</label>
          <input
            className="tg-input"
            type="number"
            min={1}
            value={style.maxRows}
            onChange={(e) => onMaxRowsChange(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>

        <div className="tg-form-row">
          <label>Line Height</label>
          <input
            className="tg-input"
            type="number"
            min={0.5}
            step={0.1}
            value={style.lineHeight}
            onChange={(e) => onLineHeightChange(Math.max(0.5, parseFloat(e.target.value) || 1.2))}
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
          <input
            className="tg-input"
            type="number"
            min={1}
            value={style.fontSize}
            onChange={(e) => onFontSizeChange(Math.max(1, parseInt(e.target.value) || 12))}
          />
        </div>

        <div className="tg-toggle-row">
          <label>Dynamic Font Size</label>
          <input
            type="checkbox"
            className="tg-checkbox"
            checked={style.fontSizeDynamic}
            onChange={(e) => updateFieldStyle(field.id, { fontSizeDynamic: e.target.checked })}
          />
        </div>

        {style.fontSizeDynamic && (
          <div className="tg-form-row">
            <label>Min Font Size</label>
            <input
              className="tg-input"
              type="number"
              min={1}
              value={style.fontSizeMin}
              onChange={(e) =>
                updateFieldStyle(field.id, {
                  fontSizeMin: Math.max(1, parseInt(e.target.value) || 6),
                })
              }
            />
          </div>
        )}

        <div className="tg-form-row">
          <label>Overflow Mode</label>
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
          <label>Vertical</label>
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
