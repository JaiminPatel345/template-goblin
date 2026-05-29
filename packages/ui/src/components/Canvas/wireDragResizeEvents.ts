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

    // #61 — band fields commit to the band's own `fields` array, with
    // coordinates translated back to band-local before storing. The
    // `useBandVisuals` renderer adds bandTop + paddingTop on every paint,
    // so we subtract them here to keep the round-trip lossless.
    if (g.__isBandField && g.__bandKind) {
      const kind = g.__bandKind
      const band = kind === 'header' ? store.header : store.footer
      if (!band) return
      const bandTop = kind === 'header' ? 0 : store.meta.height - band.style.height
      const localX = patch.x - band.style.paddingLeft
      const localY = patch.y - bandTop - band.style.paddingTop
      const updater = kind === 'header' ? store.updateHeaderField : store.updateFooterField
      updater(g.__fieldId, {
        x: localX,
        y: localY,
        width: patch.width,
        height: patch.height,
        rotation: patch.rotation,
      })
      return
    }

    store.moveField(g.__fieldId, patch.x, patch.y)
    store.resizeField(g.__fieldId, patch.width, patch.height)
    // #172 — rotation goes through updateField (no dedicated rotateField
    // action; updateField handles the partial cleanly). Fires once per
    // object:modified — Fabric only emits this at the end of a gesture,
    // so calling it on every drag/resize event still produces a single
    // commit per user action.
    store.updateField(g.__fieldId, { rotation: patch.rotation })
  })

  fc.on('object:moving', (opt) => {
    const obj = opt.target
    if (!obj) return
    // #172 — `obj.left/top` on a rotated group is the centre-compensated
    // value (so `group.angle` pivots around the unrotated centre). Grid
    // snap on that value would snap an offset point, NOT the rect's
    // visible edge — disable the snap-while-moving for rotated fields
    // and let the commit-time snap in `groupToFieldPatch` (which works
    // off the recovered unrotated rect) handle it instead.
    if ((obj.angle ?? 0) !== 0) return
    const { showGrid: sg, gridSize: gs } = useUiStore.getState()
    obj.set({
      left: snap(obj.left ?? 0, gs, sg),
      top: snap(obj.top ?? 0, gs, sg),
    })
  })
}
