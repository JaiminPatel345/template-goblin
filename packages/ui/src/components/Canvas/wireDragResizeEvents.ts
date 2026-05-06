/**
 * wireDragResizeEvents — Fabric `object:modified` / `object:moving` handlers
 * that commit drag/resize results back to the template store and apply
 * grid-snap during a drag (REQ-008, REQ-012, REQ-013, REQ-051). Extracted
 * from `useFabricCanvas.ts` to keep that file under the 300 LOC cap (Hard
 * Rule #11).
 */
import type { Canvas as FabricCanvas, Group as FabricGroup } from 'fabric'
import type { TextField } from '@template-goblin/types'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { groupToFieldPatch, snap, fitFontSize } from './fabricUtils.js'
import { fieldCanvasLabel } from './fieldLabel.js'

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

    // Sync fitted fontSize back to the store so the sidebar reflects what
    // the user sees on the canvas. Applies ONLY to static text fields with
    // auto-fit on — those are the only fields whose canvas label legitimately
    // auto-grows to a max-fit preview. Dynamic text is WYSIWYG with the
    // authored `fontSize` (GH #73), so the canvas never derives a new size
    // and we must not overwrite the sidebar value behind the user's back.
    const field = store.fields.find((f) => f.id === g.__fieldId)
    if (!field || field.type !== 'text') return
    const tf = field as TextField
    const isStatic = tf.source?.mode === 'static'
    const autoFit = tf.style.fontSizeDynamic === true
    if (!isStatic || !autoFit) return
    const label = fieldCanvasLabel(tf)
    if (!label) return
    const innerPad = 6
    const labelW = Math.max(1, patch.width - innerPad * 2)
    const labelH = Math.max(1, patch.height - innerPad * 2)
    const fitted = fitFontSize(label, labelW, labelH, tf.style.fontFamily || 'sans-serif')
    if (fitted >= 8 && fitted !== tf.style.fontSize) {
      store.updateFieldStyle(g.__fieldId, { fontSize: fitted })
    }
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
