# Spec 006 — Multi-Page

## Status

Draft

## Summary

Defines how templates support multiple pages through two distinct mechanisms: (1) user-defined pages where designers manually add pages with independent backgrounds, and (2) table-overflow pages where table fields automatically generate continuation pages when data exceeds available space. Multi-page behaviour applies to table fields regardless of whether their `source` is static or dynamic — the engine treats the resolved row array the same way in both cases. Fields are scoped to a specific page via `pageId`. Each user-defined page has its own background (uploaded image, solid color, or inherited from the previous page). The UI provides page navigation via tabs at the bottom of the canvas.

## Requirements

### User-Defined Multi-Page

- [ ] REQ-001: Templates support multiple user-defined pages via the `pages` array in the manifest. Each page is a `PageDefinition` with a unique `id`, `index`, and background configuration.
- [ ] REQ-002: Users can add new pages to a template via the "Add Page" button in the canvas UI. Adding a page opens a background choice dialog (upload image, solid color, or inherit from previous).
- [ ] REQ-003: Each page has its own background, configured via `backgroundType`:
  - `"image"` — a raster image stored in the `.tgbl` archive (referenced by `backgroundFilename`).
  - `"color"` — a solid hex color fill (specified by `backgroundColor`).
  - `"inherit"` — inherits the resolved background of the previous page in index order. Not allowed on the first page (index 0).
- [ ] REQ-004: Fields are scoped to a specific page via the `pageId` property. A field with `pageId: null` is assigned to the first page (index 0). Only fields belonging to the currently displayed page are visible on the canvas.
- [ ] REQ-005: Pages can be reordered by the user. When pages are reordered, `index` values are renumbered to remain 0-based and contiguous. Fields retain their `pageId` references (they follow their page, not the index).
- [ ] REQ-006: Pages can be deleted. Deleting a page also deletes all fields assigned to that page. If a subsequent page uses `backgroundType: "inherit"` and the deleted page was its source, the inheriting page falls through to the next earlier page or becomes invalid (prompting the user to choose a new background).
- [ ] REQ-007: A template must always have at least one page. The UI prevents deleting the last remaining page.

### Table-Overflow Multi-Page (Table Continuation)

- [ ] REQ-008: A table field with `multiPage: true` triggers automatic page creation when its data rows exceed the available space within the bounding rectangle on the current page.
- [ ] REQ-009: On each table-overflow continuation page, the background of the page that contains the table field is re-rendered (using the resolved background of the table field's parent page).
- [ ] REQ-010: On each table-overflow continuation page, the table's header row is re-rendered at the top of the table field's bounding rectangle before continuing with data rows.
- [ ] REQ-011: Data rows on continuation pages pick up exactly where the previous page left off — no duplicated or skipped rows.
- [ ] REQ-012: Enforce `meta.maxPages` as a hard limit on table-overflow pages only (not on user-defined pages). If the table requires more overflow pages than `maxPages` allows, throw `MaxPagesExceededError`. The engine does NOT silently truncate data.
- [ ] REQ-013: Only fields belonging to the table field's parent page are rendered on table-overflow pages — and only the table field itself continues. Other fields (text, image, non-overflowing tables) on the same page do NOT appear on continuation pages.
- [ ] REQ-014: `meta.maxPages` defaults to `1` when not specified. The engine counts all overflow pages per table field (including the first page) against this limit.

### Combined Behaviour

- [ ] REQ-015: User-defined pages and table-overflow pages coexist. The final PDF page order is: all user-defined pages in index order, with any table-overflow pages inserted immediately after the page containing the overflowing table field.
- [ ] REQ-016: Each user-defined page renders only its own fields (those with matching `pageId`). Table-overflow pages render only the continuing table field with the parent page's background.
- [ ] REQ-017: Multiple table fields on different pages can each independently overflow, each generating their own continuation pages after their respective parent page.

## Behaviour

### User-Defined Pages — Creation Flow

1. Designer clicks "Add Page" button in the page tab bar at the bottom of the canvas.
2. A dialog appears with three background options:
   - **Upload Image**: opens a file picker. The selected image is compressed and stored in the `.tgbl` archive.
   - **Solid Color**: opens a color picker. The chosen color is stored as `backgroundColor`.
   - **Inherit from Previous**: uses the same background as the preceding page. Only available when at least one page already exists.
3. A new `PageDefinition` is created with a unique `id`, `index` set to the next available value, and the chosen `backgroundType`.
4. The canvas switches to the new page. The page tab bar updates to show the new page tab.

### User-Defined Pages — Navigation

1. The page tab bar at the bottom of the canvas displays one tab per user-defined page, labeled "Page 1", "Page 2", etc.
2. Clicking a tab switches the canvas to display that page's background and fields.
3. Only fields with `pageId` matching the selected page are visible and editable on the canvas.
4. The currently active page tab is visually highlighted.

### User-Defined Pages — Reordering

1. Pages can be reordered via drag-and-drop on the page tab bar.
2. When pages are reordered, all `index` values are renumbered 0-based from left to right.
3. Fields are unaffected — they reference pages by `id`, not by `index`.
4. If a page using `backgroundType: "inherit"` is moved to index 0, the UI prompts the user to choose a new background type (image or color) since the first page cannot inherit.

### User-Defined Pages — Deletion

1. Right-clicking a page tab shows a context menu with "Delete Page".
2. Deleting a page removes the `PageDefinition` and all fields with that `pageId`.
3. If the deleted page is the source for a subsequent page's `"inherit"` background, that page now inherits from whatever page precedes it after renumbering. If no predecessor exists (it became the first page), the UI prompts the user to set an explicit background.
4. The last remaining page cannot be deleted.

### Table-Overflow — Trigger and Construction

1. The engine renders each user-defined page in index order, rendering only the fields assigned to that page.
2. For a table field with `multiPage: true` on any page, after filling all available rows within the bounding rectangle, the engine checks if unrendered data rows remain.
3. If rows remain and `currentOverflowPageCount < meta.maxPages`, a continuation page is created.
4. If rows remain and `currentOverflowPageCount >= meta.maxPages`, the engine throws `MaxPagesExceededError`.
5. Each continuation page:
   - Renders the resolved background of the table field's parent page.
   - Renders the table field's header row at the top of the bounding rectangle.
   - Renders data rows below the header, continuing from where the previous page left off.
   - Does NOT render any other fields from the parent page.
6. After all overflow pages for a table field are generated, the engine continues to the next user-defined page.

### Page Space Calculation (Table Overflow)

On each page, the available space for data rows within the table field bounding rectangle is:

```
availableHeight = boundingRect.height - headerRowHeight
rowsPerPage = floor(availableHeight / dataRowHeight)
```

The header occupies space on every page (both the original and continuation pages).

### Happy Path

1. Template has 3 user-defined pages: page 1 (image background), page 2 (color background), page 3 (inherit from page 2).
2. Page 1 has text fields and an image field. Page 2 has a table field with `multiPage: true` and 50 data rows. Page 3 has text fields.
3. Engine renders page 1 with its fields, then page 2 with the table field (10 rows fit per page), then 4 overflow pages with continued table rows, then page 3 with its fields.
4. Final PDF: page 1, page 2, overflow page 1, overflow page 2, overflow page 3, overflow page 4, page 3 = 7 total pages.

### Edge Cases

- `multiPage: false` on a table field: overflow rows are clipped on the table field's page, no continuation pages created.
- `maxPages: 1` with `multiPage: true` and overflow: throws `MaxPagesExceededError`.
- Data fits exactly on the table field's page: no continuation pages created regardless of `multiPage` setting.
- Empty data array with `multiPage: true`: single page with header only, no continuation pages.
- Table field bounding rect is too small for even one data row: header renders, zero data rows, remaining rows cause `MaxPagesExceededError` if `multiPage: true`.
- A template with only one user-defined page and no table overflow: behaves as a single-page template.
- A user-defined page has no fields assigned to it: renders the background only (valid use case, e.g., a blank separator page).
- All pages use `backgroundType: "inherit"` except the first: each inherits from the resolved background of the page before it (chain resolution).
- A page in the middle of an inherit chain is deleted: subsequent inheriting pages resolve from the new predecessor.
- `backgroundType: "image"` but the image file is missing from the archive: throw `MissingAssetError`.

### Error Conditions

- Required overflow pages exceed `meta.maxPages`: throw `MaxPagesExceededError` with `{ required: number, limit: number }`.
- `maxPages` is less than 1: throw `InvalidFieldError` (at least one page must be allowed for overflow counting).
- `pages` array is empty: throw `SchemaValidationError`.
- First page uses `backgroundType: "inherit"`: throw `SchemaValidationError`.
- Field `pageId` references a non-existent page: throw `InvalidFieldError`.
- Background image file missing from archive: throw `MissingAssetError`.

## Input / Output

```typescript
interface PageDefinition {
  id: string
  index: number
  backgroundType: 'image' | 'color' | 'inherit'
  backgroundColor?: string
  backgroundFilename?: string
}

interface MultiPageContext {
  maxPages: number
  pages: PageDefinition[]
  resolvedBackgrounds: Map<string, Buffer | string> // pageId -> image Buffer or color string
  fields: (TextField | ImageField | TableField)[] // each has pageId
  tableData: Record<string, Record<string, string>[]> // keyed by field ID
}

interface MultiPageOutput {
  totalPages: number
  pages: PageContent[] // ordered array of page render instructions
}

interface PageContent {
  pageNumber: number
  sourcePageId: string // the user-defined page this derives from
  isOverflowPage: boolean // true for table-overflow continuation pages
  background: { type: 'image'; data: Buffer } | { type: 'color'; color: string }
  fields: RenderedField[] // user-defined page: all page fields; overflow: table continuation only
}

function renderMultiPage(ctx: MultiPageContext, pdfCtx: PDFContext): MultiPageOutput
function resolvePageBackground(
  page: PageDefinition,
  pages: PageDefinition[],
): { type: 'image' | 'color'; value: string }
```

## Acceptance Criteria

### User-Defined Pages

- [ ] AC-001: A template with multiple user-defined pages produces a PDF with one page per `PageDefinition` (plus any overflow pages).
- [ ] AC-002: Each user-defined page renders only the fields assigned to it via `pageId`.
- [ ] AC-003: A page with `backgroundType: "image"` renders the referenced image as its background.
- [ ] AC-004: A page with `backgroundType: "color"` renders a solid color fill as its background.
- [ ] AC-005: A page with `backgroundType: "inherit"` renders the same background as the previous page in index order.
- [ ] AC-006: `backgroundType: "inherit"` on the first page (index 0) is rejected during validation.
- [ ] AC-007: Deleting a page removes all fields assigned to that page.
- [ ] AC-008: Reordering pages renumbers `index` values to remain 0-based and contiguous; fields follow their page by `id`.
- [ ] AC-009: The last remaining page cannot be deleted.

### Table-Overflow Pages

- [ ] AC-010: A table field with `multiPage: true` and more rows than fit on one page produces continuation pages.
- [ ] AC-011: Each continuation page includes the resolved background of the table field's parent page.
- [ ] AC-012: Each continuation page includes the table field's header row at the top of the bounding rectangle.
- [ ] AC-013: Data rows on continuation pages pick up exactly where the previous page left off (no duplicated or skipped rows).
- [ ] AC-014: When required overflow pages exceed `meta.maxPages`, the engine throws `MaxPagesExceededError` (not silent truncation).
- [ ] AC-015: Non-table fields on the same page as the overflowing table do NOT appear on continuation pages.
- [ ] AC-016: A table field with `multiPage: false` clips overflow rows and does not create continuation pages.
- [ ] AC-017: `maxPages: 1` with overflow data throws `MaxPagesExceededError`.
- [ ] AC-018: Data that fits exactly within the table field's page produces no continuation pages even when `multiPage: true`.

### Combined

- [ ] AC-019: A template with 3 user-defined pages and a table field on page 2 that overflows produces the correct page order: page 1, page 2, overflow pages, page 3.
- [ ] AC-020: Multiple table fields on different pages can each independently overflow, each generating continuation pages after their respective parent page.

## Dependencies

- Spec 001 — .tgbl File Format (background images stored in the archive).
- Spec 002 — Template Schema (`pages` array, `PageDefinition`, `pageId` on fields, `meta.maxPages`).
- Spec 005 — Table Rendering (row rendering logic, header style, row style).
- Spec 009 — UI Canvas (page tabs, "Add Page" button, page navigation).

## Notes

- The decision to throw an error rather than silently truncate on `maxPages` violation is deliberate. In document generation (e.g., invoices), missing data rows would produce an incorrect document. The caller should handle the error by increasing `maxPages` or reducing data.
- `meta.maxPages` is a per-table-field overflow limit, not a total page count limit. User-defined pages are not counted against it. This allows designers to create templates with many user-defined pages while still controlling table-overflow behaviour.
- Open question: should continuation pages support a different bounding rectangle for the table field (e.g., full-page table on overflow pages but partial on the original page)? Current design reuses the same bounding rectangle on all pages.
- Open question: should the engine support a "page break" marker in the data to force a new page at a specific row? Not included in the current design.
- Migration: existing single-page templates (no `pages` array) should be auto-migrated by creating a single `PageDefinition` with `backgroundType: "image"` pointing to the existing `background.png`.
