---
'template-goblin-ui': minor
---

chore(ui): replace react-color SketchPicker with react-colorful (#121)

`react-color`'s `SketchPicker` used the legacy `defaultProps` API on a
function component, emitting a React-18 deprecation warning every time
the picker opened. It also warm-loaded a heavy palette on first mount
which froze the renderer for ~3-5 seconds.

Swapped for `react-colorful` (5 KB, zero deps, actively maintained,
modern API). Same affordance the user is used to per #121's
"no visual redesign" caveat: Saturation/Value square + Hue slider +
hex text input + the 10-swatch preset grid the SketchPicker carried
(rendered ourselves since react-colorful ships only the picker
primitive).

Verified live in Chrome at localhost:4242: picker opens in **23 ms**
(issue target was <100 ms), zero `defaultProps` warnings across the
full flow, zero other console warnings. Preset swatches, hex input
typing, the parent hex field, and the onboarding preview disc
(GH #115) all stay in sync regardless of which surface the user
edits from. Escape closes the popover without bubbling to the
surrounding modal; outside click closes it.
