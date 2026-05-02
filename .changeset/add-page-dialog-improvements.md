---
'template-goblin-ui': minor
---

Add Page dialog UX (#47):

- "Same as previous page" no longer routes through the size step. The
  new page commits immediately with the previous page's dimensions —
  consistent with what the option's label implies.
- The size picker labels are country-neutral: "US Letter" / "US Legal"
  → "Letter" / "Legal". The underlying `PageSize` keys are unchanged.
- Picking "Custom" no longer grows the dialog. The width/height inputs
  reserve their bounding box at all times (visibility-hidden,
  pointer-events-none, tab-skipped, aria-hidden when not selected) so
  the parent dialog stays anchored. The dialog also carries an explicit
  `minWidth` / `minHeight` so step transitions don't reflow the modal
  either.
- When the user picks Image upload, the size picker now opens with a
  "Match image (W × H pt)" radio at the top, pre-selected with the
  uploaded image's natural pixel dimensions. That's the most sensible
  default for an image-bg page (no scaling, no crop, native aspect
  ratio).
