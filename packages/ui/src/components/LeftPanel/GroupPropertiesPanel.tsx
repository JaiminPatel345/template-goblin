import { useState } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { TextTypographySection } from '../RightPanel/TextTypographySection.js'
import type { GroupDefinition, TextFieldStyle, TextField } from '@template-goblin/types'
import { defaultTextStyle, defaultImageStyle, defaultTableStyle } from '../../utils/defaults.js'

export function GroupPropertiesPanel() {
  const groups = useTemplateStore((s) => s.groups)
  const addGroup = useTemplateStore((s) => s.addGroup)
  const updateGroupStyle = useTemplateStore((s) => s.updateGroupStyle)
  const fonts = useTemplateStore((s) => s.fonts)

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<'text' | 'image' | 'table'>('text')

  const selectedGroup = groups.find((g) => g.id === selectedGroupId)
  const allFontFamilies = Array.from(new Set(fonts.map((f) => f.name)))

  function submitNewGroup() {
    const trimmed = newGroupName.trim()
    if (trimmed.length === 0) return
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    let style: unknown
    if (newGroupType === 'text') style = defaultTextStyle()
    else if (newGroupType === 'image') style = defaultImageStyle()
    else style = defaultTableStyle()

    addGroup({ id, name: trimmed, type: newGroupType, style } as unknown as GroupDefinition)
    setSelectedGroupId(id)
    setShowNewGroup(false)
  }

  // We construct a mock text field to satisfy TextTypographySection constraints,
  // even though we're modifying the group style globally.
  const mockFieldForTypography = selectedGroup
    ? ({
        id: selectedGroup.id,
        type: 'text',
        source: { mode: 'static', required: false },
        style: selectedGroup.style,
      } as unknown as TextField)
    : null

  return (
    <>
      <div className="tg-panel-section">
        <div className="tg-form-row">
          <label>Select Group</label>
          <select
            className="tg-select"
            value={selectedGroupId ?? ''}
            onChange={(e) => setSelectedGroupId(e.target.value || null)}
          >
            <option value="">-- None --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({'type' in g ? g.type : 'legacy'})
              </option>
            ))}
          </select>
        </div>

        {!showNewGroup && (
          <button
            type="button"
            className="tg-btn"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => setShowNewGroup(true)}
          >
            + New Group
          </button>
        )}

        {showNewGroup && (
          <div
            style={{ marginTop: 12, padding: 12, background: 'var(--bg-inset)', borderRadius: 4 }}
          >
            <div className="tg-form-row">
              <label>Name</label>
              <input
                className="tg-input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Group Name"
                autoFocus
              />
            </div>
            <div className="tg-form-row">
              <label>Type</label>
              <select
                className="tg-select"
                value={newGroupType}
                onChange={(e) => setNewGroupType(e.target.value as 'text' | 'image' | 'table')}
              >
                <option value="text">Text</option>
                <option value="image">Image</option>
                <option value="table">Table</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button
                type="button"
                className="tg-btn"
                style={{ flex: 1 }}
                onClick={() => setShowNewGroup(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tg-btn tg-btn--primary"
                style={{ flex: 1 }}
                onClick={submitNewGroup}
              >
                Create
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedGroup &&
        (('type' in selectedGroup ? selectedGroup.type : 'legacy') === 'text' ||
          ('type' in selectedGroup ? selectedGroup.type : 'legacy') === 'legacy') &&
        mockFieldForTypography && (
          <TextTypographySection
            field={mockFieldForTypography}
            style={selectedGroup.style as unknown as TextFieldStyle}
            isDynamic={false}
            allFontFamilies={allFontFamilies}
            onFontSizeChange={(size) => updateGroupStyle(selectedGroup.id, { fontSize: size })}
            updateFieldStyle={(id, updates) => updateGroupStyle(id, updates)}
          />
        )}
    </>
  )
}
