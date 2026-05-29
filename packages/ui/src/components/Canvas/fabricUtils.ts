/**
 * fabricUtils.ts — Fabric.js v6 utility helpers for TemplateGoblin.
 *
 * Responsibilities:
 *  - Coordinate-system helpers (`toPagePt` / `fromPagePt`) — currently no-ops
 *    since 1 canvas unit = 1 pt, but the indirection keeps zoom / DPI math
 *    cleanly isolated from the rest of the renderer.
 *  - `createFieldGroup` — build a `fabric.Group` representing one
 *    `FieldDefinition`. Called once per field on first encounter.
 *  - `applyFieldToGroup` — patch an existing Group in-place when the store
 *    fires a field update. No remove+re-add (would break the active selection).
 *  - `groupToFieldPatch` — read back drag/resize results from an
 *    `object:modified` Group and produce a `Partial<FieldDefinition>`.
 *
 * Design decisions documented inline:
 *
 *  GRID_CHOICE: grid lines are rendered as `fabric.Line` objects (non-selectable,
 *  non-evented) so they pan and zoom with the Fabric viewport transform. A CSS
 *  background-image alternative would not move with the viewport.
 *
 *  ITEXT_CHOICE: we use `Textbox` (read-only, auto-wrap) rather than `IText`
 *  for field labels because IText fires keyboard events and enters edit mode
 *  on double-click, interfering with the right-panel workflow. Textbox is
 *  preferred over plain `FabricText` because it wraps to its `width`, which
 *  lets us fit the largest possible font size for the bounding rect (GH #12).
 *  Full inline editing via IText could be added per-field in a future
 *  iteration.
 *
 *  ORIGIN: every Group uses `originX: 'left', originY: 'top'` so `group.left`
 *  and `group.top` directly equal the field's `x` and `y` in page pt.
 *
 *  SCALE_RESET: after Fabric drag/resize, the Group accumulates `scaleX` /
 *  `scaleY`. `groupToFieldPatch` reads the true dimensions (width * scale),
 *  resets the scale back to 1, and calls `setCoords()` so Fabric's bounding-
 *  box math stays in sync.
 */

import { Group, Point, Rect as FabricRect, Pattern } from 'fabric'
import type { FabricObject, FabricImage, Rect } from 'fabric'
import type { FieldDefinition, InputJSON } from '@template-goblin/types'
import { FIELD_COLORS, SELECTED_STROKE_WIDTH } from '../../theme/fieldColors.js'
import { buildGroupChildren, type ImageResolver } from './buildGroupChildren.js'

// Re-export the moved utilities so existing importers keep working without
// having to update their import paths.
export { buildGroupChildren, loadFabricImage, type ImageResolver } from './buildGroupChildren.js'
export { fitFontSize } from './fitFontSize.js'

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate helpers (REQ-036, AC-036)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert a viewport pixel coordinate to page-point coordinates.
 * Currently a no-op: 1 canvas unit = 1 pt.  The indirection exists so future
 * DPI-scaling or unit changes only touch this file.
 */
export function toPagePt(x: number, y: number): Point {
  return new Point(x, y)
}

/**
 * Convert a page-point coordinate to viewport pixel coordinates.
 * Currently a no-op: 1 canvas unit = 1 pt.
 */
export function fromPagePt(x: number, y: number): Point {
  return new Point(x, y)
}

// ─────────────────────────────────────────────────────────────────────────────
// Snap helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Snap a value to the nearest multiple of `gridSize` when `enabled` is true.
 */
export function snap(value: number, gridSize: number, enabled: boolean): number {
  if (!enabled || gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

// ─────────────────────────────────────────────────────────────────────────────
// createFieldGroup (REQ-048)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Swap a field group's placeholder rect (and any stale prior image) for the
 * freshly-loaded `FabricImage`. Shared between `createFieldGroup` and
 * `applyFieldToGroup` async-load callbacks (GH #54 — without the reset-add-
 * restore dance below, `Group#add` translates the image's declared local
 * coords by `(-group.left, -group.top)` and images snap to the page's upper-
 * left after switching pages and returning). The stale strip prevents a
 * reconcile re-fire from stacking duplicate FabricImages on the group.
 */
function swapPlaceholderForImage(
  group: Group,
  img: FabricImage,
  placeholderId: string,
  fieldId: string,
): void {
  const stale = group
    .getObjects()
    .filter(
      (c) =>
        c.__fieldId === placeholderId ||
        (typeof c.__fieldId === 'string' && c.__fieldId === `__img_${fieldId}`),
    )
  if (stale.length > 0) group.remove(...stale)

  const restoreLeft = group.left ?? 0
  const restoreTop = group.top ?? 0
  group.set({ left: 0, top: 0 })
  group.add(img)
  group.set({ left: restoreLeft, top: restoreTop })
  group.setCoords()
  group.canvas?.requestRenderAll()
}

/**
 * Build a `fabric.Group` representing a single `FieldDefinition`.
 *
 * Children:
 *  1. `fabric.Rect` — background fill / border (conditional per REQ-047).
 *  2. `fabric.FabricImage` — image asset when resolvable (REQ-047).
 *  3. `fabric.FabricText` — auto-fit label (REQ-044, REQ-045).
 *
 * Group config (REQ-048):
 *  - `originX: 'left', originY: 'top'` so `left`/`top` = field `x`/`y`.
 *  - Rotation handle is exposed (#172); the rotation handle uses Fabric's
 *    `centeredRotation` default — rotates around the field's centre. The
 *    stored value lives on `field.rotation` (degrees, null/0/undefined =
 *    no rotation).
 *  - `lockScalingFlip: true` (REQ-011).
 *  - `selectable: true`, `hasControls: true`, `hasBorders: true`.
 *  - `subTargetCheck: false` (children must not receive individual events —
 *    the Group is the single interaction target per REQ-048).
 *  - `preserveObjectStacking` is set at the canvas level, not the Group.
 *  - `__fieldId` and `__fieldType` tie back to the store (REQ-048).
 *
 * @param field - The FieldDefinition to represent.
 * @param resolveImage - Resolver function; returns data URL or null.
 * @returns A configured fabric.Group (synchronous; image loading is async,
 *          caller should call `applyFieldToGroup` after the image loads to
 *          update the child if needed).
 */
export function createFieldGroup(
  field: FieldDefinition,
  resolveImage: ImageResolver,
  data: InputJSON | null = null,
): Group {
  let createdGroup: Group | null = null
  const children = buildGroupChildren(
    field,
    resolveImage,
    (img, phId) => {
      if (!createdGroup) return
      swapPlaceholderForImage(createdGroup, img, phId, field.id)
    },
    data,
  )

  createdGroup = new Group(children, {
    left: field.x,
    top: field.y,
    width: field.width,
    height: field.height,
    angle: field.rotation ?? 0,
    originX: 'left',
    originY: 'top',
    centeredRotation: true,
    lockScalingFlip: true,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    subTargetCheck: false,
    evented: true,
  })

  createdGroup.__fieldId = field.id
  createdGroup.__fieldType = field.type

  return createdGroup
}

// ─────────────────────────────────────────────────────────────────────────────
// applyFieldToGroup (REQ-050)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patch an existing Group to reflect updated `FieldDefinition` properties.
 * Called during store→canvas reconciliation when a field was updated but not
 * removed.  Mutates in-place (no remove+add) so active selections are preserved.
 *
 * Strategy: rebuild children and replace the Group's internal `_objects` list.
 * This is simpler than diffing individual children and keeps the logic
 * consistent with `createFieldGroup`.
 */
/**
 * Render-relevant fingerprint for a field — everything that affects how the
 * Group's CHILDREN look (size, type, style, source). Excludes `x` / `y`
 * because pure-position changes only translate the Group and never require a
 * child rebuild. Stashed on the group as `__fieldHash`; if the next call's
 * hash matches we short-circuit the expensive rebuild and just move the
 * group, which avoids the white-flash users saw on every drag/release where
 * the image placeholder briefly replaced the loaded bitmap.
 *
 * For image fields we also fold in whether the placeholder bitmap has
 * resolved yet — `usePlaceholderImages` loads bitmaps async, so the very
 * first reconcile sees `resolveImage(filename) === null` and renders the
 * filename as a text label. Without this bit, the next reconcile (after
 * the bitmap finishes loading) would short-circuit and keep showing text.
 */
function fieldRenderHash(
  field: FieldDefinition,
  resolveImage: ImageResolver,
  data: InputJSON | null,
): string {
  let imageResolved = false
  if (field.type === 'image' && field.source) {
    let filename: string | null = null
    if (field.source.mode === 'dynamic') {
      const ph = field.source.placeholder as unknown
      if (ph && typeof ph === 'object' && 'filename' in ph) {
        const name = (ph as { filename: unknown }).filename
        if (typeof name === 'string' && name.length > 0) filename = name
      }
    } else {
      const v = field.source.value as unknown
      if (v && typeof v === 'object' && 'filename' in v) {
        const name = (v as { filename: unknown }).filename
        if (typeof name === 'string' && name.length > 0) filename = name
      }
    }
    if (filename) imageResolved = resolveImage(filename) !== null
  }
  // GH #79: include the slice of data the field actually consumes so that
  // editing the right-panel JSON triggers a child rebuild on the next
  // reconcile. Folding the WHOLE InputJSON in would invalidate every field
  // on every keystroke, so we only stash the relevant text value or the
  // table row count + first row.
  let dataSlice: unknown = null
  if (data && field.source?.mode === 'dynamic') {
    if (field.type === 'text') {
      dataSlice = data.texts?.[field.source.jsonKey] ?? null
    } else if (field.type === 'table') {
      const rows = data.tables?.[field.source.jsonKey]
      if (Array.isArray(rows)) dataSlice = { n: rows.length, head: rows[0] ?? null }
    } else if (field.type === 'image') {
      // GH #81 — surface the dynamic colour-marker string in the hash so
      // typing `<STATICIMAGE_COLOR_#hex>` into the right-panel JSON
      // triggers a child rebuild and repaints the rect.
      const supplied = data.images?.[field.source.jsonKey]
      if (typeof supplied === 'string') dataSlice = supplied
    }
  }
  return JSON.stringify({
    t: field.type,
    w: field.width,
    h: field.height,
    s: field.style,
    src: field.source,
    imgR: imageResolved,
    d: dataSlice,
  })
}

export function applyFieldToGroup(
  group: Group,
  field: FieldDefinition,
  resolveImage: ImageResolver,
  data: InputJSON | null = null,
): void {
  // Pure-position fast path — the visual content didn't change, only x/y.
  // Skip the children rebuild (which on image fields would briefly drop
  // back to the alpha-0.05 placeholder rect while the bitmap re-decodes,
  // visible as a "white flash" on mouseup of every drag).
  const newHash = fieldRenderHash(field, resolveImage, data)
  if (group.__fieldHash === newHash && group.getObjects().length > 0) {
    group.set({
      left: field.x,
      top: field.y,
      angle: field.rotation ?? 0,
      scaleX: 1,
      scaleY: 1,
    })
    group.__fieldWidth = field.width
    group.__fieldHeight = field.height
    group.setCoords()
    return
  }

  // (A geometry-only in-place fast path was tried here but Fabric Group's
  // child positioning under a partially-applied set() left the bgRect
  // off-anchor — so resize falls through to the full rebuild below.)

  // Critical: Fabric's Group#add path runs `enterGroup(obj, true)` which
  // translates the new child's coords from world → group-local using the
  // group's current transform. The Group CONSTRUCTOR uses
  // `enterGroup(obj, false)` — children pass through with their declared
  // group-local coords. To keep `buildGroupChildren`'s coordinates valid
  // for both code paths, we move the group to the origin (transform =
  // identity) BEFORE re-adding children — the auto-translate becomes a
  // no-op and children land where their (left, top) say they should.
  // After the rebuild we restore the group to its real position.
  // Also zero the angle during the rebuild so child enterGroup translation
  // happens against an identity transform; the real angle is restored
  // below once the children are in place.
  group.set({
    left: 0,
    top: 0,
    angle: 0,
    width: field.width,
    height: field.height,
    scaleX: 1,
    scaleY: 1,
  })

  // Remove existing children (fabric v6: Group#remove)
  const existing = group.getObjects()
  if (existing.length > 0) {
    group.remove(...existing)
  }

  const children = buildGroupChildren(
    field,
    resolveImage,
    (img, phId) => {
      swapPlaceholderForImage(group, img, phId, field.id)
    },
    data,
  )
  if (children.length > 0) {
    group.add(...children)
  }

  // Restore the group to its real position now that children are in place.
  group.set({
    left: field.x,
    top: field.y,
    angle: field.rotation ?? 0,
    width: field.width,
    height: field.height,
    scaleX: 1,
    scaleY: 1,
  })
  // Stash the intended rect dimensions on the group so `groupToFieldPatch`
  // can recover them on drag-only events. `Group#width` is recalculated by
  // Fabric to include child bounding-box overhang and can't be trusted.
  group.__fieldWidth = field.width
  group.__fieldHeight = field.height
  group.__fieldHash = newHash
  group.setCoords()
  group.__fieldType = field.type

  // Re-apply current selection visuals — children were just rebuilt so the
  // bgRect is back to defaults; if the group is still part of the canvas's
  // active selection we need to restore the emphasis.
  const canvas = group.canvas
  if (canvas) {
    const active = canvas.getActiveObjects().some((o) => o.__fieldId === field.id)
    applySelectionVisuals(group, active)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection visual emphasis (GH #10)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Toggle the visual emphasis on a field Group to reflect selection state.
 *
 * Design: a subtle default fill/stroke makes unselected fields easy to skim
 * past; when the user clicks or drag-selects a field Fabric's corner handles
 * alone are too small to register at a glance. We darken the bgRect fill to
 * `selectedFill` (same hue, higher alpha) and widen the stroke to
 * `SELECTED_STROKE_WIDTH` in `selectedStroke`. Fields with a transparent
 * default fill (static / image-with-placeholder fields per REQ-047) get
 * stroke-only emphasis so we don't paint over a rendered image.
 *
 * @param group - The field Group to update.
 * @param selected - True if the group is (or is part of) the active selection.
 */
export function applySelectionVisuals(group: Group, selected: boolean): void {
  const bgRect = group.getObjects()[0] as Rect | undefined
  if (!bgRect) return
  const fieldType = group.__fieldType
  if (!fieldType || !(fieldType in FIELD_COLORS)) return
  const tokens = FIELD_COLORS[fieldType as keyof typeof FIELD_COLORS]

  const defaultFill = bgRect.__defaultFill ?? tokens.fill
  const defaultStroke = bgRect.__defaultStroke ?? tokens.stroke
  const defaultStrokeWidth = bgRect.__defaultStrokeWidth ?? 1

  if (selected) {
    // Transparent-default fields keep a transparent fill on selection so a
    // rendered image / placeholder isn't painted over — stroke alone signals.
    const nextFill = defaultFill === 'transparent' ? 'transparent' : tokens.selectedFill
    bgRect.set({
      fill: nextFill,
      stroke: tokens.selectedStroke,
      strokeWidth: SELECTED_STROKE_WIDTH,
    })
  } else {
    bgRect.set({
      fill: defaultFill,
      stroke: defaultStroke,
      strokeWidth: defaultStrokeWidth,
    })
  }
  // Fabric v6 caches Group renders; mutating a child's fill/stroke does NOT
  // invalidate the parent cache on its own, so the viewport stays stale
  // until the group is marked dirty.
  bgRect.set('dirty', true)
  group.set('dirty', true)
}

/**
 * Refresh every field Group on the canvas so its visuals reflect the current
 * Fabric active-object set. Call from `selection:created` / `selection:updated`
 * / `selection:cleared` handlers. Cheap: iterates top-level objects once.
 */
export function syncSelectionEmphasis(canvas: {
  getObjects: () => FabricObject[]
  getActiveObjects: () => FabricObject[]
  requestRenderAll: () => void
}): void {
  const activeIds = new Set(
    canvas
      .getActiveObjects()
      .map((o) => o.__fieldId)
      .filter((id): id is string => !!id),
  )
  for (const obj of canvas.getObjects()) {
    if (!obj.__fieldId || obj.__isGrid) continue
    applySelectionVisuals(obj as Group, activeIds.has(obj.__fieldId))
  }
  canvas.requestRenderAll()
}

// ─────────────────────────────────────────────────────────────────────────────
// groupToFieldPatch (REQ-051)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read back geometry from a modified Group and produce a patch suitable for
 * `templateStore.updateField`.
 *
 * After Fabric drag/resize the Group accumulates `scaleX`/`scaleY` != 1.
 * We multiply to get the true dimensions, reset scale to 1, and call
 * `setCoords()` so Fabric's bounding-box math stays in sync (REQ-051).
 *
 * #172 — also captures `group.angle` so canvas rotation flows back into
 * `field.rotation`. Returns `0` when the group isn't rotated so the
 * sidebar input always sees a concrete number to display.
 *
 * @param group - The Group that fired `object:modified`.
 * @returns Partial<FieldDefinition> with x, y, width, height, rotation.
 */
export function groupToFieldPatch(
  group: Group,
  gridSize: number,
  snapToGrid: boolean,
): Pick<FieldDefinition, 'x' | 'y' | 'width' | 'height' | 'rotation'> {
  const rawX = group.left ?? 0
  const rawY = group.top ?? 0
  const sx = group.scaleX ?? 1
  const sy = group.scaleY ?? 1
  // On a pure drag (no resize handle interaction) `scaleX/Y` stays at 1 and
  // Fabric's `width` getter returns the child-bounding-box width, NOT the
  // rect's intended width. Trust `__fieldWidth` — set by `applyFieldToGroup` —
  // when scale is 1; otherwise the user actually dragged a corner and we
  // multiply width by the scale to capture the new rect size.
  // Always prefer the stashed `__fieldWidth` over Fabric's child-overhang-
  // inclusive `Group#width` getter so neither drag (scale=1) nor resize
  // (scale≠1) inflates the rect.
  const baseW = group.__fieldWidth ?? group.width ?? 0
  const baseH = group.__fieldHeight ?? group.height ?? 0
  const rawW = baseW * sx
  const rawH = baseH * sy

  const x = snap(rawX, gridSize, snapToGrid)
  const y = snap(rawY, gridSize, snapToGrid)
  const width = Math.max(20, snap(rawW, gridSize, snapToGrid))
  const height = Math.max(20, snap(rawH, gridSize, snapToGrid))
  // #172 — read group.angle. Fabric's rotation handle leaves x/y at the
  // group's pre-rotation position because we set `centeredRotation: true`
  // in `createFieldGroup`, so the schema invariant (x/y/width/height
  // describe the UNROTATED rect) holds without any extra correction.
  const rotation = group.angle ?? 0

  // Update the group's logical position only. Deliberately DO NOT reset
  // scaleX/Y here even on a resize — the children were rendered stretched
  // by the group scale during the drag, and resetting scale before
  // `applyFieldToGroup` rebuilds them at the new size leaves a one-frame
  // gap where children are smaller than the group (visible as a "white
  // flash" on mouseup). Letting the scale linger means the in-between
  // frame keeps showing the stretched children that filled the group;
  // `applyFieldToGroup` will reset scale + rebuild atomically next tick.
  group.set({ left: x, top: y })
  group.__fieldWidth = width
  group.__fieldHeight = height
  group.setCoords()

  return { x, y, width, height, rotation }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid line factory (REQ-009, AC-008)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a single Fabric Rect filled with a tiled grid Pattern.
 *
 * QA BUG-03: the old implementation built one Line object per grid step
 * — at gridSize=5 on an A4 page that's ~289 objects. Every React state
 * change re-renders Fabric, which re-draws every object synchronously,
 * blocking the main thread for tens of seconds. Replacing them with a
 * single Rect filled with a `Pattern` (a 5×5 tile drawn once on an
 * HTMLCanvas and repeated by the browser's native pattern engine)
 * collapses 289 objects to 1 with no visual change.
 *
 * Still flagged `selectable: false, evented: false, excludeFromExport:
 * true` and carries `__isGrid: true` for reconciliation.
 */
export function buildGridLines(
  pageWidth: number,
  pageHeight: number,
  gridSize: number,
): FabricObject[] {
  // Build the repeating tile on an offscreen HTMLCanvas. Drawing on the
  // tile's outer edges (0.25 px offset) gives crisp 0.5 px lines.
  const tile = document.createElement('canvas')
  tile.width = gridSize
  tile.height = gridSize
  const ctx = tile.getContext('2d')
  if (ctx) {
    ctx.strokeStyle = 'rgba(0,0,0,0.14)'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0.25, 0)
    ctx.lineTo(0.25, gridSize)
    ctx.moveTo(0, 0.25)
    ctx.lineTo(gridSize, 0.25)
    ctx.stroke()
  }
  const rect = new FabricRect({
    left: 0,
    top: 0,
    width: pageWidth,
    height: pageHeight,
    fill: new Pattern({ source: tile, repeat: 'repeat' }),
    selectable: false,
    evented: false,
    excludeFromExport: true,
    objectCaching: false,
    hoverCursor: 'default',
  })
  rect.__isGrid = true
  return [rect]
}

// ─────────────────────────────────────────────────────────────────────────────
// centreViewport helper (REQ-036, AC-036, AC-041)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the `viewportTransform` that centres the page within the canvas
 * element at the given zoom level.
 *
 * The returned 6-element matrix [zoom, 0, 0, zoom, tx, ty] satisfies:
 *   leftMargin  = tx              (pixels from canvas-left to page-left)
 *   rightMargin = canvasPxW - (pageW * zoom + tx)
 *   |leftMargin - rightMargin| < ε
 *
 * @param zoom        - Current zoom level (1.0 = 100 %).
 * @param pageWidth   - Page width in pt.
 * @param pageHeight  - Page height in pt.
 * @param canvasPxW   - Canvas element width in CSS pixels.
 * @param canvasPxH   - Canvas element height in CSS pixels.
 * @returns 6-element affine transform array.
 */
export function centreViewport(
  zoom: number,
  pageWidth: number,
  pageHeight: number,
  canvasPxW: number,
  canvasPxH: number,
): [number, number, number, number, number, number] {
  const tx = (canvasPxW - pageWidth * zoom) / 2
  const ty = (canvasPxH - pageHeight * zoom) / 2
  return [zoom, 0, 0, zoom, tx, ty]
}

/**
 * Compute the zoom level that fits the page inside the canvas element with
 * `padding` px on each side.  Clamped to [0.1, 5].
 *
 * @param pageWidth   - Page width in pt.
 * @param pageHeight  - Page height in pt.
 * @param canvasPxW   - Canvas element width in CSS pixels.
 * @param canvasPxH   - Canvas element height in CSS pixels.
 * @param padding     - Minimum padding on each side (default: 16).
 */
export function fitZoomLevel(
  pageWidth: number,
  pageHeight: number,
  canvasPxW: number,
  canvasPxH: number,
  padding = 16,
): number {
  if (pageWidth <= 0 || pageHeight <= 0 || canvasPxW <= 0 || canvasPxH <= 0) return 1
  const fx = (canvasPxW - 2 * padding) / pageWidth
  const fy = (canvasPxH - 2 * padding) / pageHeight
  return Math.max(0.1, Math.min(5, Math.min(fx, fy)))
}
