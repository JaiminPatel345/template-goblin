---
'@template-goblin/types': minor
'template-goblin': minor
'template-goblin-ui': minor
---

feat(canvas): rotate any element via sidebar Angle input + canvas handle (#172)

Adds `rotation` to every field type and surfaces it through both an
"Angle (°)" input in the LeftPanel properties editor and Fabric's
selection rotation handle. The two are kept in two-way sync, both
pivot around the field's unrotated centre, and the rotation
round-trips through `.tgbl` save/load and the PDF render path.

Schema (@template-goblin/types)

- `FieldBase.rotation?: number | null` — degrees, around the rect
  centre. `null` / `undefined` / `0` all render unrotated, so
  pre-rotation templates continue to load.

UI (template-goblin-ui)

- LeftPanel "Angle (°)" input; canvas rotation handle exposed on
  every field type (text, image, table).
- Sidebar and canvas-handle inputs both pivot around the unrotated
  centre — no visual translation when angle changes. Schema
  invariant `(x, y) = unrotated top-left` survives every gesture.
- Angles are normalised to `[0, 360)` at every consumer boundary so
  huge inputs (e.g. accidental pastes) don't cause Fabric's
  selection border to drift off the rendered content.
- Bonus fix: clicking a solid-colour image field no longer paints
  its bgRect with the selection emphasis fill — the user's chosen
  colour is preserved, emphasis switches to stroke only.

PDF renderer (template-goblin)

- `renderField` wraps each draw block in `doc.save() / doc.rotate(angle,
{ origin: [cx, cy] }) / doc.restore()` when rotation is non-zero.
  Origin matches the UI's centre-pivot so canvas preview and
  generated PDF agree pixel-for-pixel.

Closes #172. Supersedes #33.
