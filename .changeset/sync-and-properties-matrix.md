---
'template-goblin-ui': minor
---

Properties panel now matches the field type × mode matrix and stays in sync with the canvas + JSON preview.

- **GH #25 — sync.** The canvas label honours the field's own `style` (font family, size, weight, italic, underline, color, alignment, line-height) so editing any of these in the properties panel re-renders the field on the canvas immediately. The JSON preview now surfaces a dynamic field's `placeholder` as the example value (text string, image filename) so what you see in the panel matches the preview.
- **GH #26 — mode toggle.** Every field's properties panel now starts with a Static / Dynamic toggle. Flipping it migrates the user's content across — `value ↔ placeholder` for text and image, the row array for tables — so nothing is silently lost. Static fields show a literal `Value` input; dynamic fields show `JSON Key` / `Required` / `Placeholder`. Auto-fit font size and Min Font Size are hidden on static text (they only matter for variable-content rows). Image fields, static or dynamic, never show font controls.

Closes #25, closes #26.
