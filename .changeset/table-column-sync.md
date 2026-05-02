---
'template-goblin-ui': minor
---

Table fields now stay in sync with the right-panel properties (#38).
The canvas draws a column grid (one vertical divider per column boundary,
scaled proportionally to declared widths) plus a header band with
per-column labels — adding, editing, removing, or reordering columns
produces visible feedback on the next reconcile. Header style edits in
the properties panel — `fontFamily`, `fontSize`, `fontWeight`,
`fontStyle`, `textDecoration`, `color`, `backgroundColor`, `borderColor`,
`borderWidth`, `align`, `paddingLeft`, `paddingRight` — flow through to
the rendered header band. The JSON preview pane was already reactive;
the canvas catching up closes the sync gap.

Side-panel UX polish: clicking (or tabbing) into any input inside the
properties / structure panels now auto-selects the existing value, so
the next keystroke replaces it instead of appending. Click-and-drag
selections are preserved (only collapsed-caret focuses trigger
select-all).
