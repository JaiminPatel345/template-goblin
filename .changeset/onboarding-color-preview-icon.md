---
'template-goblin-ui': patch
---

fix(ui): onboarding colour preview icon reflects selected colour (#115)

The inner disc of the SVG above "Pick a background color" used to inherit
`var(--text-muted)` via `currentColor` and stayed grey regardless of what
the user typed in the hex field or clicked in the swatch. The disc's
`fill` is now bound to the live colour state, gated on the same
`#RRGGBB` regex the Apply handler uses — partial typing falls back to
the muted theme tint so the icon doesn't flash arbitrary colours
mid-keystroke. Disc enlarged from `r=3` to `r=6` so the preview reads
from across the canvas.

Also fixed two pre-existing regressions in `e2e/onboarding-to-canvas.spec.ts`
uncovered while testing this branch: the spec drove the pre-#61 flow
(click Apply directly after typing the hex) but the UI now has an
intermediate "Next: page size" step, and the `getFabricBgColor` helper
read `fabricCanvas.backgroundColor` which has been empty since the
GH #46 multi-page refactor — it now reads `pages[0].backgroundColor`
from the store with the Fabric property as a fallback.
