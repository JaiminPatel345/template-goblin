---
'template-goblin': minor
'template-goblin-ui': minor
---

feat(template): page-wide header, footer, and page number (#61)

Templates can now define a page-wide **header** band, **footer** band, and
**page number** that paint on every page (or every page except the first,
via `applyToFirstPage`). Bands accept text and image fields, have their
own padding / background colour / optional divider, and stamp on top of
the body content via a buffered second pass in the PDF renderer so the
final page count is known before they render.

Highlights:

- Manifest gains optional `header`, `footer`, and `pageNumber` blocks.
  Each band carries `enabled`, `style` (height, padding, background,
  divider), `fields`, and `applyToFirstPage`. Page-number config covers
  placement, alignment, colour, numeral style (`arabic`, `roman`,
  `arabic-paren`), font, font size, and `showOnFirstPage`.
- New toolbar **Page Layout** anchored menu with `›` flyouts for
  Header / Footer / Page Number — toggle visibility from the flyout,
  open a per-band settings modal for fine controls.
- Hide-band preserves the band's full style and migrates its fields
  into body with absolute coordinates so the user keeps editing them
  as normal elements. Show-band reclaims body fields whose bounding
  box still sits entirely inside the band's Y-strip (the user never
  moved them out) back into the band with band-local coordinates
  restored — keeps the validator clean on re-show. Fields the user
  explicitly moved out of the strip stay in body.
- JSON Preview surfaces dynamic header/footer field keys in the same
  flat `texts` / `images` / `tables` / `links` buckets the renderer
  reads from, so canvas, JSON, and PDF stay in sync.
- `setPageNumber` and `setPageNumberConfig` atomically enable the
  placement band so turning page numbers on (or switching placement)
  can't land in a state the validator rejects.
- Canvas z-order: band chrome (background, divider, page-number text)
  paints below band field groups; the reconciler counts band visuals
  as ambient so a coloured band background never hides its own fields.
- Defaults driven by QA: dividers default to disabled in both header
  and footer; when the user enables a divider it defaults to `gap: 0`
  (flush against the band edge); `pageNumber.showOnFirstPage` defaults
  to `true` so the page number is visible on a single-page template
  out of the box.
- Renderer adds a band-stamp pass after the body loop using PDFKit's
  `bufferPages` + `bufferedPageRange` + `switchToPage`. New validator
  gates: `FIELD_OVERLAPS_BAND` when a body field intrudes into an
  enabled band's Y-strip, `PAGE_NUMBER_PLACEMENT_INVALID` when the
  chosen placement band isn't enabled, and `INVALID_MANIFEST` when
  a table-type field appears inside a band (text and image only).
  Disabled bands bypass overlap enforcement — they paint nothing at
  PDF time, so body fields living in their former Y-strip are
  legitimate page content.
- Defence-in-depth page-dimension clamp: `setPageSize` and `updatePage`
  floor width/height at 1pt; `validateManifest` rejects non-finite or
  sub-1 page dimensions at PDF generation so a hand-edited `.tgbl` or
  a server endpoint can't crash PDFKit with a negative dimension.

Closes #61.
