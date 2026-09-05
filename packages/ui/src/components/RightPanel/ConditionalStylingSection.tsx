import { useMemo } from 'react'
import type { FieldDefinition, ConditionStyleRule } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { ConditionRow } from './ConditionRow.js'
import { getAvailableProperties } from './propertyDefinitions.js'
import { ConditionOverridesSection } from './ConditionOverridesSection.js'
import {
  extractSelectedPropIds,
  togglePropertyOverride,
  removePropertyOverride,
} from './propertyOverrideHelpers.js'
import { ConditionStylingInfoTip } from './ConditionStylingInfoTip.js'

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

  function getNextConditionName(existing: ConditionStyleRule<unknown>[]): string {
    let num = 1
    while (existing.some((c) => c.name === `condition-${num}`)) {
      num++
    }
    return `condition-${num}`
  }

  function handleAddCondition() {
    const nextName = getNextConditionName(conditions as ConditionStyleRule<unknown>[])
    const newCond: ConditionStyleRule<unknown> = {
      id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: nextName,
      isDefault: false,
      style: {},
    }
    const nextList = [...conditions, newCond]
    updateField(field.id, {
      conditionalStyles: {
        ...condConfig,
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
    // If the deleted condition was default, promote the first remaining condition to default
    if (wasDefault && filtered[0]) {
      filtered[0] = { ...filtered[0], isDefault: true }
    }
    // If the deleted condition was active, select the new default (or first remaining)
    const nextActiveId =
      activeCondId === condId
        ? (filtered.find((c) => c.isDefault)?.id ?? filtered[0]?.id ?? '')
        : activeCondId

    updateField(field.id, {
      conditionalStyles: {
        ...condConfig,
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
        activeConditionId: activeCondId,
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

  const availableProperties = useMemo(() => getAvailableProperties(field.type), [field.type])

  const selectedPropIds = useMemo(
    () => extractSelectedPropIds(activeRule?.style as Record<string, unknown> | undefined),
    [activeRule?.style],
  )

  function handleToggleProp(propId: string, enabled: boolean) {
    if (!activeRule) return
    const currentStyle = (activeRule.style as Record<string, unknown>) ?? {}
    const baseStyle = (field.style as unknown as Record<string, unknown>) ?? {}
    const nextStyle = togglePropertyOverride(currentStyle, baseStyle, propId, enabled)
    const updated = conditions.map((c) => (c.id === activeRule.id ? { ...c, style: nextStyle } : c))
    updateField(field.id, {
      conditionalStyles: {
        ...condConfig,
        enabled: true,
        conditions: updated,
        activeConditionId: activeRule.id,
      },
    } as Partial<FieldDefinition>)
  }

  function handleRemoveProp(propId: string) {
    if (!activeRule) return
    const currentStyle = (activeRule.style as Record<string, unknown>) ?? {}
    const nextStyle = removePropertyOverride(currentStyle, propId)
    const updated = conditions.map((c) => (c.id === activeRule.id ? { ...c, style: nextStyle } : c))
    updateField(field.id, {
      conditionalStyles: {
        ...condConfig,
        enabled: true,
        conditions: updated,
        activeConditionId: activeRule.id,
      },
    } as Partial<FieldDefinition>)
  }

  return (
    <div className="tg-panel-section" data-testid="conditional-styling-section">
      <div
        className="tg-panel-section-title"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>Condition-based styling</span>
          <ConditionStylingInfoTip field={field} />
        </div>
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
            <ConditionOverridesSection
              field={field}
              activeRule={activeRule as ConditionStyleRule<unknown>}
              availableProperties={availableProperties}
              selectedPropIds={selectedPropIds}
              allFontFamilies={allFontFamilies}
              onToggleProp={handleToggleProp}
              onUpdateStyle={(patch) => handleUpdateConditionStyle(activeRule.id, patch)}
              onRemoveProp={handleRemoveProp}
            />
          )}
        </div>
      )}
    </div>
  )
}
