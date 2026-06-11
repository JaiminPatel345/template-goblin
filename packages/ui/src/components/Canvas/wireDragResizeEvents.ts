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
import type { Canvas as FabricCanvas, FabricObject, Group as FabricGroup } from 'fabric'
import { util as fabricUtil } from 'fabric'
import { useTemplateStore } from '../../store/templateStore.js'
import { useUiStore } from '../../store/uiStore.js'
import { groupToFieldPatch, snap } from './fabricUtils.js'
import { currentPageBandContext } from './bandGeometry.js'
import { normaliseAngle } from './rotationGeometry.js'

type FieldPatch = { x: number; y: number; width: number; height: number; rotation: number }

/** Commit one field group's geometry to the store, routing band fields
 *  back to band-local coordinates. */
function commitFieldPatch(g: FabricObject, patch: FieldPatch): void {
  if (!g.__fieldId) return
  const store = useTemplateStore.getState()

  // #61 — band fields commit to the band's own `fields` array, with
  // coordinates translated back to band-local before storing. The
  // `useBandVisuals` renderer adds bandTop + paddingTop on every paint,
  // so we subtract them here to keep the round-trip lossless.
  if (g.__isBandField && g.__bandKind) {
    const kind = g.__bandKind
    const band = kind === 'header' ? store.header : store.footer
    if (!band) return
    // The footer's top edge depends on the VIEWED page's height (pages
    // can override meta dims) — `meta.height` shifted footer fields by
    // the difference on every drop on custom-height pages.
    const { pageHeight } = currentPageBandContext()
    const bandTop = kind === 'header' ? 0 : pageHeight - band.style.height
    const updater = kind === 'header' ? store.updateHeaderField : store.updateFooterField
    updater(g.__fieldId, {
      ...patch,
      x: patch.x - band.style.paddingLeft,
      y: patch.y - bandTop - band.style.paddingTop,
    })
    return
  }

  // ONE updateField call per gesture — this used to be moveField +
  // resizeField + updateField(rotation), i.e. three history snapshots,
  // so a single Ctrl+Z only un-rotated and the user had to press undo
  // three times to fully revert one drag.
  store.updateField(g.__fieldId, patch)
}

/**
 * Absolute (scene-space) geometry of a member INSIDE an ActiveSelection.
 * Members carry selection-relative left/top, so we decompose the full
 * object→scene transform instead: its translation is the member's
 * CENTRE, which matches the schema's centre-pivot rotation model — the
 * unrotated top-left is just centre minus half the (scaled) size.
 */
function memberPatch(member: FabricObject): FieldPatch {
  const dec = fabricUtil.qrDecompose(member.calcTransformMatrix())
  const baseW = member.__fieldWidth ?? member.width ?? 0
  const baseH = member.__fieldHeight ?? member.height ?? 0
  const width = Math.max(20, baseW * dec.scaleX)
  const height = Math.max(20, baseH * dec.scaleY)
  return {
    x: dec.translateX - width / 2,
    y: dec.translateY - height / 2,
    width,
    height,
    rotation: normaliseAngle(dec.angle),
  }
}

/** Wire drag/resize commit + grid-snap on the given Fabric canvas. */
export function wireDragResizeEvents(fc: FabricCanvas) {
  fc.on('object:modified', (opt) => {
    const g = opt.target
    if (!g) return

    // Multi-selection: Fabric fires ONE `object:modified` whose target is
    // the ActiveSelection (no `__fieldId`); the members never fire their
    // own. Pre-fix the whole gesture was silently dropped — the canvas
    // showed the move, the store kept the old positions, and the fields
    // snapped back on the next reconcile.
    if (!g.__fieldId) {
      const members = (g as FabricGroup).getObjects?.()
      if (!members?.length) return
      for (const member of members) {
        if (!member.__fieldId) continue
        commitFieldPatch(member, memberPatch(member))
      }
      return
    }

    const { showGrid: sg, gridSize: gs } = useUiStore.getState()
    const patch = groupToFieldPatch(g as FabricGroup, gs, sg)
    commitFieldPatch(g, { ...patch, rotation: normaliseAngle(patch.rotation) })
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
    // Normalised so a 0 / 360 / -720 angle (visually identical to 0)
    // doesn't skip the snap.
    const normAngle = (((obj.angle ?? 0) % 360) + 360) % 360
    if (normAngle !== 0) return
    const { showGrid: sg, gridSize: gs } = useUiStore.getState()
    obj.set({
      left: snap(obj.left ?? 0, gs, sg),
      top: snap(obj.top ?? 0, gs, sg),
    })
  })
}
