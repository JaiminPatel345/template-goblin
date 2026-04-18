---
'@template-goblin/types': major
'template-goblin': major
---

Introduce static/dynamic field sources and rename loop to table.

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
