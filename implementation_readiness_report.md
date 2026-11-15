# Implementation Readiness Review Report: Dynamic Table Height Modes

**Target Document**: `docs/designs/dynamic_table_height_modes.md`  
**Target Scope**: Lines 176–284 (`## Detailed Implementation Plan` through `## Verification Plan`)  
**Target Standard**: `implementation-readiness-standard.md`  
**Review Swarm**: `egm-implementation-readiness`, `egm-codebase-details`, `egm-style`  
**Status**: 🔴 **FAILED** (2 Blockers, 5 Majors, 5 Nits)

---

## Executive Summary

The Detailed Implementation Plan outlines the necessary conceptual components, but fails the **Zero-Decision Rule** and **Phasing & Checkpoints** requirements of the `Implementation Readiness Standard`. Key architectural contracts, concrete file allowlists, component responsibilities, and specific test scenarios must be made explicit so that an implementing engineer or fresh agent can execute without making independent design decisions.

---

## Findings Summary

| ID        | Reviewer                                                | Severity   | Affected Scope     | Title / Summary                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------- | ---------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **IR-01** | `egm-implementation-readiness` / `egm-codebase-details` | 🔴 Blocker | Lines 176–254      | **Missing Phasing & Build Checkpoints** (Flat unpartitioned list of 14 tasks with no sequential dependency hierarchy or intermediate build/test verification checkpoints)                                                                    |
| **IR-02** | `egm-implementation-readiness` / `egm-codebase-details` | 🔴 Blocker | Lines 178–254      | **Incomplete File Boundary & Allowlist** (Omission of required files: `tableCanvasParts.ts`, `useFieldCreationPopup.ts`, `FieldCreationTypes.ts`, `TableHeightHelpModal.tsx`, `template.ts`)                                                 |
| **IR-03** | `egm-implementation-readiness` / `egm-codebase-details` | 🟡 Major   | Lines 195–204      | **Zero-Decision Violations in Core Layout Contracts** (Missing explicit TypeScript signatures for `adjustPageLayout` and `computeTableRenderedHeight`, missing mutation contract, and omitted reuse of `cellRowHeight` from `tableStyle.ts`) |
| **IR-04** | `egm-implementation-readiness`                          | 🟡 Major   | Lines 205–209      | **Ambiguous Background Rendering API Signatures** (Unclear parameter changes for `renderPageBackground` / `renderBackground` override)                                                                                                       |
| **IR-05** | `egm-codebase-details`                                  | 🟡 Major   | Lines 225–229      | **Unstated Synchronization Invariant in Inspector** (`multiPage` legacy boolean must be kept synchronized when mutating `heightMode`)                                                                                                        |
| **IR-06** | `egm-implementation-readiness` / `egm-codebase-details` | 🟡 Major   | Lines 210–214      | **Ambiguous Statement Contradicting Dialog Validation** ("Remove manual blocking validation errors" is misleading and risks stripping essential input validation)                                                                            |
| **IR-07** | `egm-implementation-readiness` / `egm-codebase-details` | 🟡 Major   | Lines 230–244      | **Abstract Test Plan Lacking Concrete Cases & Assertions** (Items 11–13 lack specific scenario inputs, delta calculations, and edge conditions)                                                                                              |
| **IR-08** | `egm-style` / `egm-codebase-details`                    | 🟡 Major   | Lines 268 & 273    | **Brittle Hardcoded Test Suite Counts** (Hardcoding "all 50 test suites" / "all 58 test suites" creates brittle drift as test suites expand)                                                                                                 |
| **IR-09** | `egm-implementation-readiness`                          | 🟢 Nit     | Lines 210–214, 280 | **300-Line Limit Guardrail** (Explicitly note decomposition for `FieldCreationPopup.tsx` into subcomponents to stay strictly within 300 lines)                                                                                               |
| **IR-10** | `egm-style`                                             | 🟢 Nit     | Line 213           | **Buzzwords & Filler Adverbs** (Remove "directly" and promotional "streamline table creation")                                                                                                                                               |
| **IR-11** | `egm-style`                                             | 🟢 Nit     | Line 228           | **Imprecise Control Phrasing** (Replace "inspect and adjust" with "view and update")                                                                                                                                                         |
| **IR-12** | `egm-style`                                             | 🟢 Nit     | Line 198, 284      | **Style Cleanups** (Replace inflated "Formulate" with "Implement"; drop non-functional `_Drafted with EGM_`)                                                                                                                                 |

---

## Detailed Findings & Remediation Guidance

### IR-01: Missing Phasing & Build Checkpoints (🔴 Blocker)

- **Standard Requirement**: Work must be partitioned into logical, incremental phases where each phase leaves the codebase buildable and testable.
- **Problem**: Lines 176–254 list 14 tasks in a flat, unsequenced structure.
- **Remediation**: Reorganize implementation tasks into 4 sequential phases:
  - **Phase 1: Shared Schema & Types (`@template-goblin/types`)** (Items 1–3, plus `template.ts`). _Checkpoint_: `pnpm --filter @template-goblin/types type-check && pnpm --filter @template-goblin/types build`.
  - **Phase 2: Core Dynamic Layout Engine & PDF Generator (`template-goblin`)** (Items 4–6, 11, 12). _Checkpoint_: `pnpm --filter template-goblin test`.
  - **Phase 3: Visual Canvas Decorators & Property Inspector (`template-goblin-ui`)** (Items 7–10, 13, and child components). _Checkpoint_: `pnpm --filter template-goblin-ui test`.
  - **Phase 4: Component Contracts & Master Verification** (Item 14, EGM README synchronization, and linting). _Checkpoint_: Prettier check, linter, and full monorepo build/test.

### IR-02: Incomplete File Boundary & Allowlist (🔴 Blocker)

- **Standard Requirement**: Explicit repository-relative file paths to be created, modified, or deleted.
- **Problem**: Five files required for end-to-end functionality were omitted from the target file list:
  1. `packages/ui/src/components/Canvas/tableCanvasParts.ts` (Modify): Mounts dynamic indicators onto canvas Fabric table groups.
  2. `packages/ui/src/components/Canvas/useFieldCreationPopup.ts` (Modify): Translates dialog draft state into Zustand store creation payloads.
  3. `packages/ui/src/components/Canvas/FieldCreationTypes.ts` (Modify): Extends `SourceInputs` with `tableHeightMode`.
  4. `packages/ui/src/components/Canvas/TableHeightHelpModal.tsx` (Create): Extracted comparison dialog explaining table height modes.
  5. `packages/types/src/template.ts` (Modify): Re-exports types through the core types barrel.
- **Remediation**: Add all 5 files to the explicit file targets list with exact proposed changes.

### IR-03: Zero-Decision Violations in Core Layout Contracts (🟡 Major)

- **Standard Requirement**: Leave zero design choices to the implementer.
- **Problem**: Item 4 lacks explicit function signatures, mutation semantics, and internal helper reuse:
  - Function signature for `adjustPageLayout(pageFields: FieldDefinition[], data: Record<string, unknown>, baseWidth: number, baseHeight: number): { width: number; height: number; fields: FieldDefinition[] }`.
  - Must explicitly state whether `fields` are deep-cloned to avoid mutating the original template definition.
  - Must specify reuse of `cellRowHeight` from `packages/core/src/render/tableStyle.ts` for uniform row height calculation.
  - Must define row data extraction: dynamic tables read `data.tables?.[jsonKey]` (or root arrays) and static tables read `field.source.value`.
- **Remediation**: Document complete TypeScript signatures and data extraction logic in Item 4.

### IR-04: Ambiguous Background Rendering API Signatures (🟡 Major)

- **Standard Requirement**: Precise logic changes and API updates.
- **Problem**: Item 6 states that background rendering accepts dynamic `pageSize` overrides, but does not define the parameter signature.
- **Remediation**: Define the exact parameter: `renderPageBackground(doc: PDFKit.PDFDocument, page: PageDefinition, data: Record<string, unknown>, pageSizeOverride?: { width: number; height: number })`.

### IR-05: Unstated Synchronization Invariant in Properties Inspector (🟡 Major)

- **Standard Requirement**: Explicit invariants to prevent system drift.
- **Problem**: Item 10 permits mutating `heightMode` without mandating synchronization of `multiPage`.
- **Remediation**: Explicitly mandate invariant: updating `heightMode` MUST simultaneously update `multiPage: newMode === 'multipage'` to keep legacy consumers consistent.

### IR-06: Ambiguous Statement Contradicting Dialog Validation (🟡 Major)

- **Standard Requirement**: Clear and unambiguous execution instructions.
- **Problem**: Item 7 states "Remove manual blocking validation errors to streamline table creation", which falsely implies removing mandatory label/JSON key validation.
- **Remediation**: Clarify that validation checks are preserved; default `tableHeightMode` to `'single_page_dynamic'` automatically so users are not blocked by a missing mode selection.

### IR-07: Abstract Test Plan Lacking Concrete Cases & Assertions (🟡 Major)

- **Standard Requirement**: Specific test cases (happy path and edge cases) that must be implemented.
- **Problem**: Items 11–13 only list high-level topics without test scenario inputs and assertions.
- **Remediation**: Add explicit test scenarios:
  1. _Dynamic expansion happy path_: Table with original height 100pt, 10 rows $\times$ 20pt = 200pt rendered $\rightarrow$ page height expands by 100pt; element at $y=150$ shifts to $y=250$.
  2. _Side-by-side parallel tables_: Table A expands +50pt, Table B expands +120pt in same vertical cluster $\rightarrow$ lower elements shift by $\max(50, 120) = 120\text{pt}$ (no double-counting).
  3. _Aside element isolation_: Element with $y$ overlapping table interval ($y < \text{cluster.origBottom}$) $\rightarrow$ $y$ remains anchored ($+0\text{pt}$).
  4. _Empty data edge case_: Dynamic table with 0 rows or missing key $\rightarrow$ renders at header height or original height; page does not expand.
  5. _Backward compatibility_: Legacy template with `multiPage: true` $\rightarrow$ `resolveTableHeightMode` yields `'multipage'`; `multiPage: false` yields `'fixed'`.

### IR-08: Brittle Hardcoded Test Suite Counts (🟡 Major)

- **Problem**: Hardcoding "all 50 test suites" and "all 58 test suites" creates immediate maintenance drift.
- **Remediation**: Calibrate to "Must pass all core/UI test suites, including [new test file names]".

### IR-09 to IR-12: Editorial & Style Cleanups (🟢 Nit)

- Enforce the 300-line rule explicitly on `FieldCreationPopup.tsx` by requiring extracted subcomponents.
- Remove filler words ("directly", "streamline table creation").
- Replace "inspect and adjust" with "view and update".
- Replace "Formulate" with "Implement" and drop `_Drafted with EGM_`.
