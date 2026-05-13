---
'@template-goblin/types': minor
'template-goblin': minor
'template-goblin-ui': minor
---

Table styling expansion (#76 and follow-ups):

- **Transparent fills and borders** — `CellStyle.backgroundColor` and `borderColor` now accept `null` as a "transparent" sentinel. Header bg, row bg, cell borders can be opted out in the right panel; the PDFKit renderer and Fabric canvas both skip the corresponding fill/stroke when null.
- **Table-level border** — new optional `TableFieldStyle.tableBorder: { color, width }` paints the outer perimeter independently of per-cell strokes. New tables default to a 1pt black perimeter with cell strokes off. Legacy templates without `tableBorder` keep their row-derived perimeter.
- **Fit to content** — new optional `TableFieldStyle.fitToContent` (default `true`, including for legacy templates) ends the perimeter at the last rendered row instead of stretching to the field rect's full height.
- **Canvas parity** — Fabric preview now paints the outer perimeter using `tableBorder` and respects `fitToContent`, so right-panel edits show live; per-column align overrides are also merged over `rowStyle` so body cells align correctly on canvas.
- **Color picker** — replaced the native `<input type="color">` (which froze the page on some browsers) with an in-page SketchPicker popover via `react-color`.
- **UI polish** — clearer labels (Header Text Color, Header Row Background, Row Text Color, Row Background, Cell Border, Table Border), themed border on the transparent "Clear / Color" toggle, and a collapsible Columns section in the table properties panel.
