import { useState } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import type { FieldDefinition, GroupDefinition } from '@template-goblin/types'

const TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  table: 'Table',
}

/**
 * Display label for a field in the left-panel list. For dynamic fields this is
 * the user-typed `jsonKey` (prefixed with the field-type namespace for
 * readability); for static fields it falls back to `<static <type>>`.
 */
function fieldDisplayKey(field: FieldDefinition): string {
  // Defence in depth: a rehydrated or migrated-in-flight field may be missing
  // `source` entirely. Don't crash; show a "<legacy ...>" fallback that makes
  // the issue visible without breaking the panel.
  if (!field.source) {
    return `<legacy ${field.type}>`
  }
  if (field.source.mode !== 'dynamic') {
    return `<static ${field.type}>`
  }
  const prefix = field.type === 'text' ? 'texts.' : field.type === 'image' ? 'images.' : 'tables.'
  return prefix + field.source.jsonKey
}

function FieldItem({
  field,
  isSelected,
  onSelect,
}: {
  field: FieldDefinition
  isSelected: boolean
  onSelect: () => void
}) {
  const cls = `tg-field-item${isSelected ? ' tg-field-item--selected' : ''}`
  const badgeCls = `tg-field-type-badge tg-field-type-badge--${field.type}`

  return (
    <div
      className={cls}
      onClick={onSelect}
      draggable={true}
      onDragStart={(e) => e.dataTransfer.setData('fieldId', field.id)}
    >
      <span className={badgeCls}>{TYPE_LABELS[field.type] ?? field.type}</span>
      <div className="tg-field-item-info">
        <span className="tg-field-item-key">{fieldDisplayKey(field)}</span>
        <span className="tg-field-item-dims">
          {Math.round(field.width)}x{Math.round(field.height)}
        </span>
      </div>
    </div>
  )
}

function GroupSection({
  group,
  fields,
  selectedFieldIds,
  onSelectField,
  onDropField,
  defaultCollapsed,
}: {
  group: { id: string; name: string }
  fields: FieldDefinition[]
  selectedFieldIds: string[]
  onSelectField: (id: string) => void
  onDropField: (fieldId: string, groupId: string | null) => void
  defaultCollapsed?: boolean
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed ?? false)
  const [dragOver, setDragOver] = useState(false)

  const targetGroupId = group.id === '__ungrouped__' ? null : group.id

  return (
    <div className={`tg-field-group${dragOver ? ' tg-field-group--drag-over' : ''}`}>
      <div
        className="tg-field-group-header"
        onClick={() => setCollapsed(!collapsed)}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const fieldId = e.dataTransfer.getData('fieldId')
          if (fieldId) {
            onDropField(fieldId, targetGroupId)
          }
        }}
      >
        <span className="tg-field-group-toggle">{collapsed ? '\u25B6' : '\u25BC'}</span>
        <span className="tg-field-group-name">{group.name}</span>
        <span className="tg-field-group-count">({fields.length})</span>
      </div>
      {!collapsed && (
        <div className="tg-field-group-items">
          {fields.map((field) => (
            <FieldItem
              key={field.id}
              field={field}
              isSelected={selectedFieldIds.includes(field.id)}
              onSelect={() => onSelectField(field.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function LeftPanel() {
  const fields = useTemplateStore((s) => s.fields)
  const groups = useTemplateStore((s) => s.groups)
  const addGroup = useTemplateStore((s) => s.addGroup)
  const updateField = useTemplateStore((s) => s.updateField)
  const selectedFieldIds = useUiStore((s) => s.selectedFieldIds)
  const selectField = useUiStore((s) => s.selectField)

  // Build a map from groupId to fields
  const groupedFields = new Map<string | null, FieldDefinition[]>()
  for (const field of fields) {
    const key = field.groupId
    const list = groupedFields.get(key)
    if (list) {
      list.push(field)
    } else {
      groupedFields.set(key, [field])
    }
  }

  function handleNewGroup() {
    const name = prompt('Group name:')
    if (!name || !name.trim()) return
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    addGroup({ id, name: name.trim() })
  }

  function handleDropField(fieldId: string, groupId: string | null) {
    updateField(fieldId, { groupId })
  }

  // Separate groups that have fields from those that are empty, and handle ungrouped
  const ungroupedFields = groupedFields.get(null) ?? []

  return (
    <>
      <div className="tg-left-panel-header">
        <span>Fields</span>
        <button className="tg-btn" onClick={handleNewGroup}>
          New Group
        </button>
      </div>

      <div className="tg-field-list">
        {groups.map((group: GroupDefinition) => {
          const groupFields = groupedFields.get(group.id) ?? []
          return (
            <GroupSection
              key={group.id}
              group={group}
              fields={groupFields}
              selectedFieldIds={selectedFieldIds}
              onSelectField={selectField}
              onDropField={handleDropField}
            />
          )
        })}

        {/* Always show Ungrouped so fields can be dragged out of groups */}
        <GroupSection
          group={{ id: '__ungrouped__', name: 'Ungrouped' }}
          fields={ungroupedFields}
          selectedFieldIds={selectedFieldIds}
          onSelectField={selectField}
          onDropField={handleDropField}
        />
      </div>
    </>
  )
}
