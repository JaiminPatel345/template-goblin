---
'template-goblin-ui': minor
---

Change Background button (#58):

- Renamed the toolbar "BG" button to "Change Background" with a tooltip.
- Clicking it now opens the same modal as "+ Add Page" (image / solid
  color / inherit) instead of going straight to a file picker. The
  user can change the current page's background to any of the three
  kinds, not only an image.
- Fixed: changing to a new image now actually updates the canvas. The
  pre-fix path called the legacy `setBackground` action, which writes
  only `backgroundDataUrl` / `backgroundBuffer`; multi-page templates
  read per-page bytes from `pageBackgroundDataUrls`, so the canvas
  silently kept showing the old image. The new handler updates the
  current page entry via `updatePage` + `setPageBackground`.
- In Change Background mode, the size step's "Same as previous"
  radio now reads "Same as Current (W × H pt)" — the radio's value is
  the current page's size in this flow, so "previous" was the wrong
  word. The Add Page flow keeps "Same as previous".
