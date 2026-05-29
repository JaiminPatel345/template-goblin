/**
 * #172 follow-up: centre-pivoted rotation math.
 *
 * Schema invariant — `field.x / field.y / field.width / field.height`
 * describe the UNROTATED rect. `field.rotation` is the visible rotation
 * (degrees, clockwise positive) around the rect's CENTRE.
 *
 * Fabric's Group uses `originX: 'left', originY: 'top'`, so `group.angle`
 * pivots around the group's top-left corner — NOT around the field's
 * unrotated centre. To make Fabric's render agree with the schema
 * (`group.angle = field.rotation`, visible centre = `(field.x + w/2,
 * field.y + h/2)`), `group.left / group.top` must be offset by the same
 * amount Fabric's own `centeredRotation: true` compensates during a
 * rotation-handle drag. Without this offset, sidebar-driven rotation
 * pivots around the top-left and visibly TRANSLATES the rect — the bug
 * reported during #172 manual testing.
 *
 * The geometry helpers below convert in both directions so the
 * schema's "unrotated top-left" semantics survive every input surface
 * (sidebar, canvas handle, drag, store hydrate).
 */
export interface RectGeom {
  x: number
  y: number
  width: number
  height: number
  rotation?: number | null
}

/**
 * Reduce any angle (in degrees) to the canonical `[0, 360)` range.
 *
 * `null` / `undefined` / non-finite values collapse to `0`. Beyond
 * making the schema's "any number" rotation behave sanely, this is
 * load-bearing for huge inputs: at e.g. `5.6e15` degrees, the
 * `deg * π / 180` multiplication loses enough precision that
 * `Math.cos / Math.sin` evaluated in two different code paths can
 * diverge by ~0.7% — the visible content and Fabric's selection
 * border end up rotated to slightly different effective angles.
 * Normalising first turns the multiplication into a precise one
 * (value is under 360, so the result fits well within IEEE 754
 * mantissa precision) and the divergence disappears.
 */
export function normaliseAngle(deg: number | null | undefined): number {
  const d = deg ?? 0
  if (!Number.isFinite(d)) return 0
  const m = d % 360
  return m < 0 ? m + 360 : m
}

/**
 * Given the field's unrotated rect + rotation, return the
 * `(left, top)` Fabric needs on the Group so its `angle` pivot
 * pivots around the unrotated centre — i.e. so the visible centre
 * lands at `(x + width/2, y + height/2)` regardless of rotation.
 *
 * When rotation is 0 / null / undefined, returns `(x, y)` unchanged
 * (the no-rotation fast path).
 */
export function centerCompensatedLeftTop(field: RectGeom): { left: number; top: number } {
  const rotation = normaliseAngle(field.rotation)
  if (rotation === 0) return { left: field.x, top: field.y }
  const theta = (rotation * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const halfW = field.width / 2
  const halfH = field.height / 2
  return {
    left: field.x + halfW * (1 - cos) + halfH * sin,
    top: field.y + halfH * (1 - cos) - halfW * sin,
  }
}

/**
 * Inverse of {@link centerCompensatedLeftTop}: given Fabric's compensated
 * `(left, top)` for a rotated rect, return the unrotated rect's
 * top-left so the schema invariant holds when reading group state back
 * after a drag / rotate gesture.
 *
 * When `angle` is 0, returns `(left, top)` unchanged.
 */
export function recoverUnrotatedXY(
  left: number,
  top: number,
  width: number,
  height: number,
  angle: number,
): { x: number; y: number } {
  const rotation = normaliseAngle(angle)
  if (rotation === 0) return { x: left, y: top }
  const theta = (rotation * Math.PI) / 180
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  const halfW = width / 2
  const halfH = height / 2
  return {
    x: left - halfW * (1 - cos) - halfH * sin,
    y: top - halfH * (1 - cos) + halfW * sin,
  }
}
