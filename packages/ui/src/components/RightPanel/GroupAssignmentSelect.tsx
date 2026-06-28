import { useState } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { DialogShell } from '../Dialogs/DialogShell.js'
import { DialogButton } from '../Dialogs/DialogButton.js'
import type { FieldDefinition, GroupDefinition } from '@template-goblin/types'

export function GroupAssignmentSelect({ field }: { field: FieldDefinition }) {
  const groups = useTemplateStore((s) => s.groups)
  const updateField = useTemplateStore((s) => s.updateField)

  const [overrideConfirm, setOverrideConfirm] = useState<{
    groupId: string
    groupName: string
  } | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const groupId = e.target.value || null
    if (groupId) {
      const group = groups.find((g) => g.id === groupId)
      if (group) {
        setOverrideConfirm({ groupId, groupName: group.name })
        return
      }
    }
    updateField(field.id, { groupId })
  }

  function confirmOverride() {
    if (overrideConfirm) {
      updateField(field.id, { groupId: overrideConfirm.groupId })
      setOverrideConfirm(null)
    }
  }

  // Only show groups of the same type, plus support for legacy untyped groups
  const compatibleGroups = groups.filter(
    (g) =>
      !('type' in g) ||
      !(g as unknown as GroupDefinition).type ||
      (g as unknown as GroupDefinition).type === field.type,
  )

  return (
    <>
      <div className="tg-form-row">
        <label>Group</label>
        <select className="tg-select" value={field.groupId ?? ''} onChange={handleChange}>
          <option value="">None</option>
          {compatibleGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

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
