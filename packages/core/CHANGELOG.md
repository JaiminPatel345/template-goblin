# template-goblin

## 2.0.0

### Major Changes

- 022d2d4: Make it Working
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

- af615b6: `InputJSON.images.<key>` now accepts a local file path, an HTTP/HTTPS URL,
  a `data:` URI, or an explicit `{ type, value }` shape — in addition to the
  existing `Buffer` and bare base64 string (#69). Library users with image
  data on disk, behind an S3 presigned URL, or anywhere fetchable can pass
  the path/URL directly instead of writing their own loader before
  `generatePDF()`. Auto-detection runs in the pre-flight pass: `data:` →
  decode, `http(s)://` → fetch with timeout, path-shaped string +
  `fs.existsSync()` → read, otherwise → bare base64 (catch-all). The
  explicit object form (`{ type: 'path' | 'url' | 'base64' | 'buffer',
value, headers? }`) is the escape hatch when auto-detection picks the
  wrong branch (e.g. base64 starting with `/`). `generatePDF` gains an
  optional third arg with `imageFetchTimeoutMs` (default 10 000) and
  `imageResolveConcurrency` (default 6). All failures raise
  `MISSING_ASSET` / `INVALID_FORMAT` with `fieldId`, `jsonKey`, and the
  resolved path/URL/HTTP status in `error.details`.
- a6d053c: Preview now runs the real `generatePDF` instead of a parallel HTML
  pipeline (#86) — the bytes the user sees in the preview tab are
  byte-identical to what a library consumer gets from
  `generatePDF(template, data)`. Pre-fix the two renderers drifted on every
  detail (header height, row fitting, font metrics, table border behaviour,
  multi-page logic), so every renderer-level bug had to be fixed twice.

  `template-goblin` adds a new `"./browser"` subpath export — slim entry
  that re-exports `generatePDF`, `validateData`, `validateManifest`,
  `resolveValue`, and font-subsetting helpers without pulling in the
  fs-backed `loadTemplate` / `saveTemplate` chain. The package's main
  export is unchanged.

- 93bc316: Solid-colour image fields now store a colour value directly instead of
  baking a 1×1 PNG asset (#81). Pre-fix, picking "solid colour" generated
  a tiny PNG and rendered it through `fit: contain`, which produced a
  square in the centre of any non-square rect. Now solid-colour fields
  fill the entire rectangle regardless of aspect ratio, with no image
  asset bundled in the `.tgbl`.

  API additions:
  - `ImageSourceValue` is now a discriminated union: `{ filename } |
{ color }`. Type guards `isImageFilenameValue` / `isImageColorValue`
    are exported.
  - Dynamic input accepts a string marker
    `<STATICIMAGE_COLOR_#hex>` in `images.<key>` — the renderer paints
    the field's rect that colour. New helpers exported:
    `parseImageColorMarker`, `isImageColorMarker`, `makeImageColorMarker`.

  UI:
  - The properties panel for a solid-colour static image field shows a
    Color picker; the Fit Mode dropdown + Placeholder upload are hidden
    (irrelevant for solid fills).
  - The field-creation popup's "Solid color" button no longer generates
    a 1×1 PNG; the colour is the value.

- 8233842: Unified text-overflow contract — content NEVER crosses its rectangle on
  any surface (#91). Pre-fix the canvas could spill, the PDF appended a
  `…` ellipsis, and the properties panel had two redundant knobs
  ("Dynamic Font Size" checkbox + "Overflow Mode" dropdown).
  - **Truncate**: cuts characters from the end at a character boundary
    until the visible text fits the rect width. **No ellipsis.**
  - **Dynamic Font**: shrinks `fontSize` down to `fontSizeMin`, then
    truncates the rest at a character boundary. No ellipsis.
  - **Static text**: truncates unconditionally. The pre-#73 max-fit
    auto-grow for static text is reverted at the user's request.
  - **Schema**: `TextFieldStyle.fontSizeDynamic` removed. The single knob
    is `overflowMode`. Default flips to `'truncate'`.
  - **UI**: "Dynamic Font Size" checkbox is gone. "Min Font Size" renamed
    to "Minimum Font Size" and shown only when Overflow Mode = Dynamic
    Font.

- cb6d6fc: Init changeset

### Patch Changes

- 81ba3bc: Fix `generatePDF` errors losing field/asset context (#68). PDFKit failures
  like "Unknown image format" no longer surface as bare top-level errors —
  they now carry `fieldId`, `fieldType`, `pageId`/`pageIndex`, and either
  `jsonKey` or `assetFilename` in `error.details`, with a message that
  identifies the offending field. A new pre-flight pass sniffs PNG/JPEG
  magic bytes for every static and dynamic image before PDFKit runs and
  throws `INVALID_FORMAT` / `MISSING_ASSET` / `INVALID_DATA_TYPE` with the
  same structured context.
- 4d72275: Tables now always show their full perimeter, even when content overflows
  (#65). Pre-fix, when a table's row count exceeded the field rect (or the
  last data row would overrun the bottom edge), the rows extending past
  the rect got visually clipped along with their per-cell bottom borders,
  leaving an open-bottom table. The HTML preview wrapper now has
  `overflow: hidden` plus a `border` matching `rowStyle.borderColor` /
  `borderWidth`, and the PDFKit core renderer stamps the field-rect
  perimeter on top of any rendered rows (and at every page break in
  multi-page mode). Top, left, right, and bottom edges of the rect are
  guaranteed to render whenever the row border is non-zero.
- Updated dependencies [688f31d]
- Updated dependencies [fb662a2]
- Updated dependencies [cb6d6fc]
  - @template-goblin/types@2.0.0
