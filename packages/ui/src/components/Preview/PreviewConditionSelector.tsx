/**
 * Dropdown selector for condition-based styling within the preview dialog (#43).
 *
 * Supports array format: `condition: [{ [keyName]: conditionName }, ...]`.
 * Extracted from `PreviewDialog.tsx` to keep that file under the 300-line
 * cap (Hard Rule #11).
 */

export interface ConditionalFieldOption {
  fieldId: string
  keyName: string
  conditions: string[]
}

interface Props {
  conditionalFields: ConditionalFieldOption[]
  currentConditionMap: Record<string, string>
  onChangeFieldCondition: (keyName: string, conditionName: string) => void
}

/**
 * Renders active condition selectors for all fields with conditional styling enabled.
 */
export function PreviewConditionSelector({
  conditionalFields,
  currentConditionMap,
  onChangeFieldCondition,
}: Props) {
  if (conditionalFields.length === 0) return null

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>
        Active Conditions ({conditionalFields.length})
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {conditionalFields.map((f, idx) => (
          <div key={f.keyName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary, #666)', minWidth: 90 }}>
              {f.keyName}:
            </span>
            <select
              id={idx === 0 ? 'preview-condition-select' : undefined}
              data-testid={
                idx === 0 ? 'preview-condition-select' : `preview-condition-select-${f.keyName}`
              }
              value={currentConditionMap[f.keyName] ?? ''}
              onChange={(e) => onChangeFieldCondition(f.keyName, e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: '1px solid var(--border, #ccc)',
                background: 'var(--bg, #fff)',
                fontSize: 12,
                minWidth: 180,
              }}
            >
              <option value="">(Default / None)</option>
              {f.conditions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
