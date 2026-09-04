/**
 * useSelectedTextField (#167) — resolve the single selected *text* field
 * (body, header, or footer band) plus a style updater bound to it.
 *
 * Shared by the Format ribbon's Text-style group and the floating
 * selection toolbar so both surfaces agree on "is there exactly one text
 * field selected, and how do I write its style?" Returns `null` when the
 * selection is empty, multiple, or a non-text field — callers disable /
 * hide their controls in that case.
 *
 * Writes go through `updateFieldStyle`, which already routes by id to the
 * body pool or the header / footer band pool, so band-field text styling
 * works without any special-casing here.
 */
import { useTemplateStore } from '../store/templateStore.js'
import { useUiStore } from '../store/uiStore.js'
import type { TextField, TextFieldStyle } from '@template-goblin/types'

import { resolveUiField } from '../utils/conditionalStyle.js'

export interface SelectedTextField {
  field: TextField
  updateStyle: (patch: Partial<TextFieldStyle>) => void
}

export function useSelectedTextField(): SelectedTextField | null {
  const selectedIds = useUiStore((s) => s.selectedFieldIds)
  const fields = useTemplateStore((s) => s.fields)
  const header = useTemplateStore((s) => s.header)
  const footer = useTemplateStore((s) => s.footer)
  const updateFieldStyle = useTemplateStore((s) => s.updateFieldStyle)

  if (selectedIds.length !== 1) return null
  const id = selectedIds[0]
  const found =
    fields.find((f) => f.id === id) ??
    header?.fields.find((f) => f.id === id) ??
    footer?.fields.find((f) => f.id === id) ??
    null
  if (!found || found.type !== 'text') return null

  const field = resolveUiField(found as TextField)
  return {
    field,
    updateStyle: (patch) => updateFieldStyle(field.id, patch),
  }
}
