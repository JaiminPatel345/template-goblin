# Dynamic Table Height Modes and Single-Page Expansion

- **Author:** Jaimin Detroja
- **Date:** 2026-11-15

## Overview

TemplateGoblin table fields support distinct height modes to address different document generation use cases:

1. **Fixed Height (`'fixed'`)**: The table stays within its drawn boundary; extra rows that exceed the rectangle are clipped. Ideal for fixed layouts like certificates or constrained forms.
2. **Single-Page Dynamic Height (`'single_page_dynamic'`)**: Selected by default when drawing dynamic tables on the visual playground. Based on input rows, the table and page expand vertically to fit all data on one single page. Lower elements shift down preserving exact margins; elements alongside the table remain anchored at their positions; background images stretch to fit the expanded page.
3. **Multi-Page Table Flow (`'multipage'`)**: Traditional pagination splitting table rows across continuation pages with repeating headers and background images when rows exceed the drawn boundary (e.g., multi-page bank statements).

## Analysis

### Vertical Expansion and Shifting Mechanism

- **Independent Expansion for Side-by-Side Tables**: When multiple dynamic tables share overlapping vertical tiers (side-by-side or parallel layouts), each table expands to its required height independently. The shorter table leaves its remaining column space blank without distorting the layout.
- **Unified Shift for Lower Elements**: The shift applied to elements positioned below dynamic tables (`y >= origBottom`) is governed by the maximum bottom reach across the parallel table cluster (`cluster_delta = max(table_new_bottom) - cluster_orig_bottom`), preventing duplicate delta accumulation.
- **Aside Elements Preservation**: Any elements created at the same level or alongside dynamic tables horizontally (`y < cluster_orig_bottom`) remain anchored at their original positions.
- **Background Image Scaling**: Page background images automatically stretch to cover the dynamic page dimensions (`[layout.width, layout.height]`) in both single-page and multi-page configurations.

### Visual Ergonomics on Canvas

- Dynamic tables render with distinct visual indicators on the canvas: double dashed boundary lines at the bottom edge and a centered indicator badge (`⤓ Dynamic Height (Auto-expands)`).
- When drawing a new table, dynamic mode defaults directly to `single_page_dynamic` while static tables default to `fixed`.

## Goals vs. Non-Goals

- **In-Scope Goals:**
  - `TableHeightMode` type support (`'fixed'`, `'single_page_dynamic'`, `'multipage'`) with backward-compatibility fallback to `multiPage: boolean`.
  - Cluster-based vertical layout adjustment in `adjustPageLayout` handling single, stacked, and parallel/side-by-side dynamic tables.
  - Automatic page height expansion and background image stretching for dynamic single-page documents.
  - Visual indicator rendering on canvas for dynamic tables.
  - Default selection of `single_page_dynamic` in visual builder table creation.

- **Out-of-Scope Non-Goals:**
  - Horizontal auto-expansion of columns (columns preserve configured widths or fit-to-content proportions).
  - Cross-page split for `single_page_dynamic` mode (by definition, it guarantees single-page output).

## Alternatives Weighed

- **Overloading `multiPage: boolean`**: Rejected. A boolean cannot cleanly distinguish between clipping at fixed height, splitting across multiple pages, and expanding a single page's height.
- **Sequential Accumulation of Deltas for Parallel Tables**: Rejected. Summing deltas of side-by-side tables pushes lower elements down by more than the longest table's actual bottom reach, producing excess blank space.
- **Cropping Background Image on Dynamic Page**: Rejected by author. Background images must stretch to match the expanded page height.

## Key Decisions & Staging for Next Steps

- **Core Algorithm**: Implemented cluster-based vertical interval merging in `packages/core/src/utils/dynamicLayout.ts`.
- **UI Default**: `FieldCreationPopup` initializes `tableHeightMode` to `single_page_dynamic` for dynamic tables.
- **Verification**: Covered by `dynamicTableHeight.test.ts`, `sideBySideDynamicTables.test.ts`, and `tableHeightFeatures.test.ts`.
