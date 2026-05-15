# Plan — Issue #41: Smart Alignment Guides (Canva/PowerPoint-style)

Branch: `feature/41-smart-alignment-guides`
Issue: https://github.com/JaiminPatel345/template-goblin/issues/41
Labels: enhancement, v2

## 1. Goal (verbatim from issue)

While a field is being dragged or resized, render transient guide lines
when the active field's edge or centre aligns with:

- Another field's left edge / right edge / horizontal centre → vertical guide.
- Another field's top edge / bottom edge / vertical centre → horizontal guide.
- Page edges + page centre (always-on).
- Equal-spacing hints between three or more fields (Canva-style matching-gap).

Snap behaviour:

- Magnetic snap within ~6 pt; releasing within range commits the snapped coord.
- Holding **Alt** disables smart snapping (fine placement).
- Guides disappear on mouse release.

Out of scope (per issue): smart distribution / tidy commands, multi-page guides,
keyboard nudging integration.

## 2. Research summary (web)

- Fabric.js v6's `initAligningGuidelines` extension exists but is unstable across
  zoom levels and not exported from the npm `fabric` package's public surface in
  v6.0.x. Discussion #10033 + community gists confirm.
- Third-party `fabric-guideline-plugin` exists but its example uses v5 import style
  (`import { fabric } from 'fabric'`); v6 ESM compatibility unverified. Adding a
  dep also requires justification (Hard Rule #6).
- Decision: **custom implementation**, following the algorithm the issue itself
  spells out. Matches Hard Rule #8 (code implements spec), avoids new dep, fits the
  existing wire-pattern conventions of `wireDragResizeEvents.ts`, and stays
  zoom-safe by computing in object-space (per Fabric issue #4042 — same pattern
  `usePageBoundsEnforcement.ts` already uses).

## 3. Architecture

New directory `packages/ui/src/components/Canvas/smartGuides/` (extracted from
the existing `wire*.ts` family so we stay well under the 300-line cap per file,
Hard Rule #11).

```
smartGuides/
├── index.ts             # barrel export
├── wireSmartGuides.ts   # registers fabric event handlers (mouse:down, object:moving, object:scaling, object:modified, mouse:up)
├── candidates.ts        # build static guide-candidate list at mouse:down
├── snap.ts              # pure: pick best edge/center snap for an active rect, apply Alt bypass
├── render.ts            # create/clear transient fabric.Line guides on canvas
├── equalSpacing.ts      # pure: detect equal-gap triples + produce indicator lines
└── constants.ts         # SNAP_DISTANCE_PT, colours, line width
```

### Data flow

```
mouse:down  → build candidate list (cached for the gesture)
              one entry per OTHER field rect with all 6 alignment keys
              + page edges/centre as virtual candidates
              + recompute on every drag start (objects may have moved)

object:moving → 1. compute active rect bbox in object-space
              → 2. if Alt held → just clear guides & return (no snap)
              → 3. find best X-snap candidate within SNAP_DISTANCE_PT
              → 4. find best Y-snap candidate within SNAP_DISTANCE_PT
              → 5. mutate obj.left / obj.top to snap value
              → 6. render matching guide line(s) on canvas
              → 7. run equal-spacing detection; add gap indicators if found

object:scaling → same as object:moving but operates on the changing edge only
                 (the edge being dragged via the resize handle). Other edges
                 not touched.

object:modified, mouse:up → remove all transient guides; clear candidate cache.
```

### Alt-key handling

Fabric's event option object exposes the underlying pointer event as `opt.e`
(MouseEvent), which has `.altKey`. We read this on each `object:moving` tick —
no global window listener needed.

### Guide rendering

Each guide is a `fabric.Line` marked with `__isSmartGuide = true` (new flag in
`fabric.d.ts`). Properties:

- `selectable: false`, `evented: false`, `excludeFromExport: true`
- Stroke: pink `#FF3D7F` for object alignment, cyan `#22D3EE` for page alignment
- `strokeUniform: true` so guides stay 1px regardless of zoom
- `strokeWidth: 1`

Equal-spacing indicators: short serif-bar style (two parallel short ticks
flanking each equal gap), implemented as small `fabric.Line` triples per gap.

Guides are removed in two ways:

1. `removeGuides(fc)` walks `fc.getObjects()` and removes anything with `__isSmartGuide`.
2. Called on every `object:moving` tick before rendering the new frame, plus on
   `mouse:up`, `object:modified`, and selection change.

### Edge cases handled

- **Multi-select** (Fabric ActiveSelection): treat its bounding rect as the
  active rect; candidates exclude every member of the selection.
- **Snapping vs grid snap**: grid snap runs first (registered in
  `wireDragResizeEvents`). Smart-snap then overrides position if a candidate is
  closer than the grid step. Empirically the two interact cleanly because both
  mutate `obj.left/top`.
- **Snap vs page-bounds clamp**: page-bounds clamp runs as a separate
  `object:moving` handler. We register the smart-guide handler AFTER the clamp
  so a snap that would push the object out of bounds is then re-clamped.
  (Order matters; we test this.)
- **Zoom**: snap distance is in **points (canvas object-space)**, not pixels —
  so it stays consistent across zoom. The 6pt constant matches the issue.

## 4. Files touched

| File                                                               | Change                               |
| ------------------------------------------------------------------ | ------------------------------------ |
| `packages/ui/src/components/Canvas/smartGuides/*`                  | NEW (6 files)                        |
| `packages/ui/src/components/Canvas/fabric.d.ts`                    | +1 line `__isSmartGuide?: boolean`   |
| `packages/ui/src/components/Canvas/useFabricCanvas.ts`             | +1 wire call (`wireSmartGuides(fc)`) |
| `packages/ui/src/components/Canvas/__tests__/snap.test.ts`         | NEW (unit)                           |
| `packages/ui/src/components/Canvas/__tests__/candidates.test.ts`   | NEW (unit)                           |
| `packages/ui/src/components/Canvas/__tests__/equalSpacing.test.ts` | NEW (unit)                           |

All new source files target <150 LOC, well under the 300 cap. Pure helpers are
isolated for trivial unit testing (no Fabric instance required).

## 5. Tests (Vitest, unit only)

The pure helpers are easy to test without a Fabric canvas:

1. **snap.ts** — given an active rect and a candidate list, returns the
   best snap target within tolerance, `null` outside, respects Alt bypass.
2. **candidates.ts** — builds 6 entries per non-active rect (left/right/cx/top/
   bottom/cy) + page edges; excludes objects with `__isGrid` / `__isPageBounds` /
   `__isSmartGuide`.
3. **equalSpacing.ts** — detects (A, active, B) gap-match triples within tolerance;
   returns empty for <3 fields.

No e2e Playwright in this PR — the issue is v2-labelled; manual smoke verification
during dev (`pnpm dev`, drag fields around, observe guides). If reviewer asks for
Playwright, add as follow-up.

## 6. Acceptance check against the issue

- [ ] Guides appear while dragging when edges/centres align with another field.
- [ ] Guides appear while resizing (the edge being dragged).
- [ ] Page edges + page centre always-on candidates.
- [ ] Magnetic snap within ~6pt.
- [ ] Alt disables snap.
- [ ] Guides disappear on release.
- [ ] Equal-spacing hint between three fields.
- [ ] Multi-page: guides scoped to current page only (we only see current page
      objects on the canvas — automatic).
- [ ] No regression: grid snap still works; page-bounds clamp still works.

## 7. Risks / open questions

1. **Visual: equal-spacing indicator style.** Canva uses small bracket marks;
   PowerPoint uses arrow-headed double lines. I'll start with bracket marks
   (simpler `fabric.Line` triples). If reviewer wants arrows, swap render.
2. **Multi-select scaling.** Resize semantics with multi-select differ from
   single — for v1 we only run snap on single-target moves/scales. Multi-select
   move still works (uses active selection's bbox); multi-select resize skips
   smart-snap.
3. **Perf on pages with many fields.** Candidate count = 6N + 6 (page). At
   N=200 fields that's ~1200 candidates per move tick. Cheap (~µs of plain
   number comparisons). No need for spatial indexing in v1.

## 8. Commit plan

One logical change. Commit message:
`feat(canvas): smart alignment guides while moving/resizing (#41)`

Changeset will be generated at push time (Hard Rule #12) — minor bump on
`template-goblin-ui` only (UI-only feature).

## 8b. Master-QA fixes (applied before implementation)

1. **No handler-order reliance.** Our `object:moving` handler imports
   `clampToPage` from `usePageBoundsEnforcement` and runs `snap → clamp`
   inline, so we don't depend on registration order with the page-bounds
   effect (which re-attaches on every meta change).
2. **Delta-based snap, not raw `obj.left`.** Compute `bbox = obj.getBoundingRect()`,
   determine `dx`/`dy` from the snap target, then `obj.set({left: obj.left+dx, top: obj.top+dy})`.
   Group origin can differ from bounding-rect left under stroke / child overhang
   (see `__fieldWidth`/`__fieldHeight` comments in `fabric.d.ts`).
3. **Resize-handle aware (DEFERRED to a follow-up).** As shipped,
   `object:scaling` renders guide lines for visual feedback but does NOT
   apply magnetic snap (no mutation of `scaleX`/`scaleY`/`left`/`top`).
   Reason: anchor-dependent scale math on each of the 8 handles is
   intricate, and a wrong snap mid-resize is more disorienting than no
   snap. Plan originally promised it; downgrading to v1 visual-feedback
   only. Track resize-snap as a follow-up issue. The original §8b.3 text
   for `opt.transform.corner` is preserved below for future work:
   `object:scaling` reads `opt.transform.corner`
   (`tl`/`tr`/`bl`/`br`/`ml`/`mr`/`mt`/`mb`) to identify the moving edges, then
   adjusts `scaleX`/`scaleY` (and `left`/`top` for top/left handles) so the
   moving edge lands on the snap target.
4. **Defensive Alt read.** `const alt = (opt.e as MouseEvent | undefined)?.altKey ?? false`.
5. **Local guide tracking.** `wireSmartGuides` keeps a closure-local `Line[]`
   of currently-rendered guides; `clearGuides()` calls `fc.remove(...arr); arr.length=0`.
   No per-tick `getObjects().filter()`.
6. **Zoom-aware tolerance.** `tolerance = clamp(6 / fc.getZoom(), 6, 24)` pt
   so the snap remains reachable at 25%-400% zoom.
7. **Full-canvas guide spans.** Each `fabric.Line` spans the full page rect
   (0..pageW for horizontals, 0..pageH for verticals).
8. **No new spec file.** The issue body is the spec — sufficiently detailed
   and unambiguous after these fixes. Noted in PR body. (Hard Rule #8.)

## 9. Implementation order

1. `constants.ts` + `fabric.d.ts` augment.
2. `candidates.ts` + tests.
3. `snap.ts` + tests.
4. `render.ts` (depends on Fabric; no direct unit tests — exercised via wire).
5. `equalSpacing.ts` + tests.
6. `wireSmartGuides.ts` — assembles everything.
7. Wire into `useFabricCanvas.ts`.
8. Manual smoke via `pnpm dev` + master QA.
