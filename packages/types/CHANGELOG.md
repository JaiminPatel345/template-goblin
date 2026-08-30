# @template-goblin/types

## 0.6.0

### Patch Changes

- ae2b7c6: docs: update license to GNU General Public License v3.0 (GPLv3)

## 0.5.2

### Minor Changes

- a2aab90: Master-QA sweep: phantom pages, band-field data loss, batch hangs, undo coverage, and WYSIWYG parity fixes.

  **template-goblin**
  - `addPage` now carries `margin: 0` — pages after the first silently got PDFKit's 72pt default margins, spilling bottom-strip content onto phantom pages and corrupting the clip state.
  - Header/footer band fields are now visible to `validateData`, preflight, `loadTemplate`, and font-subset code-point extraction — required band fields validate, band images load and render, and load→save round-trips no longer drop band assets.
  - Per-page backgrounds are written under `page.backgroundFilename` so they survive a save→load round-trip.
  - `generateBatchPDF` settles with a failure result instead of hanging forever when a worker process dies without replying; bare `Error` throws replaced with `TemplateGoblinError` (new `INVALID_ARGUMENT` code).
  - Fields rendered after a multiPage table land on their own page instead of the table's last continuation page.
  - `validateManifest` tolerates legacy manifests without a `pages` array; `loadTemplate` accepts directory-prefixed asset filenames; table header labels truncate to their cell box.

  **template-goblin-ui**
  - Band fields are first-class everywhere: `openTemplate` loads their image assets, undo/redo snapshots include bands (hiding a band then Ctrl+Z no longer loses its fields permanently), and keyboard Delete / mode toggle / duplicate work on band fields.
  - Multi-select drag/resize gestures commit to the store (previously dropped entirely — fields snapped back).
  - Canvas text wrapping mirrors the PDF renderer exactly: newlines split paragraphs and over-wide words break mid-word.
  - Properties-panel editors re-mount per field, fixing hyperlink drafts leaking across selections (which could silently overwrite or delete a field's link).
  - Footer drag/draw math uses the viewed page's own height; bands with "not on first page" no longer swallow fields drawn on page 1; File→Open resets the page view; the first action after a reload is undoable; image/font uploads are validated up front; JSON-panel table edits no longer stamp fallback strings into sparse placeholders.

## 0.5.1

### Patch Changes

- 834d25b: Docs: remove the "Under Construction" / "Pre-1.0" banners from the README of
  every published package — the packages are published and stable. The repo
  README gains an npm version badge in place of the construction notice.

## 0.5.0

### Minor Changes

- 03083eb: Text styling toolbar and WYSIWYG fixes (#167)
  - **UI:** Word/Canva-style floating selection toolbar with B/I/U/S toggles, font
    size, text colour, and text background colour, anchored to the selected text
    field. Added the same B/I/U/S group to the Format ribbon and the right panel.
  - **UI:** A rotation control in the selection toolbar — a compact trigger that
    opens a popover with a large draggable angle dial, a numeric input, and
    0/90/180/270 presets. Popovers now portal to `document.body` so they anchor
    on the canvas next to their trigger instead of drifting over the side panel.
  - **UI:** Theme toggle button on the navbar; the transparent / no-fill option
    now lives inside the colour picker.
  - **Types:** `TextFieldStyle.backgroundColor` for an optional text background.
  - **Core:** Render a text field's background colour, clip text to its box, and
    optically centre text (including overflowing text) so the generated PDF
    matches the canvas. Dropped the 6px text inset for true WYSIWYG.

## 0.4.0

### Minor Changes

- cd98487: feat(canvas): rotate any element via sidebar Angle input + canvas handle (#172)

  Adds `rotation` to every field type and surfaces it through both an
  "Angle (°)" input in the LeftPanel properties editor and Fabric's
  selection rotation handle. The two are kept in two-way sync, both
  pivot around the field's unrotated centre, and the rotation
  round-trips through `.tgbl` save/load and the PDF render path.

  Schema (@template-goblin/types)
  - `FieldBase.rotation?: number | null` — degrees, around the rect
    centre. `null` / `undefined` / `0` all render unrotated, so
    pre-rotation templates continue to load.

  UI (template-goblin-ui)
  - LeftPanel "Angle (°)" input; canvas rotation handle exposed on
    every field type (text, image, table).
  - Sidebar and canvas-handle inputs both pivot around the unrotated
    centre — no visual translation when angle changes. Schema
    invariant `(x, y) = unrotated top-left` survives every gesture.
  - Angles are normalised to `[0, 360)` at every consumer boundary so
    huge inputs (e.g. accidental pastes) don't cause Fabric's
    selection border to drift off the rendered content.
  - Bonus fix: clicking a solid-colour image field no longer paints
    its bgRect with the selection emphasis fill — the user's chosen
    colour is preserved, emphasis switches to stroke only.

  PDF renderer (template-goblin)
  - `renderField` wraps each draw block in `doc.save() / doc.rotate(angle,
{ origin: [cx, cy] }) / doc.restore()` when rotation is non-zero.
    Origin matches the UI's centre-pivot so canvas preview and
    generated PDF agree pixel-for-pixel.

  Closes #172. Supersedes #33.

## 0.3.0

### Minor Changes

- a006138: Add README

## 0.2.1

### Minor Changes

- 740933c: Table styling expansion (#76 and follow-ups):
  - **Transparent fills and borders** — `CellStyle.backgroundColor` and `borderColor` now accept `null` as a "transparent" sentinel. Header bg, row bg, cell borders can be opted out in the right panel; the PDFKit renderer and Fabric canvas both skip the corresponding fill/stroke when null.
  - **Table-level border** — new optional `TableFieldStyle.tableBorder: { color, width }` paints the outer perimeter independently of per-cell strokes. New tables default to a 1pt black perimeter with cell strokes off. Legacy templates without `tableBorder` keep their row-derived perimeter.
  - **Fit to content** — new optional `TableFieldStyle.fitToContent` (default `true`, including for legacy templates) ends the perimeter at the last rendered row instead of stretching to the field rect's full height.
  - **Canvas parity** — Fabric preview now paints the outer perimeter using `tableBorder` and respects `fitToContent`, so right-panel edits show live; per-column align overrides are also merged over `rowStyle` so body cells align correctly on canvas.
  - **Color picker** — replaced the native `<input type="color">` (which froze the page on some browsers) with an in-page SketchPicker popover via `react-color`.
  - **UI polish** — clearer labels (Header Text Color, Header Row Background, Row Text Color, Row Background, Cell Border, Table Border), themed border on the transparent "Clear / Color" toggle, and a collapsible Columns section in the table properties panel.

## 0.2.0

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
