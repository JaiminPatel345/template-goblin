import type { ConditionStyleRule } from '@template-goblin/types'

interface ConditionRowProps {
  fieldId: string
  cond: ConditionStyleRule<unknown>
  idx: number
  isSelected: boolean
  canDelete: boolean
  onSelect: () => void
  onSetDefault: () => void
  onRename: (newName: string) => void
  onDelete: () => void
}

export function ConditionRow({
  fieldId,
  cond,
  idx,
  isSelected,
  canDelete,
  onSelect,
  onSetDefault,
  onRename,
  onDelete,
}: ConditionRowProps) {
  return (
    <div
      data-testid={`condition-row-${idx}`}
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 8px',
        borderRadius: 6,
        background: isSelected ? 'var(--bg-hover)' : 'transparent',
        border: isSelected ? '1px solid var(--primary, #0284c7)' : '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      {/* Radio button selects the active style for editing and canvas preview */}
      <input
        type="radio"
        name={`active-cond-${fieldId}`}
        data-testid={`condition-radio-${idx}`}
        checked={isSelected}
        onChange={onSelect}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        title="Select this condition to edit and preview"
        style={{ cursor: 'pointer', margin: 0 }}
      />

      {/* Editable condition name */}
      <input
        type="text"
        className="tg-input"
        data-testid={`condition-name-input-${idx}`}
        value={cond.name}
        onChange={(e) => onRename(e.target.value)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
        style={{ flex: 1, height: 24, fontSize: 12, padding: '2px 6px' }}
      />

      {/* Default text button: click to set as default fallback condition */}
      <button
        type="button"
        data-testid={`condition-default-toggle-${cond.id}`}
        onClick={(e) => {
          e.stopPropagation()
          onSetDefault()
        }}
        title={
          cond.isDefault
            ? 'Default condition (used when no condition is specified at generation)'
            : 'Click to make this the default condition'
        }
        style={{
          fontSize: 10,
          fontWeight: cond.isDefault ? 600 : 400,
          padding: '2px 8px',
          borderRadius: 10,
          border: cond.isDefault ? '1px solid var(--primary, #0284c7)' : '1px solid var(--border)',
          background: cond.isDefault
            ? 'var(--primary-light, #e0f2fe)'
            : 'var(--bg-tertiary, #f8fafc)',
          color: cond.isDefault ? 'var(--primary, #0284c7)' : 'var(--text-muted)',
          cursor: cond.isDefault ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          whiteSpace: 'nowrap',
          lineHeight: '16px',
        }}
      >
        {cond.isDefault && <span style={{ fontSize: 8 }}>●</span>}
        Default
      </button>

      {/* Delete condition */}
      <button
        type="button"
        className="tg-btn tg-btn--icon tg-btn--sm"
        data-testid={`condition-delete-${cond.id}`}
        disabled={!canDelete}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        title="Delete condition"
        style={{
          opacity: canDelete ? 1 : 0.4,
          padding: 0,
          width: 22,
          height: 22,
          minWidth: 22,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ✕
      </button>
    </div>
  )
}
