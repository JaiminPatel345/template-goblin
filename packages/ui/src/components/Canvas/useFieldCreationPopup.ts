/**
 * useFieldCreationPopup — handles the FieldCreationPopup confirm/cancel
 * lifecycle. Extracted from `usePageHandlers` per CLAUDE.md Hard Rule #11
 * (300-line cap); page CRUD and field creation are independent concerns.
 */
import { useState, useCallback } from 'react'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { createDefaultField } from '../../utils/defaults.js'
import { autoShrinkStaticField } from '../../utils/autoShrinkDispatch.js'
import { currentPageBandContext } from './bandGeometry.js'
import type { FieldDefinition, PageBand } from '@template-goblin/types'
import type { FieldCreationDraft, SourceInputs } from './FieldCreationPopup.js'

/**
 * Decide whether a freshly drawn rect lands inside the header, the footer,
 * or the body (#61). We pick the zone the rect's CENTRE Y falls into so
 * a rect that straddles the band boundary still snaps to whichever side
 * carries most of its area.
 */
function detectDrawZone(
  rectY: number,
  rectHeight: number,
  header: PageBand | undefined,
  footer: PageBand | undefined,
  pageHeight: number,
): 'header' | 'footer' | 'body' {
  const centerY = rectY + rectHeight / 2
  if (header?.enabled && header.style.height > 0 && centerY < header.style.height) {
    return 'header'
  }
  if (footer?.enabled && footer.style.height > 0 && centerY > pageHeight - footer.style.height) {
    return 'footer'
  }
  return 'body'
}

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
            // GH #81 — solid-colour static fields store `{ color }`
            // directly. No filename, no static-image asset, no fit math.
            if (source.color) {
              return { ...base, label, source: { mode: 'static', value: { color: source.color } } }
            }
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

      if (base.type === 'text' && source.trim !== undefined) {
        withUserInput.style = {
          ...withUserInput.style,
          trim: source.trim,
        }
      }

      // #61 — route the new field to the band store when the draw rect
      // landed inside a header / footer band. Body fields keep the legacy
      // path. Band fields' x/y are stored band-local so the renderer can
      // re-add the band offset on every paint.
      const store = useTemplateStore.getState()
      // Zone-detect against the VIEWED page: per-page heights shift the
      // footer zone, and a band with applyToFirstPage=false doesn't render
      // on page 0 — drawing in its strip there must create a BODY field
      // (it previously vanished into a band that never renders here).
      const pageCtx = currentPageBandContext()
      const zone = detectDrawZone(
        pendingDraft.y,
        pendingDraft.height,
        pageCtx.header,
        pageCtx.footer,
        pageCtx.pageHeight,
      )

      if (zone !== 'body') {
        const band = zone === 'header' ? pageCtx.header : pageCtx.footer
        // `band` is non-null here because `zone !== 'body'` only returns
        // when the corresponding band exists with height > 0.
        const bandTop = zone === 'header' ? 0 : pageCtx.pageHeight - (band?.style.height ?? 0)
        const bandLocalX = pendingDraft.x - (band?.style.paddingLeft ?? 0)
        const bandLocalY = pendingDraft.y - bandTop - (band?.style.paddingTop ?? 0)
        const bandField: FieldDefinition = {
          ...withUserInput,
          // generate a unique-ish id; store mutations don't auto-id band fields.
          id: `${zone}-${withUserInput.type}-${Math.random().toString(36).slice(2, 9)}`,
          x: Math.max(0, bandLocalX),
          y: Math.max(0, bandLocalY),
        }
        if (zone === 'header') store.addHeaderField(bandField)
        else store.addFooterField(bandField)
        setTimeout(() => {
          if (bandField.source?.mode === 'static') {
            void autoShrinkStaticField(bandField.id)
          }
        }, 0)
        setPendingDraft(null)
        return
      }

      addField(withUserInput)
      // Selecting the newly-added field has to wait for the store update to
      // commit so the lookup below sees it. `setTimeout(0)` defers past the
      // current React batch.
      setTimeout(() => {
        const currentFields = useTemplateStore.getState().fields
        const newField = currentFields[currentFields.length - 1]
        if (newField) {
          selectField(newField.id)
          // GH #42 — collapse dead space in the just-created rect when the
          // content's natural / measured size is smaller than what the user
          // drew. Image path resolves the dataUrl asynchronously, so the
          // dispatcher is fire-and-forget.
          if (newField.source?.mode === 'static') {
            void autoShrinkStaticField(newField.id)
          }
        }
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
