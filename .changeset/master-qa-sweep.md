---
'@template-goblin/types': minor
'template-goblin': minor
'template-goblin-ui': patch
---

Master-QA sweep: phantom pages, band-field data loss, batch hangs, undo coverage, and WYSIWYG parity fixes.

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
