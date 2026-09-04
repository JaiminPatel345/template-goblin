import type { FieldDefinition, InputJSON } from '@template-goblin/types'

/**
 * Resolves the effective field definition with any active condition-based style overrides merged in.
 *
 * Priority order for resolving the active condition:
 *  1. Per-field condition override: `data.conditions?.[field.id]` or `data.conditions?.[jsonKey]`
 *  2. Global condition in data: `data.condition`
 *  3. Explicit condition parameter passed directly: `activeConditionName`
 *  4. Default condition: rule marked `isDefault: true` on `field.conditionalStyles`
 *  5. Fallback: unmodified `field` (if conditional styling disabled / no default rule).
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

  // 1. Per-field lookup in data.conditions
  let reqName: string | undefined
  if (data?.conditions) {
    reqName = data.conditions[field.id]
    if (!reqName && field.source?.mode === 'dynamic' && 'jsonKey' in field.source) {
      reqName = data.conditions[field.source.jsonKey]
    }
  }

  // 2. Global condition in data.condition
  if (!reqName && data?.condition) {
    reqName = data.condition
  }

  // 3. Explicit activeConditionName parameter
  if (!reqName && activeConditionName) {
    reqName = activeConditionName
  }

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

    return merged as unknown as T['style']
  }

  return {
    ...field.style,
    ...ruleStyle,
  } as unknown as T['style']
}
