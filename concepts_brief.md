# Multipage Table Dynamic Pagination and Subsequent Page Staging

- **Author:** Jaimin Detroja
- **Date:** 2026-11-17

## Overview

TemplateGoblin enables authors to visually layout PDF templates on a design canvas. During design time, a page containing a multi-page table (`heightMode: 'multipage'`) represents a single authoring archetype page. At runtime, when data is injected via JSON, the table dynamically expands into continuation pages to accommodate all rows without arbitrary page ceilings (`meta.maxPages: -1`). All subsequent designed template pages, as well as page elements placed below the table on the same authoring page, are strictly staged after the table completely finishes rendering.

## Analysis

### 1. The `MAX_PAGES_EXCEEDED` Failure Mode & Resolution

- Currently, the template store and on-disk manifest default `meta.maxPages` to `1`. In `packages/core/src/render/loop.ts`, `renderLoop` increments `currentPage` on each continuation page break and checks:
  ```ts
  if (currentPage > meta.maxPages) {
    throw new TemplateGoblinError('MAX_PAGES_EXCEEDED', ...)
  }
  ```
- Because `defaultMeta.maxPages` is `1`, injecting any data that exceeds the first page immediately triggers `MAX_PAGES_EXCEEDED`, blocking preview and generation.
- **Resolution**: Setting `meta.maxPages = -1` (unbounded dynamic pagination) when at least one table field has `heightMode === 'multipage'` (or legacy `multiPage === true`). In `loop.ts`, `meta.maxPages !== -1 && currentPage > meta.maxPages` bypasses the ceiling check when `-1`.
- **Safety Ceiling in `generatePDF` (`options.maxRenderPages ?? 500`)**: To protect against runaway loops, infinite data, or memory exhaustion, multi-page rendering applies a default safety ceiling of 500 pages (`options.maxRenderPages ?? 500`). Developers can easily raise or remove this limit at runtime via `generatePDF(template, data, { maxRenderPages: 1000 })` or `{ maxRenderPages: Infinity }`.

### 2. Multi-Page Staging Pipeline in `generatePDF`

In `packages/core/src/generate.ts`:

- The old implementation had an issue at lines 173–179 where it forcibly called `doc.switchToPage(thisPageIndex)` (the very first page of the table) after rendering each field. This caused trailing fields to collide onto the first page of table rows.
- **Resolution**:
  1. Fields on an authoring page are partitioned relative to the multipage table:
     - `beforeTable`: Fields whose Y position is before/above the table (`y < table.y + table.height`). These render on the table's starting page.
     - `table`: The multipage table begins rendering on the starting page and creates continuation pages via `doc.addPage()` until all rows are painted.
     - `afterTable`: Fields whose Y position is below the table (`y >= table.y + table.height`). These are rendered on the table's _final continuation page_, positioned below the table's final row (`finalY + deltaY`).
  2. If trailing elements overflow the remaining height on the final continuation page, a clean continuation page is spawned to contain them, preventing clipping.
  3. The active document pointer is maintained at the terminal page (`doc.switchToPage(doc.bufferedPageRange().count - 1)`). Consequently, any subsequent authoring page defined in `manifest.pages` (e.g., Page 2, Page 3) appends strictly _after_ the preceding multi-page table and its trailing elements have completely finished.

### 3. Repeated Elements Across Continuation Pages

- **Template Bands**: `stampBands` in `packages/core/src/render/bands.ts` iterates over the entire document buffer (`doc.bufferedPageRange()`). Header bands, footer bands, and page numbers automatically repeat across all continuation pages.
- **Table Column Headers**: When `showHeader` is true, `renderLoop` in `packages/core/src/render/loop.ts` re-renders the table header row at the top of each new continuation page.

## Goals vs. Non-Goals

- **In-Scope Goals:**
  - Auto-set `meta.maxPages = -1` when at least one table has `heightMode === 'multipage'`.
  - Update `loop.ts` to treat `meta.maxPages === -1` as strictly unbounded pagination based on row count.
  - Return `{ finalY: number, pageCount: number }` from `renderLoop` and `renderField`.
  - Ensure trailing elements on the same page as a multipage table render at the end of the table on its final continuation page.
  - Ensure subsequent pages in `manifest.pages` are appended cleanly after the multi-page table and its page elements complete.
  - Verify template Header/Footer bands and table column headers repeat on all continuation pages.
  - Update UI store, preview pipeline (`runCorePreview` / `templateToLoaded`), and types to support `meta.maxPages = -1`.

- **Out-of-Scope Non-Goals:**
  - Rendering multiple multi-page tables side-by-side on the exact same Y coordinates (side-by-side tables are handled under `single_page_dynamic` mode).
  - Shrinking or modifying font sizes in `multipage` mode (multipage preserves font size and paginates rows).

## Alternatives Weighed

- **Alternative 1: Static maxPages default bump (e.g. maxPages = 50)**:
  - _Rejected by author_: Arbitrary numbers still fail when a large dataset (e.g., bank statements with 100+ pages) is provided. Setting `meta.maxPages = -1` explicitly signals unbounded pagination for multi-page tables.
- **Alternative 2: Remove maxPages entirely from schema**:
  - _Rejected by author_: Removing `maxPages` breaks backward compatibility with existing serialized `.tgbl` manifests and SDK contracts. Supporting `-1` preserves schema integrity while supporting unbounded rows.

## Key Decisions & Staging for Next Steps

1. **Manifest Contract**: When any table has `heightMode === 'multipage'` (or `multiPage: true`), `meta.maxPages` is set to `-1`.
2. **Core Rendering Contract & Safety Ceiling**: `generatePDF` applies a default safety ceiling of 500 pages (`options.maxRenderPages ?? 500`) when `meta.maxPages === -1`. Developers can raise or disable this limit by passing `{ maxRenderPages: 1000 }` or `{ maxRenderPages: Infinity }`.
3. **Page Staging Pipeline**: `generatePDF` in `packages/core/src/generate.ts` advances the document page index so that subsequent pages from `manifest.pages` always append strictly after all continuation pages of preceding tables.
4. **Trailing Elements Placement**: Trailing elements positioned below a multipage table render on the table's final continuation page, shifted down by the delta of the table's final row.
