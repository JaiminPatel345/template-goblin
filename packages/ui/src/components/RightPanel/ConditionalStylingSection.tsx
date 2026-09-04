import type {
  FieldDefinition,
  ConditionStyleRule,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
} from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { TextStyleControls, ImageStyleControls, TableStyleControls } from './ConditionControls.js'
import { ConditionRow } from './ConditionRow.js'

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
  const activeCondId =
    condConfig?.activeConditionId ??
    conditions.find((c) => c.isDefault)?.id ??
    conditions[0]?.id ??
    ''

  function handleSelectCondition(condId: string) {
    updateField(field.id, {
      conditionalStyles: {
        ...condConfig,
        enabled: isEnabled,
        conditions,
        activeConditionId: condId,
      },
    } as Partial<FieldDefinition>)
  }

  function handleToggleEnabled(enabled: boolean) {
    if (enabled && (!condConfig || conditions.length === 0)) {
      const initialConditions: ConditionStyleRule<unknown>[] = [
        { id: 'cond-1', name: 'condition-1', isDefault: true, style: {} },
        { id: 'cond-2', name: 'condition-2', isDefault: false, style: {} },
      ]
      updateField(field.id, {
        conditionalStyles: {
          enabled: true,
          conditions: initialConditions,
          activeConditionId: 'cond-1',
        },
      } as Partial<FieldDefinition>)
    } else {
      updateField(field.id, {
        conditionalStyles: {
          ...condConfig,
          enabled,
          conditions,
          activeConditionId: activeCondId,
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
        activeConditionId: newCond.id,
      },
    } as Partial<FieldDefinition>)
  }

  function handleDeleteCondition(condId: string) {
    if (conditions.length <= 1) return
    const wasDefault = conditions.find((c) => c.id === condId)?.isDefault
    const filtered = conditions.filter((c) => c.id !== condId)
    if (wasDefault && filtered[0]) {
      filtered[0] = { ...filtered[0], isDefault: true }
    }
    const nextActiveId = activeCondId === condId ? (filtered[0]?.id ?? '') : activeCondId
    updateField(field.id, {
      conditionalStyles: {
        enabled: true,
        conditions: filtered,
        activeConditionId: nextActiveId,
      },
    } as Partial<FieldDefinition>)
  }

  function handleSetDefault(condId: string) {
    const updated = conditions.map((c) => ({ ...c, isDefault: c.id === condId }))
    updateField(field.id, {
      conditionalStyles: {
        ...condConfig,
        enabled: true,
        conditions: updated,
        activeConditionId: condId,
      },
    } as Partial<FieldDefinition>)
  }

  function handleRename(condId: string, newName: string) {
    const updated = conditions.map((c) => (c.id === condId ? { ...c, name: newName } : c))
    updateField(field.id, {
      conditionalStyles: {
        ...condConfig,
        enabled: true,
        conditions: updated,
        activeConditionId: condId,
      },
    } as Partial<FieldDefinition>)
  }

  function handleUpdateConditionStyle(condId: string, stylePatch: Record<string, unknown>) {
    const updated = conditions.map((c) => {
      if (c.id !== condId) return c
      return { ...c, style: { ...c.style, ...stylePatch } }
    })
    updateField(field.id, {
      conditionalStyles: {
        ...condConfig,
        enabled: true,
        conditions: updated,
        activeConditionId: condId,
      },
    } as Partial<FieldDefinition>)
  }

  const activeRule =
    conditions.find((c) => c.id === activeCondId) ??
    conditions.find((c) => c.isDefault) ??
    conditions[0]

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
              <ConditionRow
                key={cond.id}
                fieldId={field.id}
                cond={cond as ConditionStyleRule<unknown>}
                idx={idx}
                isSelected={cond.id === activeRule?.id}
                canDelete={conditions.length > 1}
                onSelect={() => handleSelectCondition(cond.id)}
                onSetDefault={() => handleSetDefault(cond.id)}
                onRename={(newName) => handleRename(cond.id, newName)}
                onDelete={() => handleDeleteCondition(cond.id)}
              />
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

              {field.type === 'text' && (
                <TextStyleControls
                  style={(activeRule.style as Partial<TextFieldStyle>) ?? {}}
                  baseStyle={field.style as TextFieldStyle}
                  allFontFamilies={allFontFamilies}
                  onChange={(patch) => handleUpdateConditionStyle(activeRule.id, patch)}
                />
              )}

              {field.type === 'image' && (
                <ImageStyleControls
                  style={(activeRule.style as Partial<ImageFieldStyle>) ?? {}}
                  baseStyle={field.style as ImageFieldStyle}
                  onChange={(patch) => handleUpdateConditionStyle(activeRule.id, patch)}
                />
              )}

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
