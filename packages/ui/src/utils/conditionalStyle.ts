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
    style: mergeFieldStyles(field, matchedRule.style as Record<string, unknown>),
  }
}

/**
 * Merges condition style overrides onto the base field style.
 * For tables, deep merges nested cell and row styles so partial overrides don't wipe out other properties.
 */
function mergeFieldStyles<T extends FieldDefinition>(
  field: T,
  ruleStyle: Record<string, unknown>,
): T['style'] {
  if (field.type === 'table') {
    const baseTableStyle = field.style as unknown as Record<string, unknown>
    const patchTableStyle = ruleStyle as Record<string, unknown>
    const merged = {
      ...baseTableStyle,
      ...patchTableStyle,
    }

    if (baseTableStyle.headerStyle || patchTableStyle.headerStyle) {
      merged.headerStyle = {
        ...((baseTableStyle.headerStyle as Record<string, unknown>) ?? {}),
        ...((patchTableStyle.headerStyle as Record<string, unknown>) ?? {}),
      }
    }

    if (baseTableStyle.rowStyle || patchTableStyle.rowStyle) {
      merged.rowStyle = {
        ...((baseTableStyle.rowStyle as Record<string, unknown>) ?? {}),
        ...((patchTableStyle.rowStyle as Record<string, unknown>) ?? {}),
      }
    }

    return merged as unknown as T['style']
  }

  return {
    ...field.style,
    ...ruleStyle,
  } as unknown as T['style']
}
