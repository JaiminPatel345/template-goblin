# Spec 012 — UI Table Field

## Status

Draft

## Summary

The UI table field allows designers to place table placeholders on the canvas by drawing a rectangle after clicking "Add Table" in the toolbar. Once placed, the right panel exposes all table configuration: JSON key (auto-prefixed with `tables.`), max rows, max columns, multi-page toggle with max pages input, column definitions with drag-to-reorder, and granular style controls for headers, rows, and cells. Column definitions include per-column style overrides that take precedence over the global row style. The table field is the most complex field type, mapping directly to the table rendering logic in the core library.

## Requirements

- [ ] REQ-001: Clicking "Add Table" in the toolbar enters a draw mode where the user draws a rectangle on the canvas by clicking and dragging
- [ ] REQ-002: After drawing, a new table field is created at the drawn position with the drawn width and height
- [ ] REQ-003: The right panel displays all editable properties for the selected table field
- [ ] REQ-004: JSON key input is auto-prefixed with `tables.` -- the user enters only the suffix (e.g. typing "marks" produces `tables.marks`)
- [ ] REQ-005: Max rows input (number) -- maximum number of data rows visible per page
- [ ] REQ-006: Max columns input (number) -- sets the expected number of columns
- [ ] REQ-007: Multi-page toggle -- when enabled, the table can span multiple pages; disabling restricts the table to the bounding rectangle on page 1
- [ ] REQ-008: When multi-page is enabled, a "Max pages" number input appears to set `meta.maxPages` for this template
- [ ] REQ-009: Column definitions section -- each column has: key (string), label (string), width (number in pt), align (left/center/right)
- [ ] REQ-010: Individual column style overrides -- each column can optionally override: fontSize, fontWeight, textDecoration, color, align
- [ ] REQ-011: Columns can be reordered by drag-and-drop within the column definitions list
- [ ] REQ-012: Add column button appends a new column with default values; remove column button deletes a column
- [ ] REQ-013: Header style section: fontSize, fontWeight (default bold), color, backgroundColor, align
- [ ] REQ-014: Row style section: fontSize, fontWeight, overflowMode (dynamic_font/truncate), fontSizeDynamic, fontSizeMin, lineHeight, color
- [ ] REQ-015: Cell style section: borderWidth, borderColor, paddingTop, paddingBottom, paddingLeft, paddingRight
- [ ] REQ-016: The canvas renders a visual preview of the table structure showing the header row and a few sample data rows within the bounding rectangle

## Behaviour

### Happy path

1. User clicks "Add Table" in the toolbar. Cursor changes to a crosshair indicating draw mode.
2. User clicks and drags on the canvas to draw a rectangle. On mouse release, the table field is created.
3. The field appears on the canvas as a table outline with a header row and placeholder data rows.
4. The right panel populates with table field properties, pre-filled with defaults: maxRows 10, maxColumns 3, multiPage false, empty columns list.
5. User edits the JSON key suffix to "marks". The field's `jsonKey` becomes `tables.marks`.
6. User clicks "Add Column" three times, creating columns with keys "subject_name", "grade", "marks".
7. User sets labels: "Subject", "Grade", "Marks". Sets widths: 200, 80, 80 pt. Sets alignment per column.
8. User opens the style override for the "Subject" column and sets fontWeight to "bold".
9. User adjusts header style: backgroundColor "#f0f0f0", fontWeight "bold", fontSize 11.
10. User adjusts cell style: borderWidth 1, borderColor "#000000", padding 4 on all sides.
11. User enables multi-page and sets max pages to 5.
12. The canvas updates to show a table preview reflecting the configured columns, styles, and layout.

### Edge cases

- Zero columns defined: show a message prompting the user to add at least one column; field is valid but renders as an empty box
- Column widths exceed the field width: show a warning that total column width exceeds the bounding rectangle width; columns will be clipped or scrolled
- Column widths are less than the field width: remaining space is empty (no auto-distribution)
- Very many columns (e.g. 20+): the right panel should scroll the columns list; the canvas preview may truncate visually
- Max rows set to 0: enforce minimum of 1
- Max pages set to 0 or negative when multi-page is enabled: enforce minimum of 1
- Multi-page disabled and many rows: rows beyond what fits in the bounding rectangle are not rendered (truncated on page 1)
- Column key is empty: show validation error on that column
- Duplicate column keys within the same table: show a validation error
- Drag-reorder of columns: updates the `columns` array order, which affects render order (left to right)
- Removing a column that has a style override: override is removed with the column
- Column label is empty: default to the column key as the display label

### Error conditions

- Attempting to add a table field before a background image is uploaded: blocked with a message (dependent on spec 009 canvas requirements)
- Invalid column key characters: input is sanitized or rejected with inline validation

## Input / Output

### Field Definition (stored in manifest)

```ts
interface TableFieldDefinition {
  id: string
  type: 'table'
  groupId: string | null
  required: boolean
  jsonKey: string // e.g. "tables.marks"
  placeholder: null
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  style: TableFieldStyle
}

interface TableFieldStyle {
  maxRows: number
  maxColumns: number
  multiPage: boolean
  headerStyle: {
    fontFamily: string
    fontSize: number
    fontWeight: 'normal' | 'bold'
    align: 'left' | 'center' | 'right'
    color: string
    backgroundColor: string
  }
  rowStyle: {
    fontFamily: string
    fontSize: number
    fontWeight: 'normal' | 'bold'
    color: string
    overflowMode: 'dynamic_font' | 'truncate'
    fontSizeDynamic: boolean
    fontSizeMin: number
    lineHeight: number
  }
  cellStyle: {
    borderWidth: number
    borderColor: string
    paddingTop: number
    paddingBottom: number
    paddingLeft: number
    paddingRight: number
  }
  columns: ColumnDefinition[]
}

interface ColumnDefinition {
  key: string
  label: string
  width: number
  align: 'left' | 'center' | 'right'
  style?: {
    fontSize?: number
    fontWeight?: 'normal' | 'bold'
    textDecoration?: 'none' | 'underline'
    color?: string
  }
}
```

### Right Panel Props Component

```ts
interface TableFieldPropsPanel {
  field: TableFieldDefinition
  groups: Group[]
  onUpdate(updates: Partial<TableFieldDefinition>): void
  onStyleUpdate(updates: Partial<TableFieldStyle>): void
  onAddColumn(): void
  onRemoveColumn(index: number): void
  onUpdateColumn(index: number, updates: Partial<ColumnDefinition>): void
  onReorderColumns(fromIndex: number, toIndex: number): void
}
```

## Acceptance Criteria

- [ ] AC-001: Clicking "Add Table" enters draw mode; drawing a rectangle on the canvas creates a table field at that position with the drawn dimensions
- [ ] AC-002: The right panel displays all table field properties when a table field is selected
- [ ] AC-003: JSON key is auto-prefixed with `tables.` -- entering "marks" produces `jsonKey: "tables.marks"`
- [ ] AC-004: Duplicate JSON keys are flagged with a validation error
- [ ] AC-005: Clicking "Add Column" adds a new column entry to the column definitions with empty key, empty label, default width (100 pt), and default align ("left")
- [ ] AC-006: Clicking the remove button on a column removes it from the definitions list
- [ ] AC-007: Drag-and-drop reorders columns in the list, and the updated order is reflected in the `columns` array
- [ ] AC-008: Each column's style override section can be expanded to set fontSize, fontWeight, textDecoration, and color independently
- [ ] AC-009: Header style controls update the header rendering preview on the canvas in real-time
- [ ] AC-010: Row style controls update the data row rendering preview on the canvas in real-time
- [ ] AC-011: Cell style controls (border, padding) update the table rendering preview on the canvas in real-time
- [ ] AC-012: Enabling multi-page toggle reveals the max pages input
- [ ] AC-013: Disabling multi-page toggle hides the max pages input and sets `multiPage: false` in the style
- [ ] AC-014: The canvas renders a visual preview of the table showing the header row with column labels and at least 2-3 sample data rows
- [ ] AC-015: Column widths in the canvas preview match the configured widths from the right panel
- [ ] AC-016: Total column width exceeding the field width shows a visible warning in the right panel
- [ ] AC-017: The field's width and height are both adjustable via resize handles on the canvas
- [ ] AC-018: All property changes are reflected in the Zustand `templateStore` and persist in the manifest on save
- [ ] AC-019: A table field with zero columns defined is valid but shows an empty box on the canvas with a "No columns defined" message

## Dependencies

- Spec 002 — Template Schema (table field style schema, column definition structure)
- Spec 005 — Table Rendering (table rendering rules, multi-page behaviour, cell styling)
- Spec 009 — UI Canvas (canvas infrastructure, selection, resize handles, draw mode)

## Notes

- The right panel component for table fields lives at `packages/ui/src/components/RightPanel/TableFieldProps.tsx`.
- The column definitions editor is the most complex part of this right panel. Consider using a collapsible accordion pattern: each column is a collapsible section showing key/label/width/align, with a "Style Override" expandable subsection.
- Drag-to-reorder can use `@dnd-kit/sortable` or a lightweight custom implementation. Evaluate bundle size before adding a dependency.
- Open question: should the canvas preview use actual sample data (from the JSON preview in spec 014) or generic placeholder content (e.g. "Column 1 Row 1")? Leaning toward generic placeholder content with an option to toggle to live JSON preview data.
- Open question: when a column style override is empty/undefined, it inherits from `rowStyle`. Should the UI show the inherited values greyed out in the override section, or should override fields be blank until the user explicitly sets them? Leaning toward blank with a hint showing the inherited value.
- The multi-page max pages setting on a table field updates `meta.maxPages` in the manifest. If multiple table fields have different max pages values, the highest value should be used. This interaction needs careful handling.
