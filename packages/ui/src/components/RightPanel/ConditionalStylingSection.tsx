import { useState } from 'react'
import type {
  FieldDefinition,
  ConditionStyleRule,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
} from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { NumberInput } from '../NumberInput.js'
import { ColorPickerPopover } from '../ColorPickerPopover.js'
import { StyleToggleGroup } from '../StyleToggleGroup.js'
import { AlignButtonGroup } from './AlignButtonGroup.js'

interface Props {
  field: FieldDefinition
}

export function ConditionalStylingSection({ field }: Props) {
  const updateField = useTemplateStore((s) => s.updateField)
  const fonts = useTemplateStore((s) => s.fonts)
  const allFontFamilies = ['Helvetica', 'Times-Roman', 'Courier', ...fonts.map((f) => f.name)]

  const condConfig = field.conditionalStyles
  const isEnabled = condConfig?.enabled ?? false
  const conditions = condConfig?.conditions ?? []

  const [activeCondId, setActiveCondId] = useState<string>(() => {
    return conditions[0]?.id ?? ''
  })

  function handleToggleEnabled(enabled: boolean) {
    if (enabled && (!condConfig || conditions.length === 0)) {
      const initialConditions: ConditionStyleRule<unknown>[] = [
        {
          id: 'cond-1',
          name: 'condition-1',
          isDefault: true,
          style: {},
        },
        {
          id: 'cond-2',
          name: 'condition-2',
          isDefault: false,
          style: {},
        },
      ]
      updateField(field.id, {
        conditionalStyles: {
          enabled: true,
          conditions: initialConditions,
        },
      } as Partial<FieldDefinition>)
      setActiveCondId('cond-1')
    } else {
      updateField(field.id, {
        conditionalStyles: {
          enabled,
          conditions: conditions,
        },
      } as Partial<FieldDefinition>)
    }
  }

  function handleAddCondition() {
    const nextNum = conditions.length + 1
    const newCond: ConditionStyleRule<unknown> = {
      id: `cond-${Date.now()}`,
      name: `condition-${nextNum}`,
      isDefault: false,
      style: {},
    }
    const nextList = [...conditions, newCond]
    updateField(field.id, {
      conditionalStyles: {
        enabled: true,
        conditions: nextList,
      },
    } as Partial<FieldDefinition>)
    setActiveCondId(newCond.id)
  }

  function handleDeleteCondition(condId: string) {
    if (conditions.length <= 1) return
    const filtered = conditions.filter((c) => c.id !== condId)
    // If deleted condition was default, make the first remaining condition default
    if (wasDefault && filtered[0]) {
      filtered[0] = { ...filtered[0], isDefault: true }
    }
    updateField(field.id, {
      conditionalStyles: {
        enabled: true,
        conditions: filtered,
      },
    } as Partial<FieldDefinition>)

    if (activeCondId === condId) {
      setActiveCondId(filtered[0]?.id ?? '')
    }
  }

  function handleSetDefault(condId: string) {
    const updated = conditions.map((c) => ({
      ...c,
      isDefault: c.id === condId,
    }))
    updateField(field.id, {
      conditionalStyles: {
        enabled: true,
        conditions: updated,
      },
    } as Partial<FieldDefinition>)
  }

  function handleRename(condId: string, newName: string) {
    const updated = conditions.map((c) => (c.id === condId ? { ...c, name: newName } : c))
    updateField(field.id, {
      conditionalStyles: {
        enabled: true,
        conditions: updated,
      },
    } as Partial<FieldDefinition>)
  }

  function handleUpdateConditionStyle(condId: string, stylePatch: Record<string, unknown>) {
    const updated = conditions.map((c) => {
      if (c.id !== condId) return c
      return {
        ...c,
        style: {
          ...c.style,
          ...stylePatch,
        },
      }
    })
    updateField(field.id, {
      conditionalStyles: {
        enabled: true,
        conditions: updated,
      },
    } as Partial<FieldDefinition>)
  }

  const activeRule = conditions.find((c) => c.id === activeCondId) ?? conditions[0]

  return (
    <div className="tg-panel-section" data-testid="conditional-styling-section">
      <div
        className="tg-panel-section-title"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>Condition-based styling</span>
        <label className="tg-switch" style={{ margin: 0 }}>
          <input
            type="checkbox"
            data-testid="toggle-conditional-styling"
            checked={isEnabled}
            onChange={(e) => handleToggleEnabled(e.target.checked)}
          />
          <span className="tg-slider" />
        </label>
      </div>

      {isEnabled && (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
              CONDITIONS
            </span>
            <button
              type="button"
              className="tg-btn tg-btn--sm"
              data-testid="add-condition-btn"
              onClick={handleAddCondition}
            >
              + Add Condition
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {conditions.map((cond, idx) => (
              <div
                key={cond.id}
                data-testid={`condition-row-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 6px',
                  borderRadius: 4,
                  background: cond.id === activeRule?.id ? 'var(--bg-hover)' : 'transparent',
                  border: '1px solid var(--border)',
                }}
              >
                <input
                  type="radio"
                  name={`default-cond-${field.id}`}
                  data-testid={`condition-default-toggle-${cond.id}`}
                  checked={cond.isDefault}
                  onChange={() => handleSetDefault(cond.id)}
                  title="Mark as default condition"
                />
                <input
                  type="text"
                  className="tg-input"
                  data-testid={`condition-name-input-${idx}`}
                  value={cond.name}
                  onChange={(e) => handleRename(cond.id, e.target.value)}
                  onClick={() => setActiveCondId(cond.id)}
                  style={{ flex: 1, height: 24, fontSize: 12, padding: '2px 4px' }}
                />
                {cond.isDefault && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '1px 4px',
                      background: 'var(--primary-light, #e0f2fe)',
                      color: 'var(--primary, #0284c7)',
                      borderRadius: 3,
                    }}
                  >
                    Default
                  </span>
                )}
                <button
                  type="button"
                  className="tg-btn tg-btn--icon tg-btn--sm"
                  data-testid={`condition-delete-${cond.id}`}
                  disabled={conditions.length <= 1}
                  onClick={() => handleDeleteCondition(cond.id)}
                  title="Delete condition"
                  style={{ opacity: conditions.length <= 1 ? 0.4 : 1 }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {activeRule && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginBottom: 8,
                }}
              >
                STYLE OVERRIDES:{' '}
                <span style={{ color: 'var(--text-primary)' }}>{activeRule.name}</span>
              </div>

              {/* Text Field Style Controls */}
              {field.type === 'text' && (
                <TextStyleControls
                  style={(activeRule.style as Partial<TextFieldStyle>) ?? {}}
                  baseStyle={field.style as TextFieldStyle}
                  allFontFamilies={allFontFamilies}
                  onChange={(patch) => handleUpdateConditionStyle(activeRule.id, patch)}
                />
              )}

              {/* Image Field Style Controls */}
              {field.type === 'image' && (
                <ImageStyleControls
                  style={(activeRule.style as Partial<ImageFieldStyle>) ?? {}}
                  baseStyle={field.style as ImageFieldStyle}
                  onChange={(patch) => handleUpdateConditionStyle(activeRule.id, patch)}
                />
              )}

              {/* Table Field Style Controls */}
              {field.type === 'table' && (
                <TableStyleControls
                  style={(activeRule.style as Partial<TableFieldStyle>) ?? {}}
                  onChange={(patch) => handleUpdateConditionStyle(activeRule.id, patch)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TextStyleControls({
  style,
  baseStyle,
  allFontFamilies,
  onChange,
}: {
  style: Partial<TextFieldStyle>
  baseStyle: TextFieldStyle
  allFontFamilies: string[]
  onChange: (patch: Partial<TextFieldStyle>) => void
}) {
  const currentFontFamily = style.fontFamily ?? baseStyle.fontFamily
  const currentFontSize = style.fontSize ?? baseStyle.fontSize
  const currentColor = style.color ?? baseStyle.color
  const currentAlign = style.align ?? baseStyle.align
  const currentWeight = style.fontWeight ?? baseStyle.fontWeight
  const currentFontStyle = style.fontStyle ?? baseStyle.fontStyle
  const currentDecoration = style.textDecoration ?? baseStyle.textDecoration

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="tg-form-row">
        <label>Font Family</label>
        <select
          className="tg-select"
          data-testid="cond-font-family"
          value={currentFontFamily}
          onChange={(e) => onChange({ fontFamily: e.target.value })}
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
          value={currentFontSize}
          min={1}
          defaultValue={12}
          onChange={(v) => onChange({ fontSize: v })}
          data-testid="cond-font-size"
        />
      </div>

      <div className="tg-form-row">
        <label>Text Color</label>
        <ColorPickerPopover
          value={currentColor}
          onChange={(c) => onChange({ color: c })}
          ariaLabel="Text color"
        />
      </div>

      <div className="tg-form-row">
        <label>Alignment</label>
        <AlignButtonGroup
          options={['left', 'center', 'right']}
          value={currentAlign}
          onChange={(align) => onChange({ align })}
        />
      </div>

      <div className="tg-form-row">
        <label>Formatting</label>
        <StyleToggleGroup
          size="sm"
          value={{
            fontWeight: currentWeight,
            fontStyle: currentFontStyle,
            textDecoration: currentDecoration,
          }}
          onChange={(patch) => onChange(patch)}
        />
      </div>
    </div>
  )
}

function ImageStyleControls({
  style,
  baseStyle,
  onChange,
}: {
  style: Partial<ImageFieldStyle>
  baseStyle: ImageFieldStyle
  onChange: (patch: Partial<ImageFieldStyle>) => void
}) {
  const currentFit = style.fit ?? baseStyle.fit

  return (
    <div className="tg-form-row">
      <label>Image Fit</label>
      <select
        className="tg-select"
        data-testid="cond-image-fit"
        value={currentFit}
        onChange={(e) => onChange({ fit: e.target.value as 'fill' | 'contain' | 'cover' })}
      >
        <option value="contain">Contain</option>
        <option value="cover">Cover</option>
        <option value="fill">Fill</option>
      </select>
    </div>
  )
}

function TableStyleControls({
  style,
  onChange,
}: {
  style: Partial<TableFieldStyle>
  onChange: (patch: Partial<TableFieldStyle>) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="tg-form-row">
        <label>Multi Page</label>
        <input
          type="checkbox"
          data-testid="cond-table-multipage"
          checked={style.multiPage ?? false}
          onChange={(e) => onChange({ multiPage: e.target.checked })}
        />
      </div>
    </div>
  )
}
