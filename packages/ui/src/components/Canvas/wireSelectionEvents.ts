/**
 * wireSelectionEvents — Fabric `selection:*` event handlers that mirror the
 * canvas's active-object set into the UI store and apply per-field selection
 * emphasis (REQ-011, REQ-017, REQ-052, REQ-053). Extracted from
 * `useFabricCanvas.ts` to keep that file under the 300 LOC cap (Hard Rule
 * #11).
 */
import type { Canvas as FabricCanvas } from 'fabric'
import { useUiStore } from '../../store/uiStore.js'
import { syncSelectionEmphasis } from './fabricUtils.js'

/** Wire `selection:*` events on the given Fabric canvas. */
export function wireSelectionEvents(fc: FabricCanvas) {
  // Fabric's `opt.selected` / `opt.deselected` carry only the DELTA for an
  // event — not the full active set. For shift+click multi-select we need
  // the current snapshot of the canvas's active objects; read via
  // `fc.getActiveObjects()` which returns every individually-selected
  // object (flattening ActiveSelection wrappers).
  const sync = () => {
    const ids = fc
      .getActiveObjects()
      .map((o) => o.__fieldId)
      .filter((id): id is string => !!id)
    const current = useUiStore.getState().selectedFieldIds
    const sortedNew = [...ids].sort()
    const sortedCur = [...current].sort()
    const storeInSync =
      sortedNew.length === sortedCur.length && sortedNew.every((id, i) => id === sortedCur[i])
    if (!storeInSync) {
      if (ids.length === 0) {
        if (current.length > 0) useUiStore.getState().clearSelection()
      } else if (ids.length === 1) {
        const onlyId = ids[0]
        if (onlyId) useUiStore.getState().selectAndFocus(onlyId)
      } else {
        useUiStore.getState().selectFields(ids)
        // Multi-select still wants the properties panel visible so the user
        // can see "Multiple fields selected" context. Under GH #19 that
        // panel lives on the left.
        useUiStore.getState().setShowLeftPanel(true)
      }
    }
    // Visual emphasis reflects the canvas active-object set regardless of
    // whether the store changed (the set itself may still differ from the
    // previous emphasis state — e.g. on a shift-click that grew the selection).
    syncSelectionEmphasis(fc)
  }

  fc.on('selection:created', sync)
  fc.on('selection:updated', sync)
  fc.on('selection:cleared', () => {
    if (useUiStore.getState().selectedFieldIds.length > 0) {
      useUiStore.getState().clearSelection()
    }
    syncSelectionEmphasis(fc)
  })
}
