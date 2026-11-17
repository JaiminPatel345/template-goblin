# @template-goblin/core/src/render

PDFKit rendering pipeline responsible for drawing backgrounds, text elements with dynamic auto-shrinking and truncation, images with multiple fit modes, zebra-striped multi-page tables, rotated containers, hyperlinks, and page bands.

## Overview

The core PDF painting pipeline built on PDFKit. Converts parsed template fields, styles, and data inputs into vector paths, formatted typography, clipped images, repeating headers/footers, and page numbers.

## Interface

- `renderField`: Dispatches rendering for field definitions (text, image, table) based on type and z-index
- `renderText`: Renders typography with dynamic font size fitting, word wrapping, alignment, and truncation
- `renderImage`: Paints images supporting fill, contain, cover, and solid color tint modes
- `renderLoop`: Draws dynamic data tables with cell styles, borders, zebra-striping, and multi-page continuation
- `renderBackground`: Renders page-level background image or color fills
- `renderPageBackground`: Coordinates background propagation and page background inheritance
- `stampBands`: Applies repeating header and footer page bands across document pages
- `stampPageNumber`: Renders Arabic or Roman page numbers at configured placements
- `resolvePdfFontName`: Maps template font families and weights to registered PDFKit font names
- `cellRowHeight`, `mergeStyle`, `drawTablePerimeter`: Table geometry and styling calculations

## Invariants

- **Strict Bounding Box Containment (Rule 10)**: Content is clipped to its bounding rectangle and must never overflow.
- **Z-Index Stability**: Fields render in ascending `zIndex` order, using field ID as a stable tiebreaker.
- **Center Pivot Rotation**: Rotated fields pivot strictly around their center point `(x + width/2, y + height/2)` within graphics state save/restore pairs.
- **Truncation Safety**: Text truncation operates strictly at character boundaries without appending ellipsis characters.
- **Multi-page Continuation**: Dynamic tables generate continuation pages only when `heightMode: 'multipage'` (or `multiPage: true`), bounded by `meta.maxPages` when positive, or defaulting to a 500-page safety ceiling (`options.maxRenderPages ?? 500`) when `meta.maxPages === -1`. Developers can raise or disable this ceiling via `options.maxRenderPages`.
- **Structured Error Wrapping**: PDFKit rendering failures are re-thrown as `TemplateGoblinError('PDF_GENERATION_FAILED')` with field, page, and asset details.

## Side Effects

- Directly mutates the graphics buffer, stream, and page tree of the active `PDFKit.PDFDocument` instance. Zero filesystem I/O.

## Verification

- Run: `pnpm --filter template-goblin test`
