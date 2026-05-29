/**
 * Per-field rotation control (#172).
 *
 * Renders a single "Angle" row in the field properties panel: a numeric
 * input whose value mirrors the field's `rotation` (degrees, around the
 * field centre). Two-way sync with the canvas rotation handle —
 * `wireDragResizeEvents` commits `group.angle` back through
 * `updateField`, so dragging the handle live-updates this input.
 *
 * Schema invariants:
 *  - `null` / `undefined` / `0` all mean "no rotation".
 *  - Writes from this control normalise to `null` when the user types 0
 *    so blank/zero states converge to the sparse representation (avoids
 *    `.tgbl` bloat for fields that never rotated).
 *  - Any number is accepted (Fabric `angle` is unbounded); the input
 *    does not clamp to 0–359.
 */
import type { FieldDefinition } from '@template-goblin/types'
import { NumberInput } from '../NumberInput.js'
import { useTemplateStore } from '../../store/templateStore.js'
import { normaliseAngle } from '../Canvas/rotationGeometry.js'

interface Props {
  field: FieldDefinition
}

export function RotationSection({ field }: Props) {
  const updateField = useTemplateStore((s) => s.updateField)
  const value = field.rotation ?? 0

  function onChange(next: number) {
    // Reduce to [0, 360) on commit so the input value, the canvas
    // angle, Fabric's selection border, and the PDF rotation ALL
    // agree on the same effective angle. Huge inputs (e.g. accidental
    // pastes) lose precision unevenly in different code paths
    // otherwise — see rotationGeometry.ts#normaliseAngle.
    const norm = normaliseAngle(next)
    // Persist `null` for the zero case so we don't bloat templates with
    // `rotation: 0` on every field that never moved off the default.
    updateField(field.id, { rotation: norm === 0 ? null : norm })
  }

  return (
    <div className="tg-panel-section">
      <div className="tg-panel-section-title">Transform</div>
      <div className="tg-form-row">
        <label>Angle (°)</label>
        <NumberInput value={value} step={1} defaultValue={0} onChange={onChange} />
      </div>
    </div>
  )
}
