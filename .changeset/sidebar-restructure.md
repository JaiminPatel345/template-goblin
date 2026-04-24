---
'template-goblin-ui': minor
---

Sidebar layout restructure. The styling / properties editor now lives in the **left** sidebar (it used to be on the right) and the structural tree — field + group list, JSON preview, and PDF size estimate — now lives in the **right** sidebar. Two hamburger buttons in the toolbar (one at each end) fully collapse the matching panel, and the canvas expands to fill any freed width. Selecting a field still auto-opens the panel that contains its properties; the collapse state persists across reloads via the existing `uiStore` persist. Closes #19.
