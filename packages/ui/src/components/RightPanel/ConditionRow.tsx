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
        padding: '4px 6px',
        borderRadius: 4,
        background: isSelected ? 'var(--bg-hover)' : 'transparent',
        border: isSelected ? '1px solid var(--primary, #0284c7)' : '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      <input
        type="radio"
        name={`default-cond-${fieldId}`}
        data-testid={`condition-default-toggle-${cond.id}`}
        checked={cond.isDefault}
        onChange={onSetDefault}
        onClick={(e) => e.stopPropagation()}
        title="Mark as default condition"
      />
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
        style={{ flex: 1, height: 24, fontSize: 12, padding: '2px 4px' }}
      />
      {cond.isDefault && (
        <span
          style={{
            fontSize: 10,
            padding: '1px 4px',
            background: 'var(--primary-light, #e0f2fe)',
            color: 'var(--primary, #0284c7)',
            borderRadius: 3,
          }}
        >
          Default
        </span>
      )}
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
        style={{ opacity: canDelete ? 1 : 0.4 }}
      >
        ✕
      </button>
    </div>
  )
}
