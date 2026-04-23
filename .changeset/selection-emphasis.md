---
'template-goblin-ui': minor
---

Selected fields now show unmistakable visual feedback in both the canvas and the toolbar. On the canvas the field's background rect darkens (or the stroke widens for transparent-fill fields like static / image-with-placeholder) and switches to the per-type accent. In the toolbar, the Text / Image / Table button for the selected field's type flips to its full active state (solid accent background, white text) — identical weight to the drawing-tool-active state — so you can always see which field type is in play. Multi-type selection lights up multiple buttons simultaneously. Closes #10.
