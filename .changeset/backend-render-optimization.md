---
'template-goblin': minor
'template-goblin-ui': patch
---

Backend render optimization: faster generation at scale plus canvas↔PDF parity fixes.

**template-goblin**

- New static/dynamic split API: `prepareTemplate(template)` renders the static layer (backgrounds, static fields/images, band chrome, page numbers) once into an in-memory base, and `generatePreparedPDF(prepared, data)` renders only the dynamic fields onto a transparent overlay composited over a copy of that base — the static image streams are byte-copied, never re-decoded. ~28% faster per call on asset-heavy templates. Safe by construction: the fast path runs only when provably equivalent to a full render (gated on no multiPage table, no dynamic hyperlink, static-below-dynamic z-order, and some static content to cache) and otherwise falls back transparently to `generatePDF`.
- `generateBatchPDF` now uses a persistent worker pool instead of forking a fresh process per PDF (~314ms Node + PDFKit startup each). Workers deserialize the template once and stream jobs; per-job failures keep the worker alive, whole-pool death drains to failures instead of hanging. ~4.4× faster on a 50-PDF batch, and workers adopt the prepared path lazily so the wins compound.

**Canvas↔PDF parity fixes (both renderers)**

- Table zebra striping (`oddRowStyle` / `evenRowStyle`) is now honored — previously dead in both the canvas and the PDF renderer.
- Table cell vertical-align (top/middle/bottom), per-column header style, and single-line cell overflow now match the PDF: the canvas was centering and wrapping where the PDF aligns and truncates.
- Image `fit` with a missing/malformed value now falls back to `contain` instead of rendering a blank box in the PDF.
- Text background corners are square when a user fill is set (matching the PDF), and the page-number stamp resolves its font through the safe font-name path.
