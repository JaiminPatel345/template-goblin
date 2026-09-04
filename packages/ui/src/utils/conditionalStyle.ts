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

  // 1. In Playground, prioritize the condition selected by the user (activeConditionId)
  let matchedRule = condConfig.activeConditionId
    ? condConfig.conditions.find((c) => c.id === condConfig.activeConditionId)
    : undefined

  // 2. If no activeConditionId, check data overrides
  if (!matchedRule) {
    const jsonKey =
      field.source?.mode === 'dynamic' && 'jsonKey' in field.source
        ? field.source.jsonKey
        : undefined

    let reqName: string | undefined

    // Check data.conditions map
    if (data?.conditions) {
      if (jsonKey && typeof data.conditions[jsonKey] === 'string') {
        reqName = data.conditions[jsonKey]
      } else if (typeof data.conditions[field.id] === 'string') {
        reqName = data.conditions[field.id]
      }
    }

    // Check data.condition array: [{ [keyName]: conditionName }]
    if (!reqName && Array.isArray(data?.condition)) {
      for (const item of data.condition) {
        if (item && typeof item === 'object') {
          if (jsonKey && typeof item[jsonKey] === 'string') {
            reqName = item[jsonKey]
            break
          }
          if (typeof item[field.id] === 'string') {
            reqName = item[field.id]
            break
          }
        }
      }
    }

    // Check data.condition object
    if (
      !reqName &&
      data?.condition &&
      typeof data.condition === 'object' &&
      !Array.isArray(data.condition)
    ) {
      const condObj = data.condition as Record<string, string>
      if (jsonKey && typeof condObj[jsonKey] === 'string') {
        reqName = condObj[jsonKey]
      } else if (typeof condObj[field.id] === 'string') {
        reqName = condObj[field.id]
      }
    }

    // Check data.condition string
    if (!reqName && typeof data?.condition === 'string' && data.condition.length > 0) {
      reqName = data.condition
    }

    if (reqName) {
      matchedRule = condConfig.conditions.find((c) => c.name === reqName)
    }
  }

  // 3. Fallback to default condition rule (default is only used if nothing selected/given)
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
