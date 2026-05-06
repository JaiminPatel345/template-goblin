---
'template-goblin': patch
'template-goblin-ui': patch
---

Tables now always show their full perimeter, even when content overflows
(#65). Pre-fix, when a table's row count exceeded the field rect (or the
last data row would overrun the bottom edge), the rows extending past
the rect got visually clipped along with their per-cell bottom borders,
leaving an open-bottom table. The HTML preview wrapper now has
`overflow: hidden` plus a `border` matching `rowStyle.borderColor` /
`borderWidth`, and the PDFKit core renderer stamps the field-rect
perimeter on top of any rendered rows (and at every page break in
multi-page mode). Top, left, right, and bottom edges of the rect are
guaranteed to render whenever the row border is non-zero.
