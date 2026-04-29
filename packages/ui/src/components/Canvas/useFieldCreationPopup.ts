/**
 * useFieldCreationPopup — handles the FieldCreationPopup confirm/cancel
 * lifecycle. Extracted from `usePageHandlers` per CLAUDE.md Hard Rule #11
 * (300-line cap); page CRUD and field creation are independent concerns.
 */
import { useState, useCallback } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { createDefaultField } from '../../utils/defaults.js'
import type { FieldDefinition } from '@template-goblin/types'
import type { FieldCreationDraft, SourceInputs } from './FieldCreationPopup.js'

export function useFieldCreationPopup() {
  const addField = useTemplateStore((s) => s.addField)
  const selectField = useUiStore((s) => s.selectField)
  const [pendingDraft, setPendingDraft] = useState<FieldCreationDraft | null>(null)

  const handlePopupConfirm = useCallback(
    (label: string, source: SourceInputs) => {
      if (!pendingDraft) return
      const base = createDefaultField(pendingDraft.type, {
        id: '',
        groupId: pendingDraft.groupId,
        pageId: pendingDraft.pageId,
        x: pendingDraft.x,
        y: pendingDraft.y,
        width: pendingDraft.width,
        height: pendingDraft.height,
        zIndex: pendingDraft.zIndex,
      })

      if (source.mode === 'static' && source.image) {
        useTemplateStore
          .getState()
          .addStaticImage(source.image.filename, source.image.dataUrl, source.image.buffer)
      }

      const withUserInput: FieldDefinition = (() => {
        if (source.mode === 'static') {
          if (base.type === 'text') {
            return { ...base, label, source: { mode: 'static', value: source.value } }
          }
          if (base.type === 'image') {
            const filename = source.image?.filename ?? ''
            return { ...base, label, source: { mode: 'static', value: { filename } } }
          }
          return { ...base, label, source: { mode: 'static', value: [] } }
        }
        const ph = base.type === 'text' ? source.placeholder || null : null
        return {
          ...base,
          label,
          source: {
            mode: 'dynamic',
            jsonKey: source.jsonKey,
            required: source.required,
            placeholder: ph as never,
          },
        } as FieldDefinition
      })()

      addField(withUserInput)
      // Selecting the newly-added field has to wait for the store update to
      // commit so the lookup below sees it. `setTimeout(0)` defers past the
      // current React batch.
      setTimeout(() => {
        const currentFields = useTemplateStore.getState().fields
        const newField = currentFields[currentFields.length - 1]
        if (newField) selectField(newField.id)
      }, 0)
      setPendingDraft(null)
    },
    [pendingDraft, addField, selectField],
  )

  const handlePopupCancel = useCallback(() => setPendingDraft(null), [])

  return {
    pendingDraft,
    setPendingDraft,
    handlePopupConfirm,
    handlePopupCancel,
  }
}
