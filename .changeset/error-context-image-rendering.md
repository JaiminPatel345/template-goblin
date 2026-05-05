---
'template-goblin': patch
---

Fix `generatePDF` errors losing field/asset context (#68). PDFKit failures
like "Unknown image format" no longer surface as bare top-level errors —
they now carry `fieldId`, `fieldType`, `pageId`/`pageIndex`, and either
`jsonKey` or `assetFilename` in `error.details`, with a message that
identifies the offending field. A new pre-flight pass sniffs PNG/JPEG
magic bytes for every static and dynamic image before PDFKit runs and
throws `INVALID_FORMAT` / `MISSING_ASSET` / `INVALID_DATA_TYPE` with the
same structured context.
