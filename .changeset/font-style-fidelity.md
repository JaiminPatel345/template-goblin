---
'template-goblin': patch
---

fix(render): honour fontWeight, fontStyle, textDecoration, and table-cell verticalAlign

The text + table renderers silently dropped several style flags on
their way into the PDF stream, so the editor's Bold / Italic /
Underline / Strikethrough / Vertical-align toggles never reached
the rendered output even though the preview pipeline calls the
exact same `generatePDF` an SDK consumer would.

**Resolved gaps:**

- **fontWeight + fontStyle in text fields** — `text.ts` called
  `doc.font(style.fontFamily)` directly, ignoring weight + style.
  Now resolves the (family, weight, style) triple to the matching
  PDFKit standard-font name (Helvetica-BoldOblique, Times-BoldItalic,
  Courier-BoldOblique, …) via the new `resolvePdfFontName` helper.
  Custom-uploaded fonts (registered via `doc.registerFont`) win —
  bold/italic variants of a custom face must come from separately
  uploaded files.
- **fontWeight + fontStyle in table cells + headers** — `loop.ts`
  partially handled bold for body cells (`${family}-Bold` suffix)
  and ignored both flags for headers. Both code paths now use the
  same resolver.
- **textDecoration (underline / line-through) in text fields** —
  `text.ts` did not paint either. A new `paintTextDecoration`
  helper draws the line under or through the painted run for each
  line, tracked across alignment.
- **textDecoration in table headers** — header path only supported
  underline (no line-through). Both decorations now flow.
- **verticalAlign in table cells + headers** — both paths landed
  at `startY + paddingTop`. Now respects 'top' / 'middle' / 'bottom'
  via the new `resolveCellTextY` helper.

**New unit tests:** 17 covering the (family, weight, style)
matrix across Helvetica / Times-Roman / Courier + custom fonts

- unknown-family fallback. 7 covering the cell-vAlign formula.

**New integration test:** `loop.vAlign.test.ts` paints a two-
column table with one font-size-mismatched cell to create vertical
slack inside the row, then asserts the cell text y position
shifts top → middle → bottom in strict order with the expected
delta.

All 459 existing core tests still pass.

End-to-end verified in Chrome: editor canvas + preview PDF
render identically for bold + italic + underline.
