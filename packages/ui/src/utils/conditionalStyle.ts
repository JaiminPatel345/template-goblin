import type { FieldDefinition, InputJSON } from '@template-goblin/types'

export interface ActiveConditionConfig {
  activeConditionId?: string
}

/**
 * Resolves the effective field definition for the UI inspector and canvas preview.
 * When conditional styling is enabled, merges the active condition's style overrides onto base field.style.
 */
export function resolveUiField<T extends FieldDefinition>(field: T, data?: InputJSON | null): T {
  const condConfig = field.conditionalStyles
  if (
    !condConfig ||
    !condConfig.enabled ||
    !condConfig.conditions ||
    condConfig.conditions.length === 0
  ) {
    return field
  }

  // 1. Check data.conditions map or data.condition
  let reqName: string | undefined
  if (data?.conditions) {
    reqName = data.conditions[field.id]
    if (!reqName && field.source?.mode === 'dynamic' && 'jsonKey' in field.source) {
      reqName = data.conditions[field.source.jsonKey]
    }
  }

  if (!reqName && data?.condition) {
    reqName = data.condition
  }

  let matchedRule = reqName ? condConfig.conditions.find((c) => c.name === reqName) : undefined

  // 2. Check UI activeConditionId
  if (!matchedRule) {
    const activeId = condConfig.activeConditionId
    if (activeId) {
      matchedRule = condConfig.conditions.find((c) => c.id === activeId)
    }
  }

  // 3. Fallback to default condition rule
  if (!matchedRule) {
    matchedRule = condConfig.conditions.find((c) => c.isDefault) ?? condConfig.conditions[0]
  }

  if (!matchedRule || !matchedRule.style) {
    return field
  }

  return {
    ...field,
    style: {
      ...field.style,
      ...matchedRule.style,
    },
  }
}
