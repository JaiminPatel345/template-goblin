---
'template-goblin-ui': minor
---

feat(canvas): auto-shrink static field rect width to fit content

When the user commits a static text or static image field, automatically
shrink its **width** so there's no wasted whitespace beyond the content.
The user-drawn **height** is always preserved — it represents an
intentional layout choice and is never auto-modified.

- Static text: width = measured text width + 16pt internal pad (matches the
  renderer's own innerPad plus a 2pt-per-side safety margin so glyphs never
  clip into truncate-mode).
- Static image: width = `naturalW × currentH / naturalH` so the image fills
  the user's chosen height at its natural aspect ratio.
- Width never grows past what the user drew — if content already fills or
  overflows the rect, the existing overflow-mode (truncate / dynamic font)
  takes over.
- Triggers on draw-to-create commit, right-panel text input blur, and
  right-panel image replacement. Does not fire on resize.
- Holding the Alt-style "don't touch" — out of scope; the user can manually
  resize after the shrink.

Closes #42.
