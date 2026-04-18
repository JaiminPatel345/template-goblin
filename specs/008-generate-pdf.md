# Spec 008 — Generate PDF

## Status

Draft

## Summary

The `generatePDF` function is the hot path of the library. It takes a pre-loaded `LoadedTemplate` (from `loadTemplate`) and an `InputJSON` data object, validates the input data, registers fonts, renders the background image, and renders all fields in z-index order to produce a PDF as a `Buffer`. It performs zero disk I/O -- everything operates from in-memory data. The runtime value for every field is obtained via `resolveValue` (Spec 023), the single source of truth for lookup: static fields return `source.value`, dynamic fields return the matching entry from `InputJSON.texts` / `InputJSON.images` / `InputJSON.tables`. Required-field validation applies only to dynamic fields with `required: true`. A convenience function `generatePDFFromFile` is also provided that combines `loadTemplate` and `generatePDF` into a single call for one-off usage.

## Requirements

- [ ] REQ-001: `generatePDF(template: LoadedTemplate, data: InputJSON): Promise<Buffer>` -- accept a loaded template and input data, return a PDF Buffer
- [ ] REQ-002: `generatePDFFromFile(path: string, data: InputJSON): Promise<Buffer>` -- convenience function that calls `loadTemplate(path)` then `generatePDF(template, data)` internally
- [ ] REQ-003: Validate input data against the template before rendering -- check that all required fields are present and data types match expected types
- [ ] REQ-004: Register all custom fonts from `LoadedTemplate.fonts` with PDFKit via `doc.registerFont(fontId, fontBuffer)` before rendering any fields
- [ ] REQ-005: Render the background image (if present) as the first layer on every page
- [ ] REQ-006: Render all fields in ascending z-index order (lowest `zIndex` rendered first, appearing behind higher z-index fields)
- [ ] REQ-007: Text fields are rendered according to the text rendering rules defined in spec 003
- [ ] REQ-008: Image fields are rendered according to the image rendering rules defined in spec 004
- [ ] REQ-009: Table fields are rendered according to the table rendering rules defined in spec 005
- [ ] REQ-010: Multi-page behaviour follows the rules defined in spec 006 -- only table fields with `multiPage: true` can trigger additional pages
- [ ] REQ-011: The default output is a single page. Additional pages are created only when table data overflows
- [ ] REQ-012: When a new page is added, the background image is re-rendered on that page before any table continuation
- [ ] REQ-013: Non-table fields (text, image) are rendered only on page 1
- [ ] REQ-014: Perform zero disk I/O during PDF generation -- all data comes from the in-memory `LoadedTemplate` and `InputJSON`
- [ ] REQ-015: Use PDFKit as the PDF rendering engine
- [ ] REQ-016: Image data in `InputJSON` can be provided as either a `Buffer` or a base64-encoded string; both must be supported
- [ ] REQ-017: Enforce `meta.maxPages` -- if rendering would exceed the maximum page count, throw an error instead of silently truncating

## Behaviour

### Happy path

1. Caller passes a `LoadedTemplate` and an `InputJSON` object
2. Input data is validated: all required fields are present, data types are correct
3. A new PDFKit document is created with dimensions from `manifest.meta.width` and `manifest.meta.height`
4. All custom fonts from `template.fonts` are registered with PDFKit
5. Background image (if present) is rendered on the first page
6. Fields are sorted by `zIndex` ascending
7. Each field is rendered in order:
   - Text fields: rendered with overflow/dynamic font logic per spec 003
   - Image fields: rendered with fit mode logic per spec 004
   - Table fields: rendered as tables per spec 005, potentially spanning multiple pages per spec 006
8. PDFKit document is finalized and the output Buffer is returned

### Edge cases

- Template with no fields: produces a PDF containing only the background image (or a blank page if no background)
- Template with no background image: fields render on a white page
- Optional fields missing from input data: field is skipped (not rendered), no error thrown
- Empty string for a text field: field area is rendered but empty (no text drawn)
- Empty array for a table field: table header may or may not render (open question); no data rows drawn
- Image field value as base64 string: decoded to Buffer before passing to PDFKit
- Image field value as Buffer: used directly
- Table field with exactly the number of rows that fit on one page: no second page created
- Table field with `multiPage: false` and overflowing data: rows are truncated to fit the bounding rectangle on page 1
- Multiple table fields on the same template: each table is independent; only tables with `multiPage: true` trigger new pages
- Fields with the same z-index: render order among them is undefined but deterministic (stable sort by field id as tiebreaker)

### Error conditions

- `MISSING_REQUIRED_FIELD`: A field marked `required: true` in the template has no corresponding key in the input data (or the value is `null`/`undefined`). Error includes the missing field's `jsonKey`.
- `INVALID_DATA_TYPE`: A field receives data of the wrong type (e.g. a string where an array is expected for a table, or a non-image value for an image field). Error includes the field `jsonKey` and expected vs actual type.
- `MAX_PAGES_EXCEEDED`: A multi-page table would require more pages than `meta.maxPages` allows. Error includes the number of pages required and the maximum allowed.
- `PDF_GENERATION_FAILED`: An unexpected error during PDFKit rendering (e.g. corrupt font buffer, invalid image data). Wraps the underlying error with context about which field was being rendered.

## Input / Output

### Input -- `generatePDF`

```ts
generatePDF(template: LoadedTemplate, data: InputJSON): Promise<Buffer>
```

```ts
interface InputJSON {
  texts: Record<string, string>
  tables: Record<string, Array<Record<string, string>>>
  images: Record<string, Buffer | string> // Buffer or base64-encoded string
}
```

### Input -- `generatePDFFromFile`

```ts
generatePDFFromFile(path: string, data: InputJSON): Promise<Buffer>
```

### Output

```ts
Promise<Buffer> // Complete PDF file as a Node.js Buffer
```

### Errors

```ts
class TemplateGoblinError extends Error {
  code:
    | 'MISSING_REQUIRED_FIELD'
    | 'INVALID_DATA_TYPE'
    | 'MAX_PAGES_EXCEEDED'
    | 'PDF_GENERATION_FAILED'
  details?: string
}
```

## Acceptance Criteria

- [ ] AC-001: `generatePDF` with a valid template and complete input data returns a Buffer containing a valid PDF (starts with `%PDF-` header bytes)
- [ ] AC-002: `generatePDF` with a missing required text field rejects with `MISSING_REQUIRED_FIELD` including the field's `jsonKey`
- [ ] AC-003: `generatePDF` with a missing required image field rejects with `MISSING_REQUIRED_FIELD`
- [ ] AC-004: `generatePDF` with a missing required table field rejects with `MISSING_REQUIRED_FIELD`
- [ ] AC-005: Fields are rendered in ascending z-index order -- a field with `zIndex: 2` renders on top of a field with `zIndex: 1`
- [ ] AC-006: Background image is rendered on every page (including pages added by multi-page tables)
- [ ] AC-007: Text fields render within their bounding rectangle and never overflow, using dynamic font or truncation as configured
- [ ] AC-008: Image fields render with the correct fit mode (fill/contain/cover) within their bounding rectangle
- [ ] AC-009: Table fields render with correct header, row styles, column widths, cell padding, and borders
- [ ] AC-010: A multi-page table that overflows creates additional pages, each with the background image and continued table (with header re-rendered)
- [ ] AC-011: A multi-page table that would exceed `meta.maxPages` rejects with `MAX_PAGES_EXCEEDED`
- [ ] AC-012: Non-table fields appear only on page 1 and are not duplicated on subsequent pages
- [ ] AC-013: `generatePDFFromFile` produces the same output as calling `loadTemplate` then `generatePDF` separately
- [ ] AC-014: Custom fonts registered from the template are used correctly in text rendering
- [ ] AC-015: Image data provided as a base64 string is decoded and rendered identically to the same image provided as a Buffer
- [ ] AC-016: Optional fields omitted from input data do not cause errors and are simply not rendered
- [ ] AC-017: The function performs zero disk I/O -- verified by mocking `fs` and asserting no read/write calls during `generatePDF`
- [ ] AC-018: A template with no fields produces a valid single-page PDF (with background image if present)

## Dependencies

- Spec 001 — `.tgbl` File Format
- Spec 002 — Template Schema
- Spec 003 — Text Rendering
- Spec 004 — Image Rendering
- Spec 005 — Table Rendering
- Spec 006 — Multi-Page Rules

## Notes

- `generatePDFFromFile` is a convenience wrapper and should NOT be used in production loops. It reads from disk on every call. The JSDoc comment should include a warning about this.
- PDFKit document creation: use `new PDFDocument({ size: [meta.width, meta.height], autoFirstPage: true, bufferPages: true })` to control page dimensions.
- The PDF output Buffer is collected by piping the PDFKit document to a `concat-stream` or equivalent in-memory collector.
- Open question: should `generatePDF` accept an optional `options` object for future extensibility (e.g. `{ compress: boolean, metadata: PDFMetadata }`)?
- Open question: when a table field has an empty array in the input data, should the table header still be rendered? Current leaning: no -- skip the entire field if the array is empty.
- Performance: since this is the hot path called potentially millions of times, avoid any unnecessary allocations or copies. Font registration could be cached across calls if PDFKit supports it.
