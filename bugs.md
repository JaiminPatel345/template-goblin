## Bugs

- [x] Sidebars are not visible when page added through solid color.
  - **Resolved** in `fcb887a`. `App.tsx` `hasBackground` now returns `true` when `pages[0].backgroundType` is `color` or `image`, not only on the legacy `backgroundDataUrl`.

- [x] **Zoom is not working** — user cannot zoom with scroll wheel or Ctrl+scroll.
  - **Resolved.** Wheel listener restructured via the ref-callback pattern (`setContainerRef` in `CanvasArea.tsx`) so it re-binds when the container remounts after onboarding. Full zoom/pan ruleset per spec 009 REQ-037..043:
    - `Ctrl/Cmd + wheel` → zoom at cursor position; clamped `[0.1, 5]`; step ±0.1
    - Trackpad pinch (`wheel` with `ctrlKey: true`) → same handler
    - Plain `wheel` → vertical scroll; `Shift + wheel` → horizontal scroll
    - `Ctrl/Cmd + 0` → zoom to fit (`uiStore.fitZoom`, wired in `useKeyboard.ts`)
    - `Ctrl/Cmd + 1` → zoom to 100% (recentre viewport)
    - Space + left-drag and middle-click drag still pan (unchanged)

## Canvas Zoom & Pan — Standard Bindings (new ruleset)

Adopted from Figma / Canva / Miro / Photoshop. See spec 009-ui-canvas.md REQ-037..043 and AC-037..043.

| Action            | Keybinding                                     | Notes                                                       |
| ----------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Zoom in/out       | `Ctrl + wheel` (`Cmd + wheel` on macOS)        | Zooms **at cursor position**, not canvas center             |
| Pinch-zoom        | Two-finger pinch on trackpad                   | Emits `wheel` with `ctrlKey: true` — same handler           |
| Vertical scroll   | Plain wheel                                    | Scrolls the canvas container                                |
| Horizontal scroll | `Shift + wheel`                                | Use `deltaY` as the delta                                   |
| Pan (drag canvas) | Hold `Space` + left-drag; OR middle-mouse-drag | Cursor: `grab` on space held, `grabbing` during active drag |
| Zoom to fit       | `Ctrl + 0` (`Cmd + 0`)                         | Fits page in viewport with 16 pt padding                    |
| Zoom to 100%      | `Ctrl + 1` (`Cmd + 1`)                         | Resets to actual size                                       |
| Zoom range        | Clamped `[0.1, 5]`                             | Unchanged                                                   |

## Phase-1 bugs fixed (history)

- [x] BUG-D: Closing page 1 closes all pages. Fix `fcb887a`.
- [x] BUG-E: After close-all, fresh page showed old elements. Fix `fcb887a` (side-effect of BUG-D).
- [x] BUG-F: "Same as previous" was live-inherited. Fix `adecb5a` + `435be01` — snapshot instead of inherit.
- [x] BUG-A: Crash on hydrating pre-Phase-1 localStorage. Fix `d590007` + `d8ef03d`.

## Improvements

- [x] IMP-1 — Rectangle label overhaul. No type badge inside rect; placeholder/jsonKey/static-value is shown; font size max-fits the rectangle.
- [x] IMP-2 — Per-type soft color coding. `packages/ui/src/theme/fieldColors.ts` is the single source; Toolbar and CanvasArea both import.
- [x] IMP-3 — No rect fill when image field has a placeholder. Dynamic placeholder image or static image filename resolves to a `KonvaImage`; coloured rect is skipped, outline-only border retained.
- [x] IMP-4 — No rect fill for static elements. Static fields render content directly (literal string / image / rows); coloured rect omitted, border-only outline preserved.

## Fonts

- [x] Multi-file upload in the Font Manager. Fix `ee44961`. `processFontFiles` validates each file (extension, size, magic bytes, duplicate), surfaces per-file rejection reasons. `<input type="file" multiple>` accepts batches.
