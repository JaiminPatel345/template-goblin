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

  // Deep merge base style with conditional style overrides
  const mergedStyle = {
    ...field.style,
    ...matchedRule.style,
  }

  return {
    ...field,
    style: mergedStyle,
  }
}
