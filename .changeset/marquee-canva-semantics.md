---
'template-goblin-ui': patch
---

fix(canvas): marquee selection mirrors Canva semantics — fully-contained only, no visual displacement (#109)

Drag-from-empty-area marquee on the editor canvas now matches the
mental model every document tool ships: only fields whose entire
bounding rect lies inside the marquee are selected (partial overlap
is rejected), and fields do not visually displace while or after
the marquee.

The whole fix is one Fabric init flag: `selectionFullyContained:
true` in `useFabricCanvas.ts`. Fabric v6 already handles both
acceptance items behind that flag — selection criterion + the
ActiveSelection coord-system bookkeeping. Verified live in Chrome
via dispatched mouse events: `duringDelta` and `afterDelta` both
empty, only the fully-contained field's id ends up in
`__uiStore.selectedFieldIds`.

Coverage:

- `marqueeContains.ts` exports `rectFullyContains` + `selectFully
ContainedFieldIds` — pure helpers any future custom marquee impl
  (lasso, multi-zone) can reuse.
- 13 vitest cases pin the helper's edge-contact semantics.
- 3 e2e specs drive real `mousedown` / `mousemove` / `mouseup` on
  Fabric's upper-canvas element and assert (a) the flag is live,
  (b) fully-contained fields are selected with no displacement,
  (c) partial-edge straddling rejects the field.

Closes #109.
