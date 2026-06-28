import { useState } from 'react'
import { useTemplateStore, getFieldDynamicMemo } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
// import { useDialogs } from '../Dialogs/index.js'
import { DialogShell } from '../Dialogs/DialogShell.js'
import { DialogButton } from '../Dialogs/DialogButton.js'
import { defaultTextStyle, defaultImageStyle, defaultTableStyle } from '../../utils/defaults.js'
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
  // QA BUG-11: for static fields show the actual content (truncated)
  // so each row distinguishes itself in the list, instead of every
  // static text item reading 'static text'.
  if (field.source.mode !== 'dynamic') {
    const raw = (field.source as { value?: unknown }).value
    if (field.type === 'text' && typeof raw === 'string' && raw.trim().length > 0) {
      const trimmed = raw.trim()
      return trimmed.length > 32 ? `${trimmed.slice(0, 30)}…` : trimmed
    }
    if (field.type === 'image' && raw && typeof raw === 'object') {
      const r = raw as { filename?: string; color?: string }
      if (r.filename) return r.filename
      if (r.color) return `color ${r.color}`
    }
    if (field.type === 'table' && Array.isArray(raw)) {
      return `static table · ${raw.length} row${raw.length === 1 ? '' : 's'}`
    }
    // BUG-11 continued: if the field was once Dynamic, fall back to
    // the memo'd jsonKey so the user still has a recognisable label
    // (e.g. 'texts.student_name') instead of '<static text>'. Memo
    // is session-local — see fieldDynamicMemo in templateStore.
    const memo = getFieldDynamicMemo(field.id)
    if (memo?.jsonKey) {
      const prefix =
        field.type === 'text' ? 'texts.' : field.type === 'image' ? 'images.' : 'tables.'
      return prefix + memo.jsonKey
    }
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
  const [dragCounter, setDragCounter] = useState(0)

  const targetGroupId = group.id === '__ungrouped__' ? null : group.id
  const dragOver = dragCounter > 0

  return (
    <div
      className={`tg-field-group${dragOver ? ' tg-field-group--drag-over' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragCounter((prev) => prev + 1)
      }}
      onDragOver={(e) => {
        e.preventDefault()
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragCounter((prev) => prev - 1)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragCounter(0)
        const fieldId = e.dataTransfer.getData('fieldId')
        if (fieldId) {
          onDropField(fieldId, targetGroupId)
        }
      }}
    >
      <div className="tg-field-group-header" onClick={() => setCollapsed(!collapsed)}>
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
  const header = useTemplateStore((s) => s.header)
  const footer = useTemplateStore((s) => s.footer)
  const addGroup = useTemplateStore((s) => s.addGroup)
  const updateField = useTemplateStore((s) => s.updateField)
  const selectedFieldIds = useUiStore((s) => s.selectedFieldIds)
  // Clicking a row in the left panel is equivalent to picking the element
  // on the canvas — select + show its properties in the right panel.
  const selectField = useUiStore((s) => s.selectAndFocus)

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

  // #61 follow-up — band fields are tracked in their own store arrays so
  // the FIELDS panel needs to surface them explicitly. We render them as
  // their own (non-droppable) sections above the body groups so users can
  // see / select / inspect a header text field the same way they would a
  // body field.
  const headerFields = header?.enabled ? header.fields : []
  const footerFields = footer?.enabled ? footer.fields : []

  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<'text' | 'image' | 'table'>('text')
  const [overrideConfirm, setOverrideConfirm] = useState<{
    fieldId: string
    groupId: string
    groupName: string
  } | null>(null)

  function handleNewGroup() {
    setNewGroupName('')
    setNewGroupType('text')
    setShowNewGroup(true)
  }

  function submitNewGroup() {
    const trimmed = newGroupName.trim()
    if (trimmed.length === 0) return
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    let style: unknown
    if (newGroupType === 'text') style = defaultTextStyle()
    else if (newGroupType === 'image') style = defaultImageStyle()
    else style = defaultTableStyle()

    addGroup({ id, name: trimmed, type: newGroupType, style } as unknown as GroupDefinition)
    setShowNewGroup(false)
  }

  function handleDropField(fieldId: string, groupId: string | null) {
    if (groupId) {
      const field =
        fields.find((f) => f.id === fieldId) ||
        header?.fields.find((f) => f.id === fieldId) ||
        footer?.fields.find((f) => f.id === fieldId)

      // If the field is already in this group, do nothing
      if (field && field.groupId === groupId) return

      const group = groups.find((g) => g.id === groupId)
      // If group has a type (new strict groups), enforce type match
      const typedGroup = group as unknown as GroupDefinition
      if (
        typedGroup &&
        'type' in typedGroup &&
        typedGroup.type &&
        field &&
        field.type !== typedGroup.type
      ) {
        alert(`Cannot add a ${field.type} field to a ${typedGroup.type} group.`)
        return
      }

      // If moving to a different group, prompt for style override
      if (group && field) {
        setOverrideConfirm({ fieldId, groupId, groupName: group.name })
        return
      }
    }
    updateField(fieldId, { groupId })
  }

  function confirmOverride() {
    if (overrideConfirm) {
      updateField(overrideConfirm.fieldId, { groupId: overrideConfirm.groupId })
      setOverrideConfirm(null)
    }
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
        {/* #61 — header / footer fields show as their own sections above
            the body groups. Drag-out is intentionally disabled (a no-op
            `onDropField`) — the user moves a band field by hiding the
            band, which migrates it to the body atomically. */}
        {headerFields.length > 0 && (
          <GroupSection
            group={{ id: '__header__', name: 'Header' }}
            fields={headerFields}
            selectedFieldIds={selectedFieldIds}
            onSelectField={selectField}
            onDropField={() => undefined}
          />
        )}
        {footerFields.length > 0 && (
          <GroupSection
            group={{ id: '__footer__', name: 'Footer' }}
            fields={footerFields}
            selectedFieldIds={selectedFieldIds}
            onSelectField={selectField}
            onDropField={() => undefined}
          />
        )}
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

      {showNewGroup && (
        <DialogShell
          open={showNewGroup}
          onOpenChange={setShowNewGroup}
          title="New Field Group"
          actions={
            <>
              <DialogButton variant="ghost" onClick={() => setShowNewGroup(false)}>
                Cancel
              </DialogButton>
              <DialogButton
                variant="primary"
                onClick={submitNewGroup}
                disabled={newGroupName.trim().length === 0}
              >
                Create
              </DialogButton>
            </>
          }
        >
          <div className="tg-form-row">
            <label>Name</label>
            <input
              className="tg-input"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="e.g. Header content"
              autoFocus
            />
          </div>
          <div className="tg-form-row" style={{ marginTop: 16 }}>
            <label>Type</label>
            <select
              className="tg-select"
              value={newGroupType}
              onChange={(e) => setNewGroupType(e.target.value as 'text' | 'image' | 'table')}
            >
              <option value="text">Text Fields</option>
              <option value="image">Image Fields</option>
              <option value="table">Table Fields</option>
            </select>
          </div>
        </DialogShell>
      )}

      {overrideConfirm && (
        <DialogShell
          open={!!overrideConfirm}
          onOpenChange={(o) => {
            if (!o) setOverrideConfirm(null)
          }}
          title="Confirm Style Override"
          actions={
            <>
              <DialogButton variant="ghost" onClick={() => setOverrideConfirm(null)}>
                Cancel
              </DialogButton>
              <DialogButton variant="primary" onClick={confirmOverride}>
                Confirm
              </DialogButton>
            </>
          }
        >
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            This element's style will be overwritten by the{' '}
            <strong>{overrideConfirm.groupName}</strong> group's style. Do you want to proceed?
          </div>
        </DialogShell>
      )}
    </>
  )
}
