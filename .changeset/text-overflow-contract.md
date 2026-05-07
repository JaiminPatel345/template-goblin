---
'template-goblin': minor
'template-goblin-ui': minor
---

Unified text-overflow contract — content NEVER crosses its rectangle on
any surface (#91). Pre-fix the canvas could spill, the PDF appended a
`…` ellipsis, and the properties panel had two redundant knobs
("Dynamic Font Size" checkbox + "Overflow Mode" dropdown).

- **Truncate**: cuts characters from the end at a character boundary
  until the visible text fits the rect width. **No ellipsis.**
- **Dynamic Font**: shrinks `fontSize` down to `fontSizeMin`, then
  truncates the rest at a character boundary. No ellipsis.
- **Static text**: truncates unconditionally. The pre-#73 max-fit
  auto-grow for static text is reverted at the user's request.
- **Schema**: `TextFieldStyle.fontSizeDynamic` removed. The single knob
  is `overflowMode`. Default flips to `'truncate'`.
- **UI**: "Dynamic Font Size" checkbox is gone. "Min Font Size" renamed
  to "Minimum Font Size" and shown only when Overflow Mode = Dynamic
  Font.
