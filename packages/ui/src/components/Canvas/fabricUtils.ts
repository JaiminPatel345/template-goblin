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
 *  ITEXT_CHOICE: we use `FabricText` (read-only) rather than `IText` for field
 *  labels because IText fires keyboard events and enters edit mode on double-
 *  click, interfering with the right-panel workflow. Full inline editing via
 *  IText could be added per-field in a future iteration.
 *
 *  ORIGIN: every Group uses `originX: 'left', originY: 'top'` so `group.left`
 *  and `group.top` directly equal the field's `x` and `y` in page pt.
 *
 *  SCALE_RESET: after Fabric drag/resize, the Group accumulates `scaleX` /
 *  `scaleY`. `groupToFieldPatch` reads the true dimensions (width * scale),
 *  resets the scale back to 1, and calls `setCoords()` so Fabric's bounding-
 *  box math stays in sync.
 */

import { Rect, Group, FabricText, FabricImage, Point, Line } from 'fabric'
import type { FabricObject } from 'fabric'
import type { FieldDefinition } from '@template-goblin/types'
import { FIELD_COLORS, SELECTED_STROKE_WIDTH } from '../../theme/fieldColors.js'
import { fieldCanvasLabel } from './fieldLabel.js'
import { shouldRenderFillRect } from './rectFill.js'

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
// Font-size auto-fit helper (REQ-045, AC-045)
// ─────────────────────────────────────────────────────────────────────────────

/** Cached 2D context for text measurement. */
let _measureCtx: CanvasRenderingContext2D | null = null
function getMeasureCtx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (_measureCtx) return _measureCtx
  const cv = document.createElement('canvas')
  _measureCtx = cv.getContext('2d')
  return _measureCtx
}

/**
 * Fit font size to a bounding rect using greedy word-wrap and binary search.
 * Returns a size in the range [8, min(48, rectHeight * 0.8)].
 */
function fitFontSize(
  text: string,
  rectWidth: number,
  rectHeight: number,
  fontFamily: string,
): number {
  if (!text || rectWidth <= 0 || rectHeight <= 0) return 8
  const ctx = getMeasureCtx()
  if (!ctx) return Math.max(8, Math.min(48, Math.floor(rectHeight * 0.4)))

  const upper = Math.max(8, Math.min(48, Math.floor(rectHeight * 0.8)))
  let lo = 8
  let hi = upper
  let best = 8
  const lineHeightFactor = 1.2

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    ctx.font = `${mid}px ${fontFamily}`
    const lines = wrapToLines(ctx, text, rectWidth)
    const totalH = lines.length * mid * lineHeightFactor
    const maxW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0)
    if (maxW <= rectWidth && totalH <= rectHeight) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best
}

function wrapToLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text]
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let current = ''
  for (const w of words) {
    const test = current ? `${current} ${w}` : w
    if (ctx.measureText(test).width <= maxWidth || current === '') {
      current = test
    } else {
      lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines
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
 * Resolve an image asset for a field (placeholder or static).
 * Returns the data URL string if available, or null.
 */
export type ImageResolver = (filename: string) => string | null

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
 *  - `lockRotation: true` (v1 constraint, REQ-013).
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
export function createFieldGroup(field: FieldDefinition, resolveImage: ImageResolver): Group {
  let createdGroup: Group | null = null
  const children = buildGroupChildren(field, resolveImage, (img, phId) => {
    if (!createdGroup) return
    const ph = createdGroup.getObjects().find((c) => c.__fieldId === phId)
    if (ph) createdGroup.remove(ph)
    createdGroup.add(img)
    createdGroup.canvas?.requestRenderAll()
  })

  createdGroup = new Group(children, {
    left: field.x,
    top: field.y,
    width: field.width,
    height: field.height,
    originX: 'left',
    originY: 'top',
    lockRotation: true,
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
export function applyFieldToGroup(
  group: Group,
  field: FieldDefinition,
  resolveImage: ImageResolver,
): void {
  // Remove existing children first (fabric v6: Group#remove)
  const existing = group.getObjects()
  if (existing.length > 0) {
    group.remove(...existing)
  }

  const children = buildGroupChildren(field, resolveImage, (img, phId) => {
    const ph = group.getObjects().find((c) => c.__fieldId === phId)
    if (ph) group.remove(ph)
    group.add(img)
    group.canvas?.requestRenderAll()
  })
  if (children.length > 0) {
    group.add(...children)
  }

  // Update geometry
  group.set({
    left: field.x,
    top: field.y,
    width: field.width,
    height: field.height,
    scaleX: 1,
    scaleY: 1,
  })
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
 * @param group - The Group that fired `object:modified`.
 * @returns Partial<FieldDefinition> with x, y, width, height.
 */
export function groupToFieldPatch(
  group: Group,
  gridSize: number,
  snapToGrid: boolean,
): Pick<FieldDefinition, 'x' | 'y' | 'width' | 'height'> {
  const rawX = group.left ?? 0
  const rawY = group.top ?? 0
  const rawW = (group.width ?? 0) * (group.scaleX ?? 1)
  const rawH = (group.height ?? 0) * (group.scaleY ?? 1)

  const x = snap(rawX, gridSize, snapToGrid)
  const y = snap(rawY, gridSize, snapToGrid)
  const width = Math.max(20, snap(rawW, gridSize, snapToGrid))
  const height = Math.max(20, snap(rawH, gridSize, snapToGrid))

  // Reset scale so Fabric's internal hit-detection and rendering are correct.
  group.set({
    left: x,
    top: y,
    width,
    height,
    scaleX: 1,
    scaleY: 1,
  })
  group.setCoords()

  return { x, y, width, height }
}

// ─────────────────────────────────────────────────────────────────────────────
// Grid line factory (REQ-009, AC-008)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an array of Fabric `Line` objects representing a grid overlay.
 *
 * GRID_CHOICE: Fabric objects (not CSS) so the grid pans and zooms with the
 * viewport transform.  Each line is marked `selectable: false, evented: false,
 * excludeFromExport: true` and carries `__isGrid: true` for easy removal during
 * reconciliation.
 *
 * @param pageWidth  - Width of the page in pt.
 * @param pageHeight - Height of the page in pt.
 * @param gridSize   - Grid cell size in pt (e.g. 5).
 * @returns Array of configured Line objects.
 */
export function buildGridLines(pageWidth: number, pageHeight: number, gridSize: number): Line[] {
  const lines: Line[] = []
  const gridColor = 'rgba(255,255,255,0.08)'
  const strokeW = 0.5

  for (let x = 0; x <= pageWidth; x += gridSize) {
    const l = new Line([x, 0, x, pageHeight], {
      stroke: gridColor,
      strokeWidth: strokeW,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })
    l.__isGrid = true
    lines.push(l)
  }
  for (let y = 0; y <= pageHeight; y += gridSize) {
    const l = new Line([0, y, pageWidth, y], {
      stroke: gridColor,
      strokeWidth: strokeW,
      selectable: false,
      evented: false,
      excludeFromExport: true,
    })
    l.__isGrid = true
    lines.push(l)
  }
  return lines
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

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the child objects for a field Group.
 *
 * Conditional fill (REQ-047, IMP-3 / IMP-4):
 *  - Static fields (any type): fill rect uses `fill: 'transparent'` (keeps
 *    hit-detection via stroke; the selection border is still rendered by Fabric
 *    around the Group's bounding box).
 *  - Image field with a resolved placeholder/static image: fill rect uses
 *    `fill: 'transparent'`; the FabricImage child is added instead.
 *  - All other dynamic fields: fill rect uses the per-type colour token.
 */
export function buildGroupChildren(
  field: FieldDefinition,
  resolveImage: ImageResolver,
  onAsyncUpdate?: (img: FabricImage, placeholderId: string) => void,
): FabricObject[] {
  const colors = FIELD_COLORS[field.type]
  const w = field.width
  const h = field.height

  // Resolve image data URL (for image fields).
  let imageDataUrl: string | null = null
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
    if (filename) {
      imageDataUrl = resolveImage(filename)
    }
  }

  const placeholderResolved = imageDataUrl !== null
  const shouldFill = shouldRenderFillRect(field, { placeholderResolved })

  // 1. Background rect — always present so the Group has a stable bounding box
  //    and hit-testing works (Fabric needs a non-zero area; fill: 'transparent'
  //    still participates in hit-detection unlike fill: null or fill: '').
  const defaultFill = shouldFill ? colors.fill : 'transparent'
  const defaultStroke = colors.stroke
  const defaultStrokeWidth = 1
  const bgRect = new Rect({
    left: 0,
    top: 0,
    width: w,
    height: h,
    fill: defaultFill,
    stroke: defaultStroke,
    strokeWidth: defaultStrokeWidth,
    strokeUniform: true,
    rx: 2,
    ry: 2,
    selectable: false,
    evented: false,
    originX: 'left',
    originY: 'top',
  })
  bgRect.__defaultFill = defaultFill
  bgRect.__defaultStroke = defaultStroke
  bgRect.__defaultStrokeWidth = defaultStrokeWidth

  const children: FabricObject[] = [bgRect]

  // 2. Placeholder / static image (asynchronous — created synchronously using
  //    a dummy element; the caller is responsible for re-rendering after load).
  //    We create a lightweight placeholder if the data URL is available.
  if (placeholderResolved && imageDataUrl) {
    const imgPlaceholder = new Rect({
      left: 0,
      top: 0,
      width: w,
      height: h,
      fill: 'rgba(0,0,0,0.05)',
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top',
    })
    imgPlaceholder.__fieldId = `__img_placeholder_${field.id}`
    children.push(imgPlaceholder)

    loadFabricImage(imageDataUrl, w, h, field.id).then((img) => {
      if (!img) return
      if (onAsyncUpdate) {
        onAsyncUpdate(img, `__img_placeholder_${field.id}`)
      }
    })
  }

  // 3. Auto-fit label (REQ-044, REQ-045) — skipped when an image is rendered.
  if (!placeholderResolved) {
    const label = fieldCanvasLabel(field)
    if (label) {
      const innerPad = 6
      const labelW = Math.max(0, w - innerPad * 2)
      const labelH = Math.max(0, h - innerPad * 2)
      const fontSize = fitFontSize(label, labelW, labelH, 'sans-serif')
      if (fontSize >= 8) {
        const textObj = new FabricText(label, {
          left: innerPad,
          top: innerPad,
          fontSize,
          fontFamily: 'sans-serif',
          fill: colors.text,
          width: labelW,
          textAlign: 'left',
          selectable: false,
          evented: false,
          originX: 'left',
          originY: 'top',
          // Prevent the text from overflowing the bounding rect.
          clipPath: new Rect({
            left: 0,
            top: 0,
            width: labelW,
            height: labelH,
            absolutePositioned: false,
            originX: 'left',
            originY: 'top',
          }),
        })
        children.push(textObj)
      }
    }
  }

  return children
}

/**
 * Load a `FabricImage` from a data URL and configure it to fill the given
 * dimensions.  Returned as a Promise so callers can await and then call
 * `canvas.requestRenderAll()`.
 *
 * This is exported so `applyFieldToGroup` can await it when updating an
 * existing group's image child.
 */
export async function loadFabricImage(
  dataUrl: string,
  width: number,
  height: number,
  fieldId: string,
): Promise<FabricImage> {
  const img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
  img.set({
    left: 0,
    top: 0,
    width,
    height,
    selectable: false,
    evented: false,
    originX: 'left',
    originY: 'top',
    scaleX: 1,
    scaleY: 1,
  })
  img.__fieldId = `__img_${fieldId}`
  return img
}
