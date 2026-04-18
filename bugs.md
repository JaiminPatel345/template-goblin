## Bugs

- [x] Sidebars are not visible when page add though solid color.
  - **Resolved** in commit `fcb887a` — `App.tsx` `hasBackground` now returns `true` when `pages[0].backgroundType` is `color` or `image`, not only on the legacy `backgroundDataUrl`. Side panels are visible after solid-color onboarding.
  - **QA follow-up:** Vitest case asserting `hasBackground` with `backgroundDataUrl=null` and a color `pages[0]`.

- [ ] Zoom is not working, change structure of entire multi page.
  - **Status: needs reproduction.** Ctrl+wheel handler, Stage scale, and symmetric overflow all verified in code. QA's Playwright suites (`pan.spec.ts`, `zoom-scroll-bounds.spec.ts`) cover pan + scroll-bounds symmetry and pass.
  - **Dev:** waiting for user to specify which zoom action misbehaves (step-by-step) before touching code.
  - If "change structure of entire multi page" means a UI restructure (e.g. all pages visible stacked vertically with continuous scroll like Figma), that is a Phase 4+ feature — not a bug.

## Phase-1 bugs fixed in this batch (for history)

- [x] BUG-D: Closing page 1 closes all pages (implicit-page-0 delete left an index gap). Fix `fcb887a`.
- [x] BUG-E: After close-all, adding a new page still showed old elements. Fix `fcb887a` (side-effect of BUG-D).
- [x] BUG-F: "Same as previous" live-inherited the current previous page's bg, so deleting a middle page silently changed downstream pages. Fix `adecb5a` + `435be01` — snapshot instead of inherit.
- [x] BUG-A: Runtime crash on hydrating pre-Phase-1 localStorage. Fix via `d590007` (persist v1→v2 migration) + `d8ef03d` (defensive `field.source` guards).

## Improvements (feature tickets — not bugs)

### IMP-1 — Rectangle label overhaul

- Drop the element-type badge from inside rectangles (keep it only in the left-panel list).
- Use placeholder (falling back to jsonKey) as the label text.
- Scale font size to fit the rectangle; binary-search max fit based on box width × rows.
- **Dev:** rework label-rendering branch in `CanvasArea.tsx` around the field Group; delete `TYPE_LABELS` usage inside the stage.
- **QA:** visual or DOM test asserting label text matches placeholder/jsonKey (not type).

### IMP-2 — Per-type soft color coding

- Stable color per field type (text / image / table).
- Same token used in Toolbar buttons AND rectangle fills.
- Low opacity so overlaid text stays readable.
- **Dev:** extract `FIELD_COLORS` into a shared `packages/ui/src/theme/fieldColors.ts`; apply via CSS custom properties in both the Toolbar and CanvasArea.
- **QA:** assert toolbar buttons and canvas rects share the same CSS custom-property value per type.

### IMP-3 — No rect background when image field has a placeholder

- Render the placeholder image directly; skip the fill rect.
- **Dev:** image branch in the Konva render path in `CanvasArea.tsx` — conditional on `source.placeholder.filename` resolving.
- **QA:** component test — image field with placeholder → no fill rect; without → fill rect visible.

### IMP-4 — No rect background for static elements

- Static = baked in, no data contract — rectangle border/selection outline only, no fill.
- **Dev:** condition on `field.source.mode === 'static'` in the fill branch.
- **QA:** cover all three static variants (text, image, table).

## Fonts

- [ ] Multi-file upload in the Font Manager.
  - **Dev:** `FontManager.tsx` — add `multiple` to the file input, iterate `FileList`, `addFont` per entry.
  - **QA:** test uploading two font files in one dialog → two entries in the store.
