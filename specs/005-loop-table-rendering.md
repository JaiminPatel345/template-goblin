# Spec 005 — Loop/Table Rendering

## Status

Draft

## Summary

Defines how loop (table) fields are rendered within their bounding rectangles. Covers header row rendering, data row rendering, per-column style overrides, cell borders, cell padding, and per-cell overflow handling. Tables are drawn inside a user-defined rectangle and follow the same text overflow rules as standalone text fields for cell content.

## Requirements

- [ ] REQ-001: Render the header row using `headerStyle` with column labels derived from `columns[].label` (defaulting to `columns[].key` when label is omitted).
- [ ] REQ-002: Render data rows using `rowStyle`, applying optional per-column style overrides for `fontSize`, `fontWeight`, `textDecoration`, `color`, and `align`.
- [ ] REQ-003: Support per-column style overrides that take precedence over `rowStyle` for the properties they define.
- [ ] REQ-004: Draw cell borders when `borderWidth > 0`, using `borderColor` for the stroke colour.
- [ ] REQ-005: Apply cell padding (`paddingTop`, `paddingBottom`, `paddingLeft`, `paddingRight`) to inset content from cell edges.
- [ ] REQ-006: Handle cell content overflow using the same `overflowMode` logic defined in Spec 003 (truncation with ellipsis or dynamic font shrinking), governed by `cellStyle.overflowMode`.

## Behaviour

### Table Layout

The loop field defines a bounding rectangle `{x, y, width, height}`. The table is rendered top-down within this rectangle:

1. **Header row** is rendered first, starting at `(x, y)`.
2. **Data rows** follow immediately below the header.
3. Each column has a defined `width` from the `columns` array. The sum of column widths should not exceed the bounding rect width.
4. Row height is determined by the applicable style's `fontSize`, `lineHeight` (default 1.2 if not specified), and padding: `rowHeight = paddingTop + (fontSize * lineHeight) + paddingBottom`.

### Header Row

- Uses `headerStyle` for all visual properties (font size, weight, colour, background, borders, padding).
- Each cell displays the column's `label` value. If `label` is omitted, the column's `key` is used.
- Header text is rendered within the cell's content area (cell area minus padding).
- The header row background is filled with `headerStyle.backgroundColor`.

### Data Rows

- Uses `rowStyle` as the base style for all cells.
- Per-column overrides (`columns[].style`) selectively replace `rowStyle` properties. Only the overridden properties are replaced; all others fall back to `rowStyle`.
- Overridable properties: `fontSize`, `fontWeight`, `textDecoration`, `color`, `align`.
- Data row background is filled with `rowStyle.backgroundColor`.
- Data values are looked up from the input data array using `columns[].key` as the property accessor.

### Cell Borders

- Borders are drawn around each cell when `borderWidth > 0`.
- Border colour is `borderColor`.
- Borders are drawn on all four sides of each cell.
- Border width is measured inward from the cell edge (does not expand the cell).
- When `borderWidth` is `0` or omitted, no borders are drawn.

### Cell Padding

- Padding insets the content area from the cell edges: `contentWidth = cellWidth - paddingLeft - paddingRight`.
- Content area height: `contentHeight = rowHeight - paddingTop - paddingBottom`.
- Text rendering starts at `(cellX + paddingLeft, cellY + paddingTop)`.

### Cell Overflow

- Each cell behaves like a miniature text field for overflow purposes.
- The effective `maxRows` for a cell is 1 (single-line cells) unless row style specifies otherwise.
- `cellStyle.overflowMode` determines the strategy:
  - `"truncate"`: fixed font size, cut off with `...`.
  - `"dynamic_font"`: shrink font until text fits or minimum reached, then truncate with `...`.
- The overflow logic follows Spec 003 exactly, scoped to the cell's content area.

### Happy Path

1. Engine reads the loop field definition and input data array.
2. Computes column widths and row heights.
3. Renders the header row with `headerStyle`.
4. Iterates over data rows, rendering each with `rowStyle` plus any column overrides.
5. Draws borders and fills backgrounds as configured.
6. Clips all content to the bounding rectangle.

### Edge Cases

- Empty data array: render header row only (if headers are defined).
- Data array has more rows than fit in the bounding rect: rows beyond the boundary are not rendered (unless `multiPage` is true, see Spec 006).
- Column widths sum to less than bounding rect width: remaining space is unused (right side).
- Column widths sum to more than bounding rect width: clip rightmost columns at the boundary edge.
- A data row is missing a key defined in `columns`: render an empty cell.
- `borderWidth` is 0: no borders drawn; padding still applies.

### Error Conditions

- `columns` array is empty: throw `InvalidFieldError`.
- Column `width` is zero or negative: throw `InvalidFieldError`.
- Bounding rect with zero or negative dimensions: throw `InvalidFieldError`.

## Input / Output

```typescript
interface LoopRenderInput {
  data: Record<string, string>[] // array of row data objects
  x: number
  y: number
  width: number
  height: number
  style: {
    maxRows: number
    maxColumns: number
    multiPage: boolean
    headerStyle: CellStyle
    rowStyle: CellStyle
    cellStyle: { overflowMode: 'truncate' | 'dynamic_font' }
    columns: ColumnDef[]
  }
}

interface CellStyle {
  fontSize: number
  fontWeight: 'normal' | 'bold'
  color: string
  backgroundColor: string
  borderWidth: number
  borderColor: string
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
}

interface ColumnDef {
  key: string
  label?: string
  width: number
  style?: {
    fontSize?: number
    fontWeight?: 'normal' | 'bold'
    textDecoration?: 'none' | 'underline' | 'line-through'
    color?: string
    align?: 'left' | 'center' | 'right'
  }
}

interface LoopRenderOutput {
  rowsRendered: number
  rowsRemaining: number // rows that did not fit (relevant for multi-page)
  pagesUsed: number
  boundingRect: { x: number; y: number; width: number; height: number }
}

function renderLoop(input: LoopRenderInput, ctx: PDFContext): LoopRenderOutput
```

## Acceptance Criteria

- [ ] AC-001: The header row renders using `headerStyle` properties (font size, weight, background colour).
- [ ] AC-002: Header cells display `columns[].label` when provided, falling back to `columns[].key`.
- [ ] AC-003: Data rows render using `rowStyle` as the base style.
- [ ] AC-004: A column with a `style` override for `fontWeight: "bold"` renders that column's cells in bold while other columns use `rowStyle.fontWeight`.
- [ ] AC-005: Cell borders are drawn when `borderWidth > 0` and are absent when `borderWidth` is 0.
- [ ] AC-006: Cell content respects padding — text starts at `(cellX + paddingLeft, cellY + paddingTop)`.
- [ ] AC-007: Cell text that exceeds the content area width is truncated with `...` when `overflowMode` is `"truncate"`.
- [ ] AC-008: Cell text that exceeds the content area uses font shrinking when `overflowMode` is `"dynamic_font"`.
- [ ] AC-009: An empty data array renders only the header row.
- [ ] AC-010: Rows that exceed the bounding rect height are not rendered (clipped).
- [ ] AC-011: A missing data key for a column renders an empty cell without error.

## Dependencies

- Spec 002 — Template Schema (loop field and style schema definitions).
- Spec 003 — Text Rendering (cell overflow logic reuses text rendering overflow modes).

## Notes

- This spec covers single-page table rendering. Multi-page continuation is defined in Spec 006.
- Open question: should alternating row background colours be supported? Not in the current design but could be added as an optional `rowStyle` property.
- Open question: should column widths support percentage-based values in addition to absolute points? Current design uses only absolute point values.
