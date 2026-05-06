---
'template-goblin-ui': patch
---

The canvas reflects the right-panel JSON in real time (#79). Pre-fix the
canvas reconciler rendered every field from design-time defaults — it
never consulted `previewJsonText` or the auto-generated example. So
adding rows to the JSON didn't grow the table on the canvas, editing a
text value didn't repaint, and a freshly-added table painted "however
many rows visually fit" instead of the 1 row in JSON. Now editing the
JSON textarea updates the relevant field on the next render frame:
text labels pull from `data.texts[jsonKey]`; tables render
`data.tables[jsonKey]` rows clipped to `min(data length, maxRows,
rows-that-fit-in-the-rect)` per Hard Rule #10. Mid-edit unparseable
JSON keeps the canvas non-blank via a last-good cache.
