# Goldfish Annotated Review Report

**Status:** resolved  
**Target:** `docs/designs/dynamic_table_height_modes.md` (`176..415`)

## Prioritized Findings & AI Suggestions

### [IR-01] [`egm-implementation-readiness`] - Severity: Blocker

- **Affected Scope:** [Lines 176–254](docs/designs/dynamic_table_height_modes.md#L176-L254) (`## Detailed Implementation Plan`)
- **Discrepancy Description:** Work is presented as an unphased flat list of 14 target files with no dependency hierarchy, execution sequence, or intermediate buildable verification checkpoints.
- **Rationale:** The Implementation Readiness Standard mandates that work must be partitioned into logical, incremental phases leaving the codebase buildable and testable at each step.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Structuring into 4 phases (`types` $\rightarrow$ `core` $\rightarrow$ `ui` $\rightarrow$ `contracts/verification`) provides clear dependency boundaries and verification gates.
- **_Proposed Edit:_**
  - Location: `## Detailed Implementation Plan`
  - Change: Partition the file changes into Phase 1 (Schema & Types), Phase 2 (Core Layout & PDF Engine), Phase 3 (Canvas Decorators & UI Controls), and Phase 4 (Contracts & Verification), each with explicit test/build checkpoints.

---

### [IR-02] [`egm-codebase-details`] - Severity: Blocker

- **Affected Scope:** [Lines 178–254](docs/designs/dynamic_table_height_modes.md#L178-L254) (`### Target Files to Create/Modify`)
- **Discrepancy Description:** Omission of 5 essential implementation files: `tableCanvasParts.ts`, `useFieldCreationPopup.ts`, `FieldCreationTypes.ts`, `TableHeightHelpModal.tsx`, and `packages/types/src/template.ts`.
- **Rationale:** Without these files, dynamic indicators will not mount onto canvas Fabric groups, creation dialog state will not connect to the Zustand store, the help modal will be missing, and barrel exports will be incomplete.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Adding these files establishes the complete write allowlist required for zero-guesswork implementation.
- **_Proposed Edit:_**
  - Location: `### Target Files to Create/Modify`
  - Change: Add explicit entries for all 5 omitted files with their specific modification scopes and integration points.

---

### [IR-03] [`egm-implementation-readiness`] - Severity: Major

- **Affected Scope:** [Lines 195–204](docs/designs/dynamic_table_height_modes.md#L195-L204) (Item 4: `dynamicLayout.ts` & Item 5: `generate.ts`)
- **Discrepancy Description:** Missing function signatures, mutation contracts, data extraction logic, and reuse of internal helpers like `cellRowHeight` from `tableStyle.ts`.
- **Rationale:** The Zero-Decision Rule requires all data structures, interface types, and mutation policies to be pre-determined so the implementer does not invent ad-hoc solutions.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Specifying the exact TypeScript signatures, deep-clone policy, and helper imports eliminates ambiguity.
- **_Proposed Edit:_**
  - Location: Section for `packages/core/src/utils/dynamicLayout.ts`
  - Change: Include explicit `PageLayoutResult` interface, `adjustPageLayout` and `computeTableRenderedHeight` signatures, deep-clone semantics, data extraction pathways (`data.tables?.[jsonKey]` / `field.source.value`), and reuse of `cellRowHeight`.

---

### [IR-04] [`egm-implementation-readiness`] - Severity: Major

- **Affected Scope:** [Lines 205–209](docs/designs/dynamic_table_height_modes.md#L205-L209) (Item 6: `packages/core/src/render/page.ts` & `background.ts`)
- **Discrepancy Description:** Ambiguous parameter signature changes for background rendering functions.
- **Rationale:** Implementer must know how `pageSize` overrides are supplied without breaking existing callers.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Providing the exact signature with optional trailing parameter prevents API breaks.
- **_Proposed Edit:_**
  - Location: Item 6 (`packages/core/src/render/page.ts` & `background.ts`)
  - Change: Specify `renderPageBackground(doc, page, data, pageSizeOverride?: { width: number; height: number })` and `renderBackground(doc, background, pageSizeOverride?: { width: number; height: number })`.

---

### [IR-05] [`egm-codebase-details`] - Severity: Major

- **Affected Scope:** [Lines 225–229](docs/designs/dynamic_table_height_modes.md#L225-L229) (Item 10: `LoopFieldProps.tsx` / `TableFieldProps.tsx`)
- **Discrepancy Description:** Unstated synchronization invariant between `heightMode` and legacy boolean `multiPage`.
- **Rationale:** Changing `heightMode` without updating `multiPage: newMode === 'multipage'` causes schema drift for legacy template consumers.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Mandating synchronous state mutation maintains backward compatibility across template consumers.
- **_Proposed Edit:_**
  - Location: Properties Inspector section
  - Change: Explicitly require that updating `heightMode` simultaneously synchronizes `multiPage: newMode === 'multipage'`.

---

### [IR-06] [`egm-codebase-details`] - Severity: Major

- **Affected Scope:** [Lines 210–214](docs/designs/dynamic_table_height_modes.md#L210-L214) (Item 7: `FieldCreationPopup.tsx`)
- **Discrepancy Description:** "Remove manual blocking validation errors to streamline table creation" contradicts input validation requirements.
- **Rationale:** Label and JSON key validation must remain intact; only default mode selection is pre-set.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Clarifying that existing field validation is preserved avoids accidental regression of required field checks.
- **_Proposed Edit:_**
  - Location: Item 7 (`FieldCreationPopup.tsx`)
  - Change: Clarify that label and JSON key validations remain strictly enforced; `tableHeightMode` defaults to `'single_page_dynamic'` automatically so users are not blocked by a missing mode selection.

---

### [IR-07] [`egm-implementation-readiness`] - Severity: Major

- **Affected Scope:** [Lines 230–244](docs/designs/dynamic_table_height_modes.md#L230-L244) (Items 11–13: Test Files)
- **Discrepancy Description:** Test files list generic topics instead of concrete test scenarios, input states, and assertions.
- **Rationale:** The standard mandates specific test cases (happy path and edge cases) to be pre-determined.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Defining concrete test cases guarantees rigorous coverage without guessing.
- **_Proposed Edit:_**
  - Location: Test files items
  - Change: Add 5 concrete scenarios: (1) dynamic expansion happy path with lower element shift, (2) side-by-side clustering with max-bottom shift, (3) aside element isolation, (4) empty rows / missing keys, (5) legacy boolean fallback.

---

### [IR-08] [`egm-style`] - Severity: Major

- **Affected Scope:** [Lines 268 & 273](docs/designs/dynamic_table_height_modes.md#L268-L273) (`## Verification Plan`)
- **Discrepancy Description:** Brittle hardcoded test suite counts ("all 50 test suites" and "all 58 test suites").
- **Rationale:** Uncalibrated claims that drift as other tests are added in the monorepo.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Calibrating to passing all test suites while naming new test files ensures durable verification.
- **_Proposed Edit:_**
  - Location: Lines 268 & 273
  - Change: "Must pass all test suites, including `dynamicTableHeight.test.ts` and `sideBySideDynamicTables.test.ts`" and "Must pass all test suites, including `tableHeightFeatures.test.ts`".

---

### [IR-09] [`egm-implementation-readiness`] - Severity: Nit

- **Affected Scope:** [Lines 210–214, 280](docs/designs/dynamic_table_height_modes.md#L210-L214) (`FieldCreationPopup.tsx`)
- **Discrepancy Description:** `FieldCreationPopup.tsx` is at 286 lines and risks breaching the 300-line hard repository limit.
- **_AI Suggestion:_** PROPOSE FIX
- **_Justification:_** Mandate child subcomponent extraction to ensure compliance with Rule 11.
- **_Proposed Edit:_**
  - Location: Item 7
  - Change: Explicitly require delegating mode picker UI to child components (`TableHeightModePicker.tsx`).

---

### [IR-10] [`egm-style`] - Severity: Nit

- **Affected Scope:** [Line 213](docs/designs/dynamic_table_height_modes.md#L213)
- **Discrepancy Description:** Filler adverbs ("directly") and promotional jargon ("streamline table creation").
- **_AI Suggestion:_** PROPOSE FIX
- **_Proposed Edit:_**
  - Location: Line 213
  - Change: Rephrase to concise technical statement without filler words.

---

### [IR-11] [`egm-style`] - Severity: Nit

- **Affected Scope:** [Line 228](docs/designs/dynamic_table_height_modes.md#L228)
- **Discrepancy Description:** Imprecise control semantics ("inspect and adjust").
- **_AI Suggestion:_** PROPOSE FIX
- **_Proposed Edit:_**
  - Location: Line 228
  - Change: Replace with "view and update".

---

### [IR-12] [`egm-style`] - Severity: Nit

- **Affected Scope:** [Lines 198, 284](docs/designs/dynamic_table_height_modes.md#L198)
- **Discrepancy Description:** Inflated verb "Formulate" and non-functional tool metadata `_Drafted with EGM_`.
- **_AI Suggestion:_** PROPOSE FIX
- **_Proposed Edit:_**
  - Location: Lines 198 & 284
  - Change: Replace "Formulate" with "Implement" and drop line 284.
