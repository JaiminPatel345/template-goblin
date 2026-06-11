# template-goblin

## 6.0.0

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

### Patch Changes

- Updated dependencies [a2aab90]
  - @template-goblin/types@2.5.0

## 5.1.0

### Minor Changes

- e237970: Single-source JSON sync, orphaned-asset sweep, and editor bug fixes.

  **template-goblin-ui**
  - The JSON panel is now a pure projection of the fields (key = `jsonKey`, value = placeholder) with per-value write-through: editing a value updates that field's placeholder — the same state the canvas and sidebar render — so the three surfaces can no longer drift. The old "pin" (`previewJsonText`), Max Fill, Format, and Reset are gone; new fields, page switches, and static↔dynamic flips always appear immediately. Dynamic text with no placeholder previews as its own jsonKey (#174).
  - Image bytes now follow a field across dynamic↔static mode flips, and the properties-panel static upload stores into the pool the renderer reads — fixes `MISSING_ASSET` ("archive does not contain that file") after switching a field to static.
  - Friendly error handling: engine errors are translated to plain-language, actionable messages; a React error boundary and global error/unhandledrejection handlers show a calm "Internal error" notice (full details in the console) instead of raw internals or a white screen.
  - One drag/resize gesture is now one undo step (was three). The Preview dialog's required-field gate and image-upload rows cover header/footer band fields. The field-creation popup's broken layout (unstyled header/rows) is fixed.

  **template-goblin**
  - `saveTemplate` sweeps orphaned image assets: only placeholder/static images referenced by the manifest's fields (body + bands) are written into the `.tgbl`, so archives no longer bloat with bytes from deleted, replaced, or mode-flipped fields.
  - New export `collectReferencedImageAssets(manifest)` (also available via the browser-safe `template-goblin/assetRefs` subpath) returns the referenced image filenames per pool.

## 5.0.1

### Patch Changes

- 834d25b: Docs: remove the "Under Construction" / "Pre-1.0" banners from the README of
  every published package — the packages are published and stable. The repo
  README gains an npm version badge in place of the construction notice.
- Updated dependencies [834d25b]
  - @template-goblin/types@2.4.1

## 5.0.0

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

### Patch Changes

- Updated dependencies [03083eb]
  - @template-goblin/types@2.4.0

## 4.0.0

### Minor Changes

- 056808f: feat(template): page-wide header, footer, and page number (#61)

  Templates can now define a page-wide **header** band, **footer** band, and
  **page number** that paint on every page (or every page except the first,
  via `applyToFirstPage`). Bands accept text and image fields, have their
  own padding / background colour / optional divider, and stamp on top of
  the body content via a buffered second pass in the PDF renderer so the
  final page count is known before they render.

  Highlights:
  - Manifest gains optional `header`, `footer`, and `pageNumber` blocks.
    Each band carries `enabled`, `style` (height, padding, background,
    divider), `fields`, and `applyToFirstPage`. Page-number config covers
    placement, alignment, colour, numeral style (`arabic`, `roman`,
    `arabic-paren`), font, font size, and `showOnFirstPage`.
  - New toolbar **Page Layout** anchored menu with `›` flyouts for
    Header / Footer / Page Number — toggle visibility from the flyout,
    open a per-band settings modal for fine controls.
  - Hide-band preserves the band's full style and migrates its fields
    into body with absolute coordinates so the user keeps editing them
    as normal elements. Show-band reclaims body fields whose bounding
    box still sits entirely inside the band's Y-strip (the user never
    moved them out) back into the band with band-local coordinates
    restored — keeps the validator clean on re-show. Fields the user
    explicitly moved out of the strip stay in body.
  - JSON Preview surfaces dynamic header/footer field keys in the same
    flat `texts` / `images` / `tables` / `links` buckets the renderer
    reads from, so canvas, JSON, and PDF stay in sync.
  - `setPageNumber` and `setPageNumberConfig` atomically enable the
    placement band so turning page numbers on (or switching placement)
    can't land in a state the validator rejects.
  - Canvas z-order: band chrome (background, divider, page-number text)
    paints below band field groups; the reconciler counts band visuals
    as ambient so a coloured band background never hides its own fields.
  - Defaults driven by QA: dividers default to disabled in both header
    and footer; when the user enables a divider it defaults to `gap: 0`
    (flush against the band edge); `pageNumber.showOnFirstPage` defaults
    to `true` so the page number is visible on a single-page template
    out of the box.
  - Renderer adds a band-stamp pass after the body loop using PDFKit's
    `bufferPages` + `bufferedPageRange` + `switchToPage`. New validator
    gates: `FIELD_OVERLAPS_BAND` when a body field intrudes into an
    enabled band's Y-strip, `PAGE_NUMBER_PLACEMENT_INVALID` when the
    chosen placement band isn't enabled, and `INVALID_MANIFEST` when
    a table-type field appears inside a band (text and image only).
    Disabled bands bypass overlap enforcement — they paint nothing at
    PDF time, so body fields living in their former Y-strip are
    legitimate page content.
  - Defence-in-depth page-dimension clamp: `setPageSize` and `updatePage`
    floor width/height at 1pt; `validateManifest` rejects non-finite or
    sub-1 page dimensions at PDF generation so a hand-edited `.tgbl` or
    a server endpoint can't crash PDFKit with a negative dimension.

  Closes #61.

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

### Patch Changes

- ef20239: fix(render): honour fontWeight, fontStyle, textDecoration, and table-cell verticalAlign

  The text + table renderers silently dropped several style flags on
  their way into the PDF stream, so the editor's Bold / Italic /
  Underline / Strikethrough / Vertical-align toggles never reached
  the rendered output even though the preview pipeline calls the
  exact same `generatePDF` an SDK consumer would.

  **Resolved gaps:**
  - **fontWeight + fontStyle in text fields** — `text.ts` called
    `doc.font(style.fontFamily)` directly, ignoring weight + style.
    Now resolves the (family, weight, style) triple to the matching
    PDFKit standard-font name (Helvetica-BoldOblique, Times-BoldItalic,
    Courier-BoldOblique, …) via the new `resolvePdfFontName` helper.
    Custom-uploaded fonts (registered via `doc.registerFont`) win —
    bold/italic variants of a custom face must come from separately
    uploaded files.
  - **fontWeight + fontStyle in table cells + headers** — `loop.ts`
    partially handled bold for body cells (`${family}-Bold` suffix)
    and ignored both flags for headers. Both code paths now use the
    same resolver.
  - **textDecoration (underline / line-through) in text fields** —
    `text.ts` did not paint either. A new `paintTextDecoration`
    helper draws the line under or through the painted run for each
    line, tracked across alignment.
  - **textDecoration in table headers** — header path only supported
    underline (no line-through). Both decorations now flow.
  - **verticalAlign in table cells + headers** — both paths landed
    at `startY + paddingTop`. Now respects 'top' / 'middle' / 'bottom'
    via the new `resolveCellTextY` helper.

  **New unit tests:** 17 covering the (family, weight, style)
  matrix across Helvetica / Times-Roman / Courier + custom fonts
  - unknown-family fallback. 7 covering the cell-vAlign formula.

  **New integration test:** `loop.vAlign.test.ts` paints a two-
  column table with one font-size-mismatched cell to create vertical
  slack inside the row, then asserts the cell text y position
  shifts top → middle → bottom in strict order with the expected
  delta.

  All 459 existing core tests still pass.

  End-to-end verified in Chrome: editor canvas + preview PDF
  render identically for bold + italic + underline.

- Updated dependencies [cd98487]
  - @template-goblin/types@2.3.0

## 3.0.0

### Minor Changes

- a006138: Add README

### Patch Changes

- Updated dependencies [a006138]
  - @template-goblin/types@2.2.0

## 2.1.0

### Minor Changes

- 740933c: Table styling expansion (#76 and follow-ups):
  - **Transparent fills and borders** — `CellStyle.backgroundColor` and `borderColor` now accept `null` as a "transparent" sentinel. Header bg, row bg, cell borders can be opted out in the right panel; the PDFKit renderer and Fabric canvas both skip the corresponding fill/stroke when null.
  - **Table-level border** — new optional `TableFieldStyle.tableBorder: { color, width }` paints the outer perimeter independently of per-cell strokes. New tables default to a 1pt black perimeter with cell strokes off. Legacy templates without `tableBorder` keep their row-derived perimeter.
  - **Fit to content** — new optional `TableFieldStyle.fitToContent` (default `true`, including for legacy templates) ends the perimeter at the last rendered row instead of stretching to the field rect's full height.
  - **Canvas parity** — Fabric preview now paints the outer perimeter using `tableBorder` and respects `fitToContent`, so right-panel edits show live; per-column align overrides are also merged over `rowStyle` so body cells align correctly on canvas.
  - **Color picker** — replaced the native `<input type="color">` (which froze the page on some browsers) with an in-page SketchPicker popover via `react-color`.
  - **UI polish** — clearer labels (Header Text Color, Header Row Background, Row Text Color, Row Background, Cell Border, Table Border), themed border on the transparent "Clear / Color" toggle, and a collapsible Columns section in the table properties panel.

### Patch Changes

- Updated dependencies [740933c]
  - @template-goblin/types@2.1.0

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
