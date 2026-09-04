import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../templateStore.js'
import type { TextField, FieldDefinition, ConditionStyleRule } from '@template-goblin/types'

function createSampleTextField(): TextField {
  return {
    id: 'field-test',
    type: 'text',
    groupId: null,
    pageId: null,
    label: 'Test Field',
    x: 0,
    y: 0,
    width: 200,
    height: 30,
    zIndex: 0,
    style: {
      fontId: null,
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontSizeMin: 10,
      lineHeight: 1.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      align: 'left',
      verticalAlign: 'top',
      maxRows: 1,
      overflowMode: 'truncate',
      snapToGrid: false,
    },
    source: { mode: 'static', value: 'Hello' },
  }
}

/**
 * Replicates the deletion logic implemented in ConditionalStylingSection
 * to test all edge cases and state transitions.
 */
function deleteConditionFromField(fieldId: string, condIdToDelete: string) {
  const field = useTemplateStore.getState().fields.find((f) => f.id === fieldId)
  if (!field || !field.conditionalStyles) return

  const condConfig = field.conditionalStyles
  const conditions = condConfig.conditions
  if (conditions.length <= 1) return // Guard: cannot delete only condition

  const wasDefault = conditions.find((c) => c.id === condIdToDelete)?.isDefault
  const filtered = conditions.filter((c) => c.id !== condIdToDelete)

  // Promotion: if deleted condition was default, promote first remaining to default
  if (wasDefault && filtered[0]) {
    filtered[0] = { ...filtered[0], isDefault: true }
  }

  // Active transition: if deleted condition was active, switch to default or first remaining
  const activeCondId = condConfig.activeConditionId
  const nextActiveId =
    activeCondId === condIdToDelete
      ? (filtered.find((c) => c.isDefault)?.id ?? filtered[0]?.id ?? '')
      : activeCondId

  useTemplateStore.getState().updateField(fieldId, {
    conditionalStyles: {
      ...condConfig,
      enabled: true,
      conditions: filtered,
      activeConditionId: nextActiveId,
    },
  } as Partial<FieldDefinition>)
}

function getNextConditionName(existing: ConditionStyleRule<unknown>[]): string {
  let num = 1
  while (existing.some((c) => c.name === `condition-${num}`)) {
    num++
  }
  return `condition-${num}`
}

function addConditionToField(fieldId: string) {
  const field = useTemplateStore.getState().fields.find((f) => f.id === fieldId)
  if (!field || !field.conditionalStyles) return

  const condConfig = field.conditionalStyles
  const conditions = condConfig.conditions
  const nextName = getNextConditionName(conditions as ConditionStyleRule<unknown>[])
  const newCond: ConditionStyleRule<unknown> = {
    id: `cond-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: nextName,
    isDefault: false,
    style: {},
  }
  const nextList = [...conditions, newCond]
  useTemplateStore.getState().updateField(fieldId, {
    conditionalStyles: {
      ...condConfig,
      enabled: true,
      conditions: nextList,
      activeConditionId: newCond.id,
    },
  } as Partial<FieldDefinition>)
}

describe('Conditional Styling - Delete Condition Edge Cases', () => {
  beforeEach(() => {
    useTemplateStore.getState().reset()
    const textF = createSampleTextField()
    useTemplateStore.getState().addField(textF)
  })

  it('deleting a secondary condition keeps default and active conditions intact', () => {
    useTemplateStore.getState().updateField('field-test', {
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c1',
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#ff0000' } },
          { id: 'c2', name: 'condition-2', isDefault: false, style: { color: '#00ff00' } },
        ],
      },
    } as Partial<FieldDefinition>)

    deleteConditionFromField('field-test', 'c2')

    const field = useTemplateStore.getState().fields.find((f) => f.id === 'field-test')
    expect(field?.conditionalStyles?.conditions).toHaveLength(1)
    expect(field?.conditionalStyles?.conditions[0]?.id).toBe('c1')
    expect(field?.conditionalStyles?.conditions[0]?.isDefault).toBe(true)
    expect(field?.conditionalStyles?.activeConditionId).toBe('c1')
  })

  it('deleting the active condition switches activeConditionId to the remaining default condition', () => {
    useTemplateStore.getState().updateField('field-test', {
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c2',
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#ff0000' } },
          { id: 'c2', name: 'condition-2', isDefault: false, style: { color: '#00ff00' } },
        ],
      },
    } as Partial<FieldDefinition>)

    deleteConditionFromField('field-test', 'c2')

    const field = useTemplateStore.getState().fields.find((f) => f.id === 'field-test')
    expect(field?.conditionalStyles?.conditions).toHaveLength(1)
    expect(field?.conditionalStyles?.activeConditionId).toBe('c1')
  })

  it('deleting the default condition automatically promotes the first remaining condition to default', () => {
    useTemplateStore.getState().updateField('field-test', {
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c2',
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#ff0000' } },
          { id: 'c2', name: 'condition-2', isDefault: false, style: { color: '#00ff00' } },
          { id: 'c3', name: 'condition-3', isDefault: false, style: { color: '#0000ff' } },
        ],
      },
    } as Partial<FieldDefinition>)

    deleteConditionFromField('field-test', 'c1')

    const field = useTemplateStore.getState().fields.find((f) => f.id === 'field-test')
    expect(field?.conditionalStyles?.conditions).toHaveLength(2)
    // First remaining condition (c2) should now be default
    expect(field?.conditionalStyles?.conditions[0]?.id).toBe('c2')
    expect(field?.conditionalStyles?.conditions[0]?.isDefault).toBe(true)
    // activeConditionId was c2, so it stays c2
    expect(field?.conditionalStyles?.activeConditionId).toBe('c2')
  })

  it('deleting both the default AND active condition promotes and selects the remaining condition', () => {
    useTemplateStore.getState().updateField('field-test', {
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c1',
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#ff0000' } },
          { id: 'c2', name: 'condition-2', isDefault: false, style: { color: '#00ff00' } },
        ],
      },
    } as Partial<FieldDefinition>)

    deleteConditionFromField('field-test', 'c1')

    const field = useTemplateStore.getState().fields.find((f) => f.id === 'field-test')
    expect(field?.conditionalStyles?.conditions).toHaveLength(1)
    expect(field?.conditionalStyles?.conditions[0]?.id).toBe('c2')
    expect(field?.conditionalStyles?.conditions[0]?.isDefault).toBe(true)
    expect(field?.conditionalStyles?.activeConditionId).toBe('c2')
  })

  it('prevents deletion when only 1 condition remains', () => {
    useTemplateStore.getState().updateField('field-test', {
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c1',
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { color: '#ff0000' } },
        ],
      },
    } as Partial<FieldDefinition>)

    deleteConditionFromField('field-test', 'c1')

    const field = useTemplateStore.getState().fields.find((f) => f.id === 'field-test')
    // Still 1 condition, not deleted
    expect(field?.conditionalStyles?.conditions).toHaveLength(1)
    expect(field?.conditionalStyles?.conditions[0]?.id).toBe('c1')
  })

  it('avoids duplicate condition names when deleting and re-adding conditions', () => {
    useTemplateStore.getState().updateField('field-test', {
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c3',
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: {} },
          { id: 'c2', name: 'condition-2', isDefault: false, style: {} },
          { id: 'c3', name: 'condition-3', isDefault: false, style: {} },
        ],
      },
    } as Partial<FieldDefinition>)

    // Delete condition-2 (leaving condition-1, condition-3)
    deleteConditionFromField('field-test', 'c2')

    // Add a new condition: should NOT duplicate 'condition-3'
    addConditionToField('field-test')

    const field = useTemplateStore.getState().fields.find((f) => f.id === 'field-test')
    const names = field?.conditionalStyles?.conditions.map((c) => c.name)
    expect(names).toHaveLength(3)
    // Check all names are unique
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(3)
    expect(names).toContain('condition-1')
    expect(names).toContain('condition-3')
    expect(names).toContain('condition-2') // filled the gap without colliding with condition-3
  })

  it('editing field styles after active condition deletion modifies the newly active condition', () => {
    useTemplateStore.getState().updateField('field-test', {
      conditionalStyles: {
        enabled: true,
        activeConditionId: 'c2',
        conditions: [
          { id: 'c1', name: 'condition-1', isDefault: true, style: { fontSize: 14 } },
          { id: 'c2', name: 'condition-2', isDefault: false, style: { fontSize: 20 } },
        ],
      },
    } as Partial<FieldDefinition>)

    // Delete active condition c2
    deleteConditionFromField('field-test', 'c2')

    // Now c1 is active. Update style.
    useTemplateStore.getState().updateFieldStyle('field-test', { fontSize: 18, color: '#333333' })

    const field = useTemplateStore.getState().fields.find((f) => f.id === 'field-test') as TextField
    expect(field.conditionalStyles?.activeConditionId).toBe('c1')
    expect(field.conditionalStyles?.conditions[0]?.style.fontSize).toBe(18)
    expect(field.conditionalStyles?.conditions[0]?.style.color).toBe('#333333')
  })
})
