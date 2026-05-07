---
'template-goblin-ui': patch
---

Default canvas zoom to 100% on canvas mount and on every page switch / page-meta change (#84). Previously the canvas auto-fit-zoomed to the viewport, which caused the displayed zoom indicator to lie about the real paint size and made the +/- controls jump to whatever Fabric was actually rendering at. The reset effect now resizes the canvas synchronously to `meta.width × meta.height` so the indicator and the painted canvas always agree.
