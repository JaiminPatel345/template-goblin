---
'template-goblin-ui': patch
---

feat(ui): inline validation + disabled Apply on invalid custom page dimensions (#112)

The store-side clamp from #112's prior pass silently floored negative /
zero / non-finite custom dimensions to 1pt — protecting state but leaving
the user with no feedback about why the value they typed was rejected.
This adds the missing UX layer the bug body asked for:

- New `validateCustomDims(width, height)` helper in `PageSizePicker.tsx`
  returns per-field error messages plus a `hasError` convenience flag.
- The shared `PageSizePicker` renders a red inline chip below each input
  ("Width must be at least 1 pt.", "Height must be at least 1 pt.",
  "Width must be a number." for non-finite values) with `aria-invalid`
  and `aria-describedby` on the input for screen-reader users.
- All three primary-action surfaces gate on validation when the picker
  is in `'custom'` mode: `OnboardingPicker` Apply, `AddPageDialog`
  Add Page / Apply, and the toolbar `PageSizeDialog` Apply (which has
  its own non-picker inputs, so it inlines the same chips).
- 10 unit tests on `validateCustomDims` (happy path, sub-1pt, zero,
  fractional, NaN, ±Infinity, single-side, both-side errors).
- 5 Playwright tests on the onboarding flow covering the exact bug
  repro, recovery on correction, zero-equivalence, both-side errors,
  and switching back to a preset clearing the disabled state.
