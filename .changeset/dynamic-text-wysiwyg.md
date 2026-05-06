---
'template-goblin-ui': patch
---

Dynamic text fields are now WYSIWYG with the PDF (#73). Before, a dynamic
text field with `fontSize: 12` rendered on the canvas at the auto-fit max
size (often well above 12pt) while the sidebar showed 12 and the PDF
printed 12 — three sources of truth, two of them wrong. The canvas and
HTML preview now render dynamic text at the authored `fontSize`, never
auto-growing past it. New fields default to `fontSizeDynamic: false` so
authoring is honest from the first paint; users opt in to runtime
shrinking when they expect overflow on real data. Editing `fontSize`,
`maxRows`, or `lineHeight` from the properties panel no longer silently
resizes the rect for dynamic fields — the author-drawn rectangle is
preserved. Static text keeps the existing auto-fit-to-content behaviour.
