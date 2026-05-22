---
'template-goblin-ui': patch
---

fix(ui): shorten 'Next: page size' button so it fits the onboarding card (#114)

The default `max-w-md` onboarding card was narrow enough that the
primary action clipped to "Next: page si..." on first paint. Per
#114's preferred fix, shorten the label to "Next →" in both the
onboarding picker and the symmetric `AddPageDialog` button. The arrow
keeps the call-to-action obvious; the next step's "Choose page size"
heading carries the context.

Verified live in Chrome at localhost:4242: button reads "Next →",
scrollWidth === clientWidth (60px), no clipping. The 4 new Playwright
tests in `e2e/onboarding-next-button.spec.ts` pin the label, measure
scrollWidth ≤ clientWidth at both default and 360px viewports, and
confirm the click still advances to the page-size step.

Related-branch fixes folded in:

- 7 existing specs hard-coded the old label in `hasText:` matchers.
  Updated to `/Next →/`.
- `change-background.spec.ts` still drove a native `<input type="color">`
  that the #121 picker swap removed — switched to the new
  `color-picker-swatch` + `color-picker-hex` testids.
