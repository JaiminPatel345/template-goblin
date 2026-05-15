# template-goblin-ui

## 2.3.0

### Minor Changes

- 98fd283: feat(canvas): smart alignment guides while moving fields (Canva/PowerPoint-style)

  Render transient pink/cyan guide lines while a field is being dragged when its
  edges or centre align with another field's edges/centre or with the page
  edges/centre. Magnetic snap within 6 pt (zoom-aware, clamped to 6–24 pt).
  Equal-spacing bracket marks appear when the active field sits between two
  others with matching gaps. Hold Alt to disable snapping. Guides disappear on
  mouse release.

  Resize-time snap is intentionally deferred — guides render visually during
  resize but the active field's scale is not mutated. (#41)

## 2.2.0

### Minor Changes

- a006138: Add README

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

- 71e441e: Migrate the editor canvas from Konva / react-konva to Fabric.js v6.

  The canvas render layer has been rewritten end-to-end:
  - `react-konva` and `konva` removed; `fabric@^6` added.
  - `CanvasArea.tsx` reduced to a slim orchestrator that composes new hooks:
    `useFabricCanvas` (lifecycle + event wiring), `useFabricSync`
    (store↔canvas reconciliation, background, grid, zoom, resize observer),
    `useCanvasKeyboard` (shortcuts), and `usePageHandlers` (page CRUD,
    uploads, creation popup).
  - Sub-components extracted to their own files: `OnboardingPicker.tsx`,
    `AddPageDialog.tsx`, `PageBar.tsx`.
  - New helpers in `fabricUtils.ts`: `createFieldGroup`, `applyFieldToGroup`,
    `groupToFieldPatch`, `buildGridLines`, `centreViewport`, `fitZoomLevel`,
    `loadFabricImage`, `snap`, `toPagePt` / `fromPagePt`.
  - Module augmentation in `fabric.d.ts` attaches `__fieldId` / `__fieldType`
    / `__isGrid` to `FabricObject` for the canonical canvas↔store join key.
  - Selection / drag / resize / multi-select now use Fabric built-ins:
    `selectable`, `hasControls`, `preserveObjectStacking`, `ActiveSelection`,
    with `object:modified` as the single authoritative commit point. The
    shift+click multi-select bug (delta-only `opt.selected` mis-applied as
    full active set) is fixed by reading `canvas.getActiveObjects()` instead.
  - Pan: space + left-drag, middle-mouse-drag, plain wheel scroll.
  - Zoom: Ctrl/Cmd + wheel zoom-at-cursor, Ctrl/Cmd + 0 fit, Ctrl/Cmd + 1 reset.
  - Schema (`@template-goblin/types`) and PDF generator (`template-goblin`) are
    untouched. PDFs still emit real vector text glyphs (selectable / searchable)
    via PDFKit. The `.tgbl` archive format is unchanged.

  Spec updates: `specs/009-ui-canvas.md`, `specs/002-template-schema.md`,
  `docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md` §13.
  GH issue: #8.

  Playwright e2e coverage: 62 parameterised tests
  (`selection-and-move.spec.ts` — 1..5 fields × text-only + mixed types ×
  selection / drag / resize / multi-select / left-panel / right-panel),
  all green serial. Existing Vitest unit tests untouched (305 passing).

### Minor Changes

- f993c14: Add Page dialog UX (#47):
  - "Same as previous page" no longer routes through the size step. The
    new page commits immediately with the previous page's dimensions —
    consistent with what the option's label implies.
  - The size picker labels are country-neutral: "US Letter" / "US Legal"
    → "Letter" / "Legal". The underlying `PageSize` keys are unchanged.
  - Picking "Custom" no longer grows the dialog. The width/height inputs
    reserve their bounding box at all times (visibility-hidden,
    pointer-events-none, tab-skipped, aria-hidden when not selected) so
    the parent dialog stays anchored. The dialog also carries an explicit
    `minWidth` / `minHeight` so step transitions don't reflow the modal
    either.
  - When the user picks Image upload, the size picker now opens with a
    "Match image (W × H pt)" radio at the top, pre-selected with the
    uploaded image's natural pixel dimensions. That's the most sensible
    default for an image-bg page (no scaling, no crop, native aspect
    ratio).

- f1a9f33: Change Background button (#58):
  - Renamed the toolbar "BG" button to "Change Background" with a tooltip.
  - Clicking it now opens the same modal as "+ Add Page" (image / solid
    color / inherit) instead of going straight to a file picker. The
    user can change the current page's background to any of the three
    kinds, not only an image.
  - Fixed: changing to a new image now actually updates the canvas. The
    pre-fix path called the legacy `setBackground` action, which writes
    only `backgroundDataUrl` / `backgroundBuffer`; multi-page templates
    read per-page bytes from `pageBackgroundDataUrls`, so the canvas
    silently kept showing the old image. The new handler updates the
    current page entry via `updatePage` + `setPageBackground`.
  - In Change Background mode, the size step's "Same as previous"
    radio now reads "Same as Current (W × H pt)" — the radio's value is
    the current page's size in this flow, so "previous" was the wrong
    word. The Add Page flow keeps "Same as previous".

- 9e89550: Add a "Format" button to the right-panel JSON Preview header (#85). One click pretty-prints the textarea content with 2-space indentation; `Cmd/Ctrl+Shift+F` does the same from inside the textarea. Invalid JSON surfaces a brief inline error below the textarea (auto-clears after ~3 s) and leaves the user's edits untouched. Clicking Format on the unpinned auto-generated baseline is a no-op so the preview keeps tracking subsequent field-add / field-edit events on the canvas. Multi-line textareas in the right panel no longer auto-select-all on focus, so users can click in to edit one value without the buffer being wiped on the next keystroke.
- 1e13011: Static and placeholder field labels now render at the largest font size that fits their bounding rectangle and re-fit automatically when the field is resized. The previous implementation clipped labels to a sliver of their intended area (users saw "tiny vertical lines" instead of real text). Switched from `FabricText` + `clipPath` to a centred `Textbox` that wraps to the rect's width, with the font-size ceiling raised so big rects get big type. Closes #12.
- 17991be: Replace the auto-trigger Preview flow with an interactive dialog (#45).
  Clicking Preview now opens a modal that pre-fills a JSON editor with the
  same default values the auto-trigger used and lists every dynamic image
  field for optional file replacement (PNG / JPEG / WEBP, ≤10 MB). The
  existing render pipeline (`generatePreviewHtml`) runs only on Render and
  opens the result in a new tab as before. The JSON editor validates on
  input — Render is disabled while parse errors are present, and renderer
  errors surface inline instead of via `alert()`. ESC, click-outside, ✕
  close button, and Cancel all dismiss without rendering. Reset to
  defaults restores the auto-generated JSON.
- 38d85e7: Selected fields now show unmistakable visual feedback in both the canvas and the toolbar. On the canvas the field's background rect darkens (or the stroke widens for transparent-fill fields like static / image-with-placeholder) and switches to the per-type accent. In the toolbar, the Text / Image / Table button for the selected field's type flips to its full active state (solid accent background, white text) — identical weight to the drawing-tool-active state — so you can always see which field type is in play. Multi-type selection lights up multiple buttons simultaneously. Closes #10.
- 04309d0: Sidebar layout restructure. The styling / properties editor now lives in the **left** sidebar (it used to be on the right) and the structural tree — field + group list, JSON preview, and PDF size estimate — now lives in the **right** sidebar. Two hamburger buttons in the toolbar (one at each end) fully collapse the matching panel, and the canvas expands to fill any freed width. Selecting a field still auto-opens the panel that contains its properties; the collapse state persists across reloads via the existing `uiStore` persist. Closes #19.
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

- c51726f: Properties panel now matches the field type × mode matrix and stays in sync with the canvas + JSON preview.
  - **GH #25 — sync.** The canvas label honours the field's own `style` (font family, size, weight, italic, underline, color, alignment, line-height) so editing any of these in the properties panel re-renders the field on the canvas immediately. The JSON preview now surfaces a dynamic field's `placeholder` as the example value (text string, image filename) so what you see in the panel matches the preview.
  - **GH #26 — mode toggle.** Every field's properties panel now starts with a Static / Dynamic toggle. Flipping it migrates the user's content across — `value ↔ placeholder` for text and image, the row array for tables — so nothing is silently lost. Static fields show a literal `Value` input; dynamic fields show `JSON Key` / `Required` / `Placeholder`. Auto-fit font size and Min Font Size are hidden on static text (they only matter for variable-content rows). Image fields, static or dynamic, never show font controls.

  Closes #25, closes #26.

- 5f6dc2f: Table fields now stay in sync with the right-panel properties (#38).
  The canvas draws a column grid (one vertical divider per column boundary,
  scaled proportionally to declared widths) plus a header band with
  per-column labels — adding, editing, removing, or reordering columns
  produces visible feedback on the next reconcile. Header style edits in
  the properties panel — `fontFamily`, `fontSize`, `fontWeight`,
  `fontStyle`, `textDecoration`, `color`, `backgroundColor`, `borderColor`,
  `borderWidth`, `align`, `paddingLeft`, `paddingRight` — flow through to
  the rendered header band. The JSON preview pane was already reactive;
  the canvas catching up closes the sync gap.

  Side-panel UX polish: clicking (or tabbing) into any input inside the
  properties / structure panels now auto-selects the existing value, so
  the next keystroke replaces it instead of appending. Click-and-drag
  selections are preserved (only collapsed-caret focuses trigger
  select-all).

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

- 4707da8: The canvas reflects the right-panel JSON in real time (#79). Pre-fix the
  canvas reconciler rendered every field from design-time defaults — it
  never consulted `previewJsonText` or the auto-generated example. So
  adding rows to the JSON didn't grow the table on the canvas, editing a
  text value didn't repaint, and a freshly-added table painted "however
  many rows visually fit" instead of the 1 row in JSON. Now editing the
  JSON textarea updates the relevant field on the next render frame:
  text labels pull from `data.texts[jsonKey]`; tables render
  `data.tables[jsonKey]` rows clipped to `min(data length, maxRows,
rows-that-fit-in-the-rect)` per Hard Rule #10. Mid-edit unparseable
  JSON keeps the canvas non-blank via a last-good cache.
- 94a94b9: Native horizontal + vertical scrollbars on the canvas viewport when the
  page exceeds the visible area (#66). Pre-fix, zooming past fit just
  clipped the page off-screen and only space+drag pan (undiscoverable to
  plain users) could reach the hidden edges. The Fabric canvas is now
  sized to `pageWidth × zoom × pageHeight × zoom` inside an
  `overflow: auto` container, so the browser draws scrollbars natively and
  mouse wheel / shift+wheel / trackpad two-finger scroll all work. Space
  - drag pan keeps working — it now drives the container's
    `scrollLeft`/`scrollTop` so it tracks the scrollbar position. Window
    resize while zoomed in preserves the user's zoom and scroll position
    (only sub-fit zooms recompute).

- 022d2d4: Default new fields, columns, and preview fallbacks to centre alignment (#39). New text and table fields are now created with `align: 'center'` + `verticalAlign: 'middle'`. Adding a new column to a table stamps the same centred alignment explicitly so the sidebar and the rendered cell agree from the first paint. Existing templates loaded from disk are untouched — only newly-created fields/columns pick up the new default.
- df15e3d: Default canvas zoom to 100% on canvas mount and on every page switch / page-meta change (#84). Previously the canvas auto-fit-zoomed to the viewport, which caused the displayed zoom indicator to lie about the real paint size and made the +/- controls jump to whatever Fabric was actually rendering at. The reset effect now resizes the canvas synchronously to `meta.width × meta.height` so the indicator and the painted canvas always agree.
- f953bf3: Dynamic text fields are now WYSIWYG with the PDF (#73). Before, a dynamic
  text field with `fontSize: 12` rendered on the canvas at the auto-fit max
  size (often well above 12pt) while the sidebar showed 12 and the PDF
  printed 12 — three sources of truth, two of them wrong. The canvas and
  HTML preview now render dynamic text at the authored `fontSize`, never
  auto-growing past it. New fields default to `fontSizeDynamic: false` so
  authoring is honest from the first paint; users opt in to runtime
  shrinking when they expect overflow on real data. Editing `fontSize`,
  `maxRows`, or `lineHeight` from the properties panel no longer silently
  resizes the rect for dynamic fields — the author-drawn rectangle is
  preserved. Static text keeps the existing auto-fit-to-content behaviour.
- 72cf1cc: Fix the canvas appearing invisible on a first-time visit until a page refresh. The root cause was that `useFabricSync`'s effects (ResizeObserver in particular) depended on stable `RefObject` identities for the container and canvas, so when the onboarding picker unmounted and the canvas subtree mounted in its place, the observer stayed bound to the orphaned onboarding `<div>` and never reported the real canvas container's dimensions — Fabric kept its 800×600 fallback instead of resizing to the actual container. The Fabric canvas instance and container element are now mirrored into React state; every effect that used to depend on the ref objects now depends on those state mirrors, so they correctly re-run when the DOM swaps. Closes #17.
- 6bd5a10: Keep image fields anchored to their declared `(x, y)` when the user
  switches between pages and returns (#54). Previously the `FabricImage`
  child of any image field collapsed to the page's upper-left after a
  page-switch round-trip, only snapping back when the user clicked an
  element. The fix unifies the async image-load swap between
  `createFieldGroup` and `applyFieldToGroup` behind a shared
  `swapPlaceholderForImage` helper that performs the reset-to-origin →
  add → restore-position dance in both code paths. Adds an e2e regression
  suite asserting every field type stays put across multi-page navigation.
- 321d6ed: Fix `QuotaExceededError` when uploading a real-world image as a template background. The Zustand persist adapter used to serialise every image / font buffer into localStorage as base-64, duplicating bytes already stored in the matching `*DataUrl(s)` fields and trivially breaching the ~5 MB localStorage quota on the first real photo. The image buffers (`backgroundBuffer`, `pageBackgroundBuffers`, `staticImageBuffers`) are no longer written — they are reconstructed from their data-URL counterparts on rehydration so save-to-`.tgbl` and canvas rendering continue to see the ArrayBuffers they need. The setItem path also now catches storage failures and falls back to a minimal payload instead of throwing through Zustand. Closes #11.
- eeb8357: Fix a page-close bug where closing one image-backed page appeared to close every other page too. The canvas background resolver only handled the legacy/solid-colour cases when `currentPageId === null`; after `removePage` the handler set `currentPageId` back to null, and if the remaining page had an image background it was never surfaced — the user saw a blank canvas and read it as "both pages closed, back to onboarding." The resolver now also looks up an explicit `pages[0]` image when no current page is selected, and `handleRemovePage` now lands on whichever page ends up at index 0 instead of dropping to null. New store-level test matrix exercises every two-page background combination (colour/colour, colour/image, image/colour, image/image) × which tab is closed, plus a three-page "close middle" sweep. Closes #23.
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

- 6c0092f: Fix placeholder-bitmap save→reopen round-trip (#50) and make the Image Settings Upload buttons visible at rest.
  - `openTemplate` now resolves placeholder bitmaps at `placeholders/<filename>` (matching where `saveTemplate` writes them) with a fallback to the bare path for legacy archives. Previously the loader looked at the bare filename only, so a `.tgbl` opened in a clean browser session lost every placeholder, the canvas fell back to filename text instead of the bitmap, and a re-save propagated the missing bytes downstream.
  - Both Upload buttons under "Image Settings" (static value picker and dynamic placeholder upload) now have a visible border + tertiary background so they look like buttons at rest. They previously used the bare `tg-btn` class which is fully transparent until hover.

- 2a9716f: The right-panel JSON preview and the Preview dialog now share a single
  edited JSON across both surfaces (#78). Previously the right-panel
  textarea kept the user's edits in local component state, so opening
  Preview re-ran `generateExampleJson` and showed the auto-generated
  example again — the user's edits silently vanished. The text now lives
  in `uiStore.previewJsonText` (transient, not persisted): both
  components read from it, both write to it, and the Preview dialog's
  Reset button clears the pin so both surfaces revert to the
  auto-generated example. The right panel grows a `Reset` button that
  appears once the user has pinned a value.
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
- 19def61: Fix canvas zoom / scrollbar behaviour on page refresh and persist the user's zoom level across reloads (#84 follow-up).
  - Drop the ResizeObserver-driven auto-fit zoom — with #84's "default 100%" rule, the observer's "snap back to fit when current ≤ fit" behaviour was hiding the page's natural overflow on refresh, so scrollbars never appeared even when the page was bigger than the viewport.
  - Drop the zoom-sync effect's `fc.getZoom() === store.zoom` early-return — on a fresh refresh both read 1 by default, so the equality skipped the very `setDimensions(meta × 1)` call that gives the canvas its real size. The effect now resyncs `meta × zoom` on every dep change unconditionally.
  - Persist `zoom` in `uiStore` and skip the GH #84 reset on the very first valid post-hydration run, so reloading the editor restores the canvas at whatever zoom you were last viewing instead of snapping to 100%.
  - Remove `useFabricCanvas`'s post-mount `requestAnimationFrame` block; canvas dimension / zoom is now fully owned by the zoom-sync effect, so there's no second writer to fight the persisted zoom on mount.
