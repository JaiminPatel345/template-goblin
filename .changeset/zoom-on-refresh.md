---
'template-goblin-ui': patch
---

Fix canvas zoom / scrollbar behaviour on page refresh and persist the user's zoom level across reloads (#84 follow-up).

- Drop the ResizeObserver-driven auto-fit zoom — with #84's "default 100%" rule, the observer's "snap back to fit when current ≤ fit" behaviour was hiding the page's natural overflow on refresh, so scrollbars never appeared even when the page was bigger than the viewport.
- Drop the zoom-sync effect's `fc.getZoom() === store.zoom` early-return — on a fresh refresh both read 1 by default, so the equality skipped the very `setDimensions(meta × 1)` call that gives the canvas its real size. The effect now resyncs `meta × zoom` on every dep change unconditionally.
- Persist `zoom` in `uiStore` and skip the GH #84 reset on the very first valid post-hydration run, so reloading the editor restores the canvas at whatever zoom you were last viewing instead of snapping to 100%.
- Remove `useFabricCanvas`'s post-mount `requestAnimationFrame` block; canvas dimension / zoom is now fully owned by the zoom-sync effect, so there's no second writer to fight the persisted zoom on mount.
