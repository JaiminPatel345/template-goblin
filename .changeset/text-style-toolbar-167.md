---
'@template-goblin/types': minor
'template-goblin': minor
'template-goblin-ui': minor
---

Text styling toolbar and WYSIWYG fixes (#167)

- **UI:** Word/Canva-style floating selection toolbar with B/I/U/S toggles, font
  size, text colour, and text background colour, anchored to the selected text
  field. Added the same B/I/U/S group to the Format ribbon and the right panel.
- **UI:** A rotation control in the selection toolbar — a compact trigger that
  opens a popover with a large draggable angle dial, a numeric input, and
  0/90/180/270 presets. Popovers now portal to `document.body` so they anchor
  on the canvas next to their trigger instead of drifting over the side panel.
- **UI:** Theme toggle button on the navbar; the transparent / no-fill option
  now lives inside the colour picker.
- **Types:** `TextFieldStyle.backgroundColor` for an optional text background.
- **Core:** Render a text field's background colour, clip text to its box, and
  optically centre text (including overflowing text) so the generated PDF
  matches the canvas. Dropped the 6px text inset for true WYSIWYG.
