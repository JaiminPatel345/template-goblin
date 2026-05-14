# @template-goblin/types

## 2.1.0

### Minor Changes

- 740933c: Table styling expansion (#76 and follow-ups):
  - **Transparent fills and borders** — `CellStyle.backgroundColor` and `borderColor` now accept `null` as a "transparent" sentinel. Header bg, row bg, cell borders can be opted out in the right panel; the PDFKit renderer and Fabric canvas both skip the corresponding fill/stroke when null.
  - **Table-level border** — new optional `TableFieldStyle.tableBorder: { color, width }` paints the outer perimeter independently of per-cell strokes. New tables default to a 1pt black perimeter with cell strokes off. Legacy templates without `tableBorder` keep their row-derived perimeter.
  - **Fit to content** — new optional `TableFieldStyle.fitToContent` (default `true`, including for legacy templates) ends the perimeter at the last rendered row instead of stretching to the field rect's full height.
  - **Canvas parity** — Fabric preview now paints the outer perimeter using `tableBorder` and respects `fitToContent`, so right-panel edits show live; per-column align overrides are also merged over `rowStyle` so body cells align correctly on canvas.
  - **Color picker** — replaced the native `<input type="color">` (which froze the page on some browsers) with an in-page SketchPicker popover via `react-color`.
  - **UI polish** — clearer labels (Header Text Color, Header Row Background, Row Text Color, Row Background, Cell Border, Table Border), themed border on the transparent "Clear / Color" toggle, and a collapsible Columns section in the table properties panel.

## 2.0.0

### Major Changes

- 688f31d: Add hyperlink support — clickable elements in generated PDFs (#87).

  Designers can attach a URL to any text, image, or table field via a new "Link" section in the Properties panel. Two flavours:
  - **Static**: a literal URL pinned in the manifest (`{ mode: 'static', url }`).
  - **Dynamic**: a `links[jsonKey]` lookup (`{ mode: 'dynamic', jsonKey }`) resolved per render so the URL can vary across runs. URLs live in their own top-level `links` bucket on `InputJSON` — separate from `texts` so they're visually distinct in the JSON preview and never get confused with rendered text content.

  Allowed protocols: `https`, `http`, `mailto`, `tel`. Anything else is rejected as `INVALID_DATA_TYPE` with field context. Empty / missing dynamic values render the field without a clickable region (no error). For tables, the link covers the whole table's bounding rect — there is no per-row or per-column variant in v1.

  ### Schema additions
  - `FieldBase.hyperlink?: Hyperlink` — optional on every field.
  - `InputJSON.links?: LinkInputs` — new top-level bucket (`Record<string, string>`) for runtime hyperlink URLs.
  - New `Hyperlink` discriminated union exported from `@template-goblin/types`.
  - New helpers: `isValidHyperlinkUrl`, `isStaticHyperlink`, `isDynamicHyperlink`.

  ### Why major

  This is an additive but cross-cutting schema change touching public types, manifest validation, runtime data validation, and PDF rendering. The schema additions are backward-compatible (the field is optional), but the SDK contract grows in a way library consumers will want to opt into deliberately, so we cut a major.

  ### Out of scope (deferred)
  - Per-cell or per-column links inside tables.
  - Anchor links inside the same PDF (`#named-dest`).
  - Click-tracking / analytics wrappers — designer's own concern.
  - A canvas adornment showing which fields are linked — UI-only follow-up.

- fb662a2: Introduce static/dynamic field sources and rename loop to table.
  - Every field (text, image, table) now carries a `source: FieldSource<V>`
    property that is either `{ mode: 'static', value }` or
    `{ mode: 'dynamic', jsonKey, required, placeholder }`. Static fields are
    baked into the template and rendered on every generated PDF; dynamic
    fields are filled from `InputJSON` at generation time.
  - `loop` is renamed to `table` across types (`TableField`, `TableFieldStyle`,
    `TableColumn`, `TableRow`), `InputJSON.loops` → `InputJSON.tables`, and
    the core `'loop'` field type is now `'table'`.
  - A shared `CellStyle` type is introduced and reused by `headerStyle`,
    `rowStyle`, per-row (odd/even) overrides, and per-column body/header
    overrides. `TableFieldStyle` gains `showHeader`, `oddRowStyle`,
    `evenRowStyle`; `TableColumn` gains full `Partial<CellStyle>` body and
    header overrides.
  - `ImageFieldStyle.placeholderFilename` is removed; the placeholder file
    for dynamic image fields now lives at `source.placeholder.filename`.
    Static image files live in a new `images/` folder inside the `.tgbl`
    archive; placeholder files remain in `placeholders/`.
  - `LoadedTemplate` gains a `staticImages: Map<string, Buffer>` populated
    during `loadTemplate`.
  - New core exports: `resolveValue(field, input)` (generic source-aware
    resolver, never reads `source.placeholder`) and `validateManifest(m)`
    (deep schema validator for the new source model).
  - New error codes: `INVALID_SOURCE_MODE`, `INVALID_STATIC_VALUE`,
    `MISSING_STATIC_IMAGE_FILE`, `MISSING_PLACEHOLDER_IMAGE_FILE`,
    `INVALID_DYNAMIC_SOURCE`, `DUPLICATE_JSON_KEY`, `INVALID_TABLE_ROW`.
  - `validateData` is narrowed to dynamic fields only — static fields
    contribute no input-data requirements.

  No migration path is provided: pre-release templates must be recreated
  under the new schema.

### Minor Changes

- cb6d6fc: Init changeset
