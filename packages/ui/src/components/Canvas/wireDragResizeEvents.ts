/**
 * wireDragResizeEvents — Fabric `object:modified` / `object:moving` handlers
 * that commit drag/resize results back to the template store and apply
 * grid-snap during a drag (REQ-008, REQ-012, REQ-013, REQ-051). Extracted
 * from `useFabricCanvas.ts` to keep that file under the 300 LOC cap (Hard
 * Rule #11).
 *
 * GH #91 — the pre-#73 "auto-fit fontSize back to the store on resize"
 * behaviour for static text was removed. The user's preference: "max-fit
 * do not change static element". Every text field now renders at its
 * authored `fontSize` and overflow is handled by the field's
 * `overflowMode` (truncate / dynamic_font), not by mutating `fontSize`.
 */
import type { Canvas as FabricCanvas, Group as FabricGroup } from 'fabric'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { groupToFieldPatch, snap } from './fabricUtils.js'

/** Wire drag/resize commit + grid-snap on the given Fabric canvas. */
export function wireDragResizeEvents(fc: FabricCanvas) {
  fc.on('object:modified', (opt) => {
    const g = opt.target
    if (!g?.__fieldId) return
    const { showGrid: sg, gridSize: gs } = useUiStore.getState()
    const patch = groupToFieldPatch(g as FabricGroup, gs, sg)
    const store = useTemplateStore.getState()
    store.moveField(g.__fieldId, patch.x, patch.y)
    store.resizeField(g.__fieldId, patch.width, patch.height)
  })

  fc.on('object:moving', (opt) => {
    const obj = opt.target
    if (!obj) return
    const { showGrid: sg, gridSize: gs } = useUiStore.getState()
    obj.set({
      left: snap(obj.left ?? 0, gs, sg),
      top: snap(obj.top ?? 0, gs, sg),
    })
  })
}
