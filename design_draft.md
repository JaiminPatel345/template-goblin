# Dynamic Table Height Modes and Single-Page Expansion

- **Author:** Jaimin Detroja
- **Status:** Draft
- **Date:** 2026-11-15

---

## Overview

TemplateGoblin generates documents from templates and JSON data. In documents like single-page invoices, summary sheets, and long transactional reports (e.g., bank statements), tables require different height handling strategies:

1. Fixed-boundary clipping for strict physical forms.
2. Single-page vertical expansion that dynamically fits arbitrary data rows onto a single extended page while preserving lower margins and side-by-side elements.
3. Multi-page pagination splitting excess rows across continuation pages with repeating headers and page backgrounds.

This design formalizes the table height mode architecture across the template schema, core rendering pipeline, and visual editor.

## The Problem

Previously, TemplateGoblin supported a binary `multiPage` flag. This created several limitations:

1. **Ambiguous Semantics**: A boolean flag conflated "paginate across continuation pages" with "expand content height". Users who wanted an invoice to expand dynamically onto a single tall page (e.g. for receipts, bills, or continuous viewing) were forced to either clip content or accept unwanted multi-page document splits.
2. **Layout Distortions Below Dynamic Tables**: When a table grew dynamically, content below it collided with expanding rows or suffered margin distortion.
3. **Multi-Table Fragility**: Templates containing side-by-side or parallel tables could not expand independently; naive height adjustments accumulated deltas sequentially, resulting in excessive blank space and shifted sidebars.
4. **Editor Friction**: The visual builder lacked clear affordances for dynamic height behavior. Designers drew static rectangles with no visual indication that the table would expand vertically at runtime.

## Goals

- **Explicit Mode Typing**: Define `TableHeightMode` (`'fixed'`, `'single_page_dynamic'`, `'multipage'`) with seamless backward compatibility for legacy `multiPage: boolean` templates.
- **Single-Page Dynamic Layout Guarantee**: Automatically calculate the required table height at PDF generation time, expand the page height accordingly, and shift lower content down to preserve design margins.
- **Side-by-Side Table Independence**: Support multiple dynamic tables on the same page such that parallel tables expand to their individual needed heights without double-counting vertical deltas.
- **Layout Isolation for Parallel Content**: Ensure elements positioned horizontally alongside dynamic tables stay anchored at their top coordinates.
- **Background Adaptation**: Automatically stretch page background images to match dynamically expanded page heights.
- **Editor Usability**: Default dynamic table creation in the visual playground directly to `single_page_dynamic`, displaying distinct boundary indicators (double-dashed line and expand badge) on the design canvas.

## Non-Goals

- **Horizontal Auto-Sizing**: Dynamic column width calculation based on cell string length is out of scope; columns retain designer-defined widths or fit-to-content proportions.
- **Cross-Page Splitting for Single-Page Dynamic Tables**: `single_page_dynamic` by definition guarantees single-page output; splitting across pages remains exclusive to `multipage`.
- **Arbitrary Element Flow Layouts**: Full CSS flexbox/grid reflow of all canvas elements is out of scope; shifting is strictly vertical push-down based on bounding box tiers.

## Open Questions

- None currently open; foundational constraints (stretch background, full-width slice push-down, cluster-based side-by-side expansion, default playground selection) were aligned during brainstorming.

---

## Critical User Journeys (CUJs)

### CUJ 1: Designing an Invoice with Single-Page Dynamic Height in the Visual Builder

- **Given**: A user is designing an invoice template in `template-goblin-ui` with a company header, an items table, a side payment QR code, and total/signature notes below.
- **When**: The user draws a new table on the canvas.
- **Then**: The creation popup pre-selects `single_page_dynamic` mode automatically. On the canvas, the table renders with double-dashed bottom boundary lines and a `⤓ Dynamic Height (Auto-expands)` badge.

### CUJ 2: Programmatic Generation with Single-Page Dynamic Expansion

- **Given**: A backend service receives a template with a `single_page_dynamic` table and a payload with 30 items.
- **When**: The service calls `generatePDF(template, data)`.
- **Then**: The layout engine calculates the exact row height, expands the table height and overall page height, preserves the side payment box at its top coordinate, shifts the total and signature fields down by the table's net expansion, and stretches the background image to cover the single tall page.

### CUJ 3: Multi-Page Statement Pagination

- **Given**: A user sets `heightMode: 'multipage'` with `maxPages: 10` on a bank statement table.
- **When**: The generator receives 200 transaction rows.
- **Then**: The table splits across multiple fixed-size pages, repeating headers and page background images on each continuation page until rows are exhausted.

---

## Technical Plan (Architecture)

### 1. Data Contracts (`packages/types`)

Extend the table styling schema with explicit height mode definitions while preserving backward compatibility:

```ts
export type TableHeightMode = 'fixed' | 'single_page_dynamic' | 'multipage'

export interface TableFieldStyle {
  heightMode?: TableHeightMode
  multiPage?: boolean // legacy fallback
  // ... other styling properties
}

export function resolveTableHeightMode(style?: {
  heightMode?: TableHeightMode
  multiPage?: boolean
}): TableHeightMode {
  if (style?.heightMode) return style.heightMode
  return style?.multiPage ? 'multipage' : 'fixed'
}
```

### 2. Dynamic Layout Engine (`packages/core/src/utils/dynamicLayout.ts`)

The layout engine executes prior to PDFKit page creation:

```text
Input Fields + JSON Data + Base Dimensions
                │
                ▼
1. Detect Dynamic Tables (heightMode === 'single_page_dynamic')
                │
                ▼
2. Group Tables into Vertical Clusters (overlapping original Y spans)
                │
                ▼
3. For Each Cluster in Vertical Order:
   - Calculate rendered height: headerHeight + (rowCount * rowHeight)
   - Set table.y = orig.y + accumulatedShift
   - Set table.height = max(orig.height, renderedHeight)
   - Determine clusterMaxNewBottom = max(t.y + t.height)
   - Calculate clusterDelta = max(0, clusterMaxNewBottom - (origBottom + accumulatedShift))
   - accumulatedShift += clusterDelta
                │
                ▼
4. Shift Non-Dynamic Fields:
   - If orig.y >= cluster.origBottom: shift += cluster.delta
   - Else (aside or above): shift += 0 (stay anchored)
                │
                ▼
5. Output Page Dimensions:
   - Page Height = baseHeight + accumulatedShift
```

### 3. Rendering Pipeline Integration (`packages/core/src/generate.ts`)

```mermaid
flowchart TD
    A["generatePDF(template, data)"] --> B["Group fields by pageId"]
    B --> C["adjustPageLayout(pageFields, data, baseWidth, baseHeight)"]
    C --> D["doc.addPage({ size: [layout.width, layout.height] })"]
    D --> E["renderPageBackground(..., { width: layout.width, height: layout.height })"]
    E --> F["Render Fields in ascending zIndex order"]
    F --> G["PDF Document Output"]
```

### 4. Visual Canvas Indicators (`packages/ui/src/components/Canvas`)

- **Field Creation**: `FieldCreationPopup` initializes `tableHeightMode` to `'single_page_dynamic'` for dynamic tables and `'fixed'` for static tables.
- **Canvas Decorators**: `tableDynamicIndicator.ts` renders non-selectable Fabric.js objects on the canvas:
  - Top and bottom dashed boundary lines (`strokeDashArray: [6, 3]`).
  - Centered bottom pill badge (`⤓ Dynamic Height (Auto-expands)`).

---

## Alternatives Considered

### Alternative A: Overloading `multiPage: boolean` Flag

- **Pros**: Requires no schema changes or enum type migrations in `@template-goblin/types`.
- **Cons**: Cannot distinguish between clipping rows at fixed height, splitting across multiple physical continuation pages, and extending a single page's height.
- **Reason for Rejection**: Rejected by author: A boolean flag creates semantic ambiguity and cannot support single-page dynamic layouts alongside multi-page pagination.

### Alternative B: Sequential Accumulation of Deltas for Parallel Tables

- **Pros**: Simple linear loop that applies `delta = renderedHeight - origHeight` for each table sequentially.
- **Cons**: If Table A needs +100pt and Table B needs +200pt side-by-side, sequential accumulation shifts lower elements by +300pt rather than +200pt, producing artificial blank space and oversized documents.
- **Reason for Rejection**: Rejected by author: Side-by-side tables must expand independently to their required heights, and lower content must only be shifted by the maximum bottom reach of the parallel cluster.

### Alternative C: Cropping or Tiling Background Images on Dynamic Expansion

- **Pros**: Preserves the original 1:1 aspect ratio of uploaded background image assets.
- **Cons**: Leaves unpainted white gaps or disjointed repetition seams on expanded documents like invoices and receipts.
- **Reason for Rejection**: Rejected by author: The background image must stretch to match the expanded page dimensions (`[layout.width, layout.height]`) to ensure seamless document appearance.

### Alternative D: Forcing Manual Mode Selection on Table Creation

- **Pros**: Forces explicit designer confirmation of table height behavior before placing the field.
- **Cons**: Adds dialog friction and slows down template design workflows.
- **Reason for Rejection**: Rejected by author: Dynamic tables should default directly to `single_page_dynamic` upon drawing, aligning with the predominant single-page dynamic invoice use case while still permitting changes via the properties panel.

---

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `packages/types/src/tableHeight.ts` (Create)

- **Type / Scope**: TypeScript Types & Resolution Helpers
- **Proposed Changes**: Introduce `TableHeightMode = 'fixed' | 'single_page_dynamic' | 'multipage'` and `resolveTableHeightMode(style)` fallback resolver to support both explicit `heightMode` and legacy boolean `multiPage`.

#### 2. `packages/types/src/table.ts` (Modify)

- **Type / Scope**: Schema Interface Definition
- **Proposed Changes**: Add optional `heightMode?: TableHeightMode` to `TableFieldStyle`.

#### 3. `packages/types/src/index.ts` (Modify)

- **Type / Scope**: Package Public Barrel Export
- **Proposed Changes**: Re-export `TableHeightMode` and `resolveTableHeightMode`.

#### 4. `packages/core/src/utils/dynamicLayout.ts` (Create)

- **Type / Scope**: Layout Computation Module
- **Proposed Changes**: Implement `computeTableRenderedHeight` and `adjustPageLayout`. Formulate interval-based vertical table clustering to support side-by-side dynamic tables, calculate net cluster expansion, shift lower elements by the cluster's maximum bottom reach, anchor aside elements, and compute total dynamic page height.

#### 5. `packages/core/src/generate.ts` (Modify)

- **Type / Scope**: PDF Rendering Orchestrator
- **Proposed Changes**: Invoke `adjustPageLayout` before initializing each PDFKit page (`doc.addPage`), pass dynamic dimensions to `renderPageBackground`, and render fields in sorted z-index order.

#### 6. `packages/core/src/render/page.ts` & `packages/core/src/render/background.ts` (Modify)

- **Type / Scope**: Page Background Rendering
- **Proposed Changes**: Accept dynamic `pageSize` override to stretch page background image buffers and solid color rectangles across the full expanded canvas height.

#### 7. `packages/ui/src/components/Canvas/FieldCreationPopup.tsx` (Modify)

- **Type / Scope**: Visual Builder Dialog
- **Proposed Changes**: Default `tableHeightMode` directly to `'single_page_dynamic'` for dynamic tables and `'fixed'` for static tables. Remove manual blocking validation errors to streamline table creation.

#### 8. `packages/ui/src/components/Canvas/TableHeightModePicker.tsx` (Create)

- **Type / Scope**: UI Segmented Selector Component
- **Proposed Changes**: Render 3-way segmented radio control allowing users to switch between Fixed, Single Page Dynamic, and Multi-Page modes with contextual tooltips.

#### 9. `packages/ui/src/components/Canvas/tableDynamicIndicator.ts` (Create)

- **Type / Scope**: Fabric.js Canvas Decorator
- **Proposed Changes**: Construct non-interactive Fabric canvas objects (double dashed lines and centered pill badge) on tables configured with `single_page_dynamic`.

#### 10. `packages/ui/src/components/RightPanel/LoopFieldProps.tsx` (Modify)

- **Type / Scope**: Properties Inspector Sidebar
- **Proposed Changes**: Provide mode toggle controls to inspect and adjust table height modes on selected canvas tables.

#### 11. `packages/core/tests/dynamicTableHeight.test.ts` (Create)

- **Type / Scope**: Core Integration Test Driver
- **Proposed Changes**: Verify single-page dynamic table expansion, element push-down, margin preservation, multi-page continuation splits, and fixed-mode row clipping.

#### 12. `packages/core/tests/sideBySideDynamicTables.test.ts` (Create)

- **Type / Scope**: Core Layout Unit Test Driver
- **Proposed Changes**: Verify side-by-side dynamic table clustering, independent row height calculation, aside element positioning, and lower element shift based strictly on maximum bottom reach.

#### 13. `packages/ui/src/components/Canvas/__tests__/tableHeightFeatures.test.ts` (Create)

- **Type / Scope**: UI Unit Test Driver
- **Proposed Changes**: Test mode resolution fallbacks, indicator rendering on Fabric groups, and default creation policies.

#### 14. Component Contract Documentation (Modify)

- **Target Paths**:
  - `packages/core/src/utils/README.md`
  - `packages/core/README.md`
  - `packages/ui/README.md`
  - `packages/types/README.md`
- **Proposed Changes**: Synchronize public interfaces, system invariants (clustering behavior, background stretching, 300-line limit compliance), side effects, and verification commands with the new height mode capabilities.

---

## Verification Plan

- **Compilation & Type Safety**:
  ```bash
  pnpm --filter @template-goblin/types type-check
  pnpm --filter template-goblin build
  pnpm --filter template-goblin-ui build
  ```
- **Core Unit & Integration Testing**:
  ```bash
  pnpm --filter template-goblin test
  ```
  Must pass all 50 test suites including `dynamicTableHeight.test.ts` and `sideBySideDynamicTables.test.ts`.
- **UI Unit Testing**:
  ```bash
  pnpm --filter template-goblin-ui test
  ```
  Must pass all 58 test suites including `tableHeightFeatures.test.ts`.
- **Code Quality & Formatting**:
  ```bash
  npx prettier --check "packages/**/*.{ts,tsx,md}"
  pnpm lint
  ```
- **Source Line Bounds**:
  No source file may exceed 300 lines (strictly enforced across decomposed components like `FieldCreationPopup.tsx`).

---

_Drafted with EGM_
