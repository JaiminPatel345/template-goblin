import type { FieldDefinition, InputJSON } from '@template-goblin/types'

/**
 * Resolves the effective field definition with any active condition-based style overrides merged in.
 *
 * Priority order for resolving the active condition:
 *  1. Condition array in data: `data.condition` matching `jsonKey` or `field.id`
 *  2. Explicit condition parameter passed directly: `activeConditionName`
 *  3. Default condition: rule marked `isDefault: true` on `field.conditionalStyles`
 *  4. Fallback: unmodified `field` (if conditional styling disabled / no default rule).
 */
export function resolveEffectiveField<T extends FieldDefinition>(
  field: T,
  data?: InputJSON | null,
  activeConditionName?: string,
): T {
  const condConfig = field.conditionalStyles
  if (
    !condConfig ||
    !condConfig.enabled ||
    !condConfig.conditions ||
    condConfig.conditions.length === 0
  ) {
    return field
  }

  // Extract requested condition name from data (array, object, or string) or parameter
  const reqName = extractRequestedConditionName(field, data, activeConditionName)

  // Match condition rule case-sensitively
  let matchedRule = reqName ? condConfig.conditions.find((c) => c.name === reqName) : undefined

  // 4. Fallback to default condition rule if no exact match
  if (!matchedRule) {
    matchedRule = condConfig.conditions.find((c) => c.isDefault)
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

    if (baseTableStyle.tableBorder || patchTableStyle.tableBorder) {
      merged.tableBorder = {
        ...((baseTableStyle.tableBorder as Record<string, unknown>) ?? {}),
        ...((patchTableStyle.tableBorder as Record<string, unknown>) ?? {}),
      }
    }

    return merged as unknown as T['style']
  }

  return {
    ...field.style,
    ...ruleStyle,
  } as unknown as T['style']
}

/**
 * Extracts the requested condition name for a field from input data.
 * Checks `data.condition` array: `[{ [keyName]: conditionName }]` matching `jsonKey`, `field.id`, or `field.label`.
 * Falls back to explicit `activeConditionName` parameter if provided.
 */
export function extractRequestedConditionName(
  field: FieldDefinition,
  data?: InputJSON | null,
  activeConditionName?: string,
): string | undefined {
  const jsonKey =
    field.source?.mode === 'dynamic' && 'jsonKey' in field.source ? field.source.jsonKey : undefined

  // Check data.condition: Array of objects [{ keyName: conditionName }]
  if (Array.isArray(data?.condition)) {
    for (const item of data.condition) {
      if (item && typeof item === 'object') {
        if (jsonKey && typeof item[jsonKey] === 'string') {
          return item[jsonKey]
        }
        if (typeof item[field.id] === 'string') {
          return item[field.id]
        }
        if (field.label && typeof item[field.label] === 'string') {
          return item[field.label]
        }
      }
    }
  }

  // Explicit activeConditionName parameter
  if (activeConditionName) {
    return activeConditionName
  }

  return undefined
}
