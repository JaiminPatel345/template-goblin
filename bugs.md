## Bugs

- [x] Sidebars are not visible when page add though solid color.
  - **Resolved** in commit `fcb887a` — `App.tsx` `hasBackground` now returns `true` when `pages[0].backgroundType` is `color` or `image`, not only on the legacy `backgroundDataUrl`. Side panels are visible after solid-color onboarding.
  - **QA follow-up:** Vitest case asserting `hasBackground` with `backgroundDataUrl=null` and a color `pages[0]`.

- [ ] **Zoom is not working** — user cannot zoom with scroll wheel or Ctrl+scroll.
  - **Repro:** launch app → complete onboarding (image or solid color) → move cursor over canvas → scroll wheel or Ctrl+scroll. Observed: nothing happens. Expected: zoom in/out.
  - **Root cause (reviewer analysis):** `CanvasArea.tsx:518-534` attaches the wheel listener in a `useEffect(..., [])` with empty deps. At mount time `containerRef.current` points to the onboarding picker's div (which unmounts when onboarding completes). When the canvas container mounts, the effect never re-runs, so the wheel listener is orphaned on a detached node. Result: no zoom on the live canvas element.
  - **Extra symptoms:** same pattern means spacebar listener works (it's on `window`, not on the container), but any future container-scoped listeners will have the same bug.
  - **Severity:** blocker for canvas UX.
  - **Dev work order:** implement the new zoom/pan rule set below (see "Canvas Zoom & Pan — Standard Bindings") and restructure the listener attachment so it works across container remounts. Preferred approach: attach the wheel listener via a React `ref callback` (`ref={setContainer}` where `setContainer` installs/removes the listener on each ref attach), NOT a bare `useRef` + `useEffect([])`. See §9.x of spec 009 for full requirements.
  - **QA work order:** write failing Vitest / Playwright tests that cover each bullet of the new rule set (zoom at cursor, zoom to fit, zoom to 100%, plain wheel = vertical scroll, Shift+wheel = horizontal scroll, pinch-zoom, Space+drag pan, middle-drag pan).

## Canvas Zoom & Pan — Standard Bindings (new ruleset)

Adopted from Figma / Canva / Miro / Photoshop conventions. See spec 009-ui-canvas.md for full REQ/AC.

| Action            | Keybinding                                     | Notes                                                               |
| ----------------- | ---------------------------------------------- | ------------------------------------------------------------------- |
| Zoom in/out       | `Ctrl + wheel` (`Cmd + wheel` on macOS)        | Zooms **at cursor position**, not canvas center                     |
| Pinch-zoom        | Two-finger pinch on trackpad                   | Trackpads emit `wheel` with `ctrlKey: true` — same handler as above |
| Vertical scroll   | Plain wheel                                    | The container scrolls vertically                                    |
| Horizontal scroll | `Shift + wheel`                                | Use `deltaX` / `deltaY` swap                                        |
| Pan (drag canvas) | Hold `Space` + left-drag; OR middle-mouse-drag | Cursor: `grab` on space held, `grabbing` during active drag         |
| Zoom to fit       | `Ctrl + 0` (`Cmd + 0`)                         | Scales so the full page fits the visible area with padding          |
| Zoom to 100%      | `Ctrl + 1` (`Cmd + 1`)                         | Resets to actual size                                               |
| Zoom range        | Clamped `[0.1, 5]`                             | Same as today                                                       |

### Implementation notes for Dev

- Use a **ref-callback** pattern for the wheel listener so it re-attaches when the container remounts:
  ```ts
  const setContainerRef = useCallback(
    (el: HTMLDivElement | null) => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('wheel', onWheel)
      }
      containerRef.current = el
      if (el) {
        el.addEventListener('wheel', onWheel, { passive: false })
      }
    },
    [onWheel],
  )
  ```
- Modifier check: `e.ctrlKey || e.metaKey` → zoom branch; `e.shiftKey` → horizontal scroll; else → vertical scroll (let default through **only** if we explicitly want default; otherwise we implement scroll ourselves to keep control over bounds).
- Zoom-at-cursor: compute the pointer position in canvas coordinates before zoom change, then after updating zoom, adjust `scrollLeft` / `scrollTop` so the same canvas point stays under the cursor. Formula:
  ```
  const rect = container.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  const scale = newZoom / oldZoom
  container.scrollLeft = (container.scrollLeft + cx) * scale - cx
  container.scrollTop  = (container.scrollTop  + cy) * scale - cy
  ```
- `Ctrl+0` / `Ctrl+1` handlers live in the global keyboard hook (`useKeyboard.ts`) and call `uiStore.setZoom` / a new `fitZoom` helper.

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
