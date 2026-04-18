# Static/Dynamic Fields — Phase 1 Implementation Plan (Schema + Validation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the `source` discriminator (static/dynamic) on every field, rename `loop` → `table`, add shared `CellStyle`, advanced table style properties, and full manifest validation for all new schema rules. Produces a fully-typed, validated, testable schema layer with no UI or rendering changes yet.

**Architecture:** A generic `FieldSource<V>` discriminated union nests mode-specific data under a single `source` property on each field. Validation lives in `packages/core/src/validate.ts` (extending the existing manifest validator) and runs both at template load and at `generatePDF` time; input-data validation narrows to dynamic fields only.

**Tech Stack:** TypeScript (strict), Jest (core), `@template-goblin/types` shared types.

**Spec reference:** `docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md` §3–§5

**Scope of this plan:** Schema types + manifest validation + input-data validation + spec-file updates. All done on main branch with frequent commits.

**Out of scope (separate phase plans to follow):**

- Phase 2: `loadTemplate` and `resolveValue` in core — load `images/` into `staticImages` map, expose `resolveValue` helper
- Phase 3: `generatePDF` — wire `resolveValue`, render static images, apply `showHeader`/zebra/per-column styles
- Phase 4: UI creation popup + canvas integration
- Phase 5: Right panel double-click + mode switching
- Phase 6: Static table inline editor
- Phase 7: Advanced table styling UI controls + JSON preview filtering

---

## File Structure (this phase)

**Types package** (`packages/types/src`):

- `source.ts` — NEW. `StaticSource<V>`, `DynamicSource<V>`, `FieldSource<V>`, runtime type guards
- `template.ts` — MODIFY. Rename `Loop*` → `Table*`, add shared `CellStyle`, `TableColumn`, `TableFieldStyle`, refactor `FieldDefinition` into `TextField` | `ImageField` | `TableField` discriminated union, drop `placeholderFilename` from `ImageFieldStyle`
- `input.ts` — MODIFY. Rename `LoopInputs` → `TableInputs`, `LoopRow` → `TableRow`, `InputJSON.loops` → `InputJSON.tables`
- `errors.ts` — MODIFY. Add new error codes
- `index.ts` — MODIFY. Re-export renamed / new types

**Core package** (`packages/core/src`):

- `validate.ts` — MODIFY. Field-level validation now reads `field.source` and branches on `mode`; required check narrows to dynamic + required; table rows validated against column keys
- `validateManifest.ts` — NEW (split from what currently lives inline in `load.ts`, or create new file if absent). Full schema validation for the new shape, including source discriminator, duplicate-jsonKey detection per type namespace, shape matching for static values
- `utils/resolveValue.ts` — NEW. Generic `resolveValue<V>(field, input)` helper used by future render paths and by input validation
- `load.ts` — MODIFY. Call `validateManifest` on the parsed JSON; no rendering/runtime changes yet
- `index.ts` — MODIFY. Re-export `resolveValue`

**Core tests** (`packages/core/tests`):

- `validate.test.ts` — MODIFY. Update existing tests to new schema shape; add tests for dynamic-only required validation
- `validateManifest.test.ts` — NEW. Manifest-level validation tests (one per new error code)
- `resolveValue.test.ts` — NEW
- `load.test.ts` — MODIFY. Update fixtures to new schema

**Spec files** (rename + update):

- RENAME `specs/005-loop-table-rendering.md` → `specs/005-table-rendering.md`
- RENAME `specs/012-ui-loop-field.md` → `specs/012-ui-table-field.md`
- UPDATE 001, 002, 003, 004, 006, 007, 008, 009, 010, 011, 013, 014, 020, 021 (scope: references to loops/placeholderFilename → table/source; add new schema sections to 002; add new error codes to 021)
- NEW `specs/023-field-source-model.md`
- NEW `specs/024-element-creation-popup.md` (stub — fully written in Phase 4)
- NEW `specs/025-static-table-editor.md` (stub — fully written in Phase 6)

---

## Task 1: Rename loop spec files

**Files:**

- Rename: `specs/005-loop-table-rendering.md` → `specs/005-table-rendering.md`
- Rename: `specs/012-ui-loop-field.md` → `specs/012-ui-table-field.md`

- [ ] **Step 1: Rename the two spec files via git mv**

Run:

```bash
cd /home/jaimin/My/Dev/Projects/fun/template-goblin
git mv specs/005-loop-table-rendering.md specs/005-table-rendering.md
git mv specs/012-ui-loop-field.md specs/012-ui-table-field.md
```

- [ ] **Step 2: Global find/replace "loop" → "table" in both files**

Manually review each occurrence with the Edit tool — change:

- `Loop/Table Rendering` → `Table Rendering`
- `UI Loop Field` → `UI Table Field`
- `loop field` → `table field`
- `loops` (as plural noun for the feature) → `tables`
- `InputJSON.loops` → `InputJSON.tables`
- `LoopField` / `LoopColumn` / `LoopFieldStyle` / `LoopRow` / `LoopInputs` identifier mentions → `TableField` / `TableColumn` / `TableFieldStyle` / `TableRow` / `TableInputs`
- `jsonKey` prefix examples: `loops.students` → `tables.students`

Preserve any historical phrasing referring to "loop" as a programming concept; but in user-facing feature names, use "table". Re-read each file end-to-end after the edits.

- [ ] **Step 3: Commit**

```bash
git add specs/
git commit -m "spec: rename loop → table in spec 005 and 012"
```

---

## Task 2: Update spec 002 (schema) with new shape

**Files:**

- Modify: `specs/002-template-schema.md`

- [ ] **Step 1: Rewrite the Field Types section**

Open `specs/002-template-schema.md`. Replace the entire `### Field Types` section and all type-specific subsections with the content from the design doc §4 (use `docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md` as the source of truth). Keep existing section headers where they match; add new subsections for `CellStyle` and `Style resolution order`. Bump `version` example to `"2.0"`.

Specifically include:

- The `StaticSource<V>` / `DynamicSource<V>` / `FieldSource<V>` type definitions
- The renamed `TableField` (was `LoopField`) with updated style shape
- The new `CellStyle` shape (reused across header/row/column/odd/even)
- The new `TableFieldStyle` with `showHeader`, `oddRowStyle`, `evenRowStyle`, and `columns[].style` / `columns[].headerStyle` as `Partial<CellStyle> | null`
- Style resolution order (per property)
- `images/` folder in the archive layout (move to spec 001 as well)
- Note that `ImageFieldStyle.placeholderFilename` is removed — replaced by `source.placeholder.filename` for dynamic image fields

- [ ] **Step 2: Update Requirements, Acceptance Criteria, and Edge Cases**

Add REQ entries for each new validation rule in design §5.1. Add AC entries mirroring them. Remove AC-010 ("loop field column label defaults") only if it still applies — it does (for `TableColumn.label`), just renamed.

- [ ] **Step 3: Update Error Conditions**

Add the new error codes from design §5.4:

- `INVALID_SOURCE_MODE`
- `INVALID_STATIC_VALUE`
- `MISSING_STATIC_IMAGE_FILE`
- `MISSING_PLACEHOLDER_IMAGE_FILE`
- `INVALID_DYNAMIC_SOURCE`
- `DUPLICATE_JSON_KEY`
- `INVALID_TABLE_ROW`

- [ ] **Step 4: Commit**

```bash
git add specs/002-template-schema.md
git commit -m "spec(002): introduce source discriminator and rename loop to table"
```

---

## Task 3: Update spec 001 (archive layout) and other touched specs

**Files:**

- Modify: `specs/001-tgbl-file-format.md` — add `images/` folder entry
- Modify: `specs/003-text-rendering.md` — no logic change; update any references to `loop` or `placeholderFilename` to match
- Modify: `specs/004-image-rendering.md` — document the two code paths (static from `images/`, dynamic from `InputJSON`)
- Modify: `specs/006-multi-page.md` — rename loops → tables
- Modify: `specs/007-load-template.md` — mention `staticImages` map will be added (full detail in Phase 2 plan)
- Modify: `specs/008-generate-pdf.md` — mention `resolveValue` will be used (full detail in Phase 3 plan)
- Modify: `specs/009-ui-canvas.md`, `010-ui-text-field.md`, `011-ui-image-field.md`, `013-ui-right-panel.md`, `014-ui-json-preview.md`, `020-ui-field-groups.md` — add pointers to design §8 for popup/mode details, note they will be expanded in Phase 4+
- Modify: `specs/021-error-handling.md` — add the new error codes with brief descriptions

- [ ] **Step 1: Per file, add required updates**

For each file above, open it, locate the affected sections, and apply minimal changes using the Edit tool. Keep each file internally consistent — don't leave dangling references to `loopField` or `placeholderFilename`.

For specs outside Phase 1 scope (UI specs 009–014, 020), the acceptable update is: add a single paragraph near the top noting the source/static/dynamic model introduced in design 2026-04-18 and a pointer to that doc. Full rewrite happens in the UI phase plan.

- [ ] **Step 2: Commit**

```bash
git add specs/
git commit -m "spec: propagate source model and table rename across all affected specs"
```

---

## Task 4: New spec — field source model (023)

**Files:**

- Create: `specs/023-field-source-model.md`

- [ ] **Step 1: Create the spec file**

Write it using the standard spec template (see any existing numbered spec). Content should be a tightened version of design §3 and §5 plus §6.1 (`resolveValue`). Cover:

- Summary
- Requirements: source must be present; mode must be `static` | `dynamic`; shape rules per type; placeholder shape rules; uniqueness of dynamic jsonKey per type namespace; static value presence rules
- Behaviour: resolution algorithm (`resolveValue`); canvas-preview semantics (placeholder usage)
- Edge cases: missing placeholder for optional dynamic text (→ empty render); missing placeholder image file; static table row with unknown key
- Error conditions: every error code from design §5.4
- Input / Output: `FieldSource<V>` TypeScript definition
- Acceptance criteria: mirrors each REQ

- [ ] **Step 2: Commit**

```bash
git add specs/023-field-source-model.md
git commit -m "spec(023): field source model (static/dynamic)"
```

---

## Task 5: Stub specs — creation popup (024) and static table editor (025)

**Files:**

- Create: `specs/024-element-creation-popup.md`
- Create: `specs/025-static-table-editor.md`

- [ ] **Step 1: Create stubs pointing to design doc and the Phase 4/6 plans**

Each stub should contain: Summary (one paragraph), a `Status: Stub — to be completed in Phase X plan`, a link to the design doc §8 (popup) / §8.4 (table editor), and a placeholder Requirements/AC section. This keeps the spec numbering reserved and surfaces the intent.

Example content for `024-element-creation-popup.md`:

```markdown
# Spec 024 — Element Creation Popup

## Status

Stub — full spec to be completed in Phase 4 implementation plan.

## Summary

When the designer finishes drawing a rectangle with the text / image / table tool, a modal popup opens with (a) the static/dynamic mode toggle, (b) the mode-specific field group, and (c) the full style controls for the chosen field type. Confirming the popup commits the field; cancelling discards the drawn rectangle.

See `docs/superpowers/specs/2026-04-18-static-dynamic-fields-design.md` §8.1 for the full design.

## Requirements

_To be completed in Phase 4._

## Acceptance Criteria

_To be completed in Phase 4._
```

Do the same for 025 pointing to design §8.4.

- [ ] **Step 2: Commit**

```bash
git add specs/024-element-creation-popup.md specs/025-static-table-editor.md
git commit -m "spec(024,025): stubs for creation popup and static table editor"
```

---

## Task 6: Create `packages/types/src/source.ts`

**Files:**

- Create: `packages/types/src/source.ts`

- [ ] **Step 1: Write the file**

```typescript
/** Static content baked into the template. Never consulted from InputJSON. */
export interface StaticSource<V> {
  mode: 'static'
  value: V
}

/**
 * Dynamic content filled from InputJSON at PDF generation time.
 *
 * `placeholder` is designer-time canvas preview content with the same shape as
 * the eventual runtime value. It is never used during PDF generation.
 */
export interface DynamicSource<V> {
  mode: 'dynamic'
  jsonKey: string
  required: boolean
  placeholder: V | null
}

/**
 * Discriminated union of static and dynamic field sources. `V` is the value
 * shape for the field type: `string` for text, `{ filename: string }` for image,
 * `TableRow[]` for table.
 */
export type FieldSource<V> = StaticSource<V> | DynamicSource<V>

/** Narrow `FieldSource<V>` to `StaticSource<V>`. */
export function isStaticSource<V>(source: FieldSource<V>): source is StaticSource<V> {
  return source.mode === 'static'
}

/** Narrow `FieldSource<V>` to `DynamicSource<V>`. */
export function isDynamicSource<V>(source: FieldSource<V>): source is DynamicSource<V> {
  return source.mode === 'dynamic'
}
```

- [ ] **Step 2: Re-export from `packages/types/src/index.ts`**

Open `packages/types/src/index.ts` and add:

```typescript
export type { StaticSource, DynamicSource, FieldSource } from './source.js'
export { isStaticSource, isDynamicSource } from './source.js'
```

- [ ] **Step 3: Build types package to confirm compilation**

Run: `cd packages/types && pnpm build`
Expected: successful build, `dist/source.js` and `dist/source.d.ts` produced.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/source.ts packages/types/src/index.ts
git commit -m "types: add FieldSource discriminated union"
```

---

## Task 7: Refactor `packages/types/src/template.ts` — shared CellStyle, table types

**Files:**

- Modify: `packages/types/src/template.ts`
- Modify: `packages/types/src/input.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Rewrite `template.ts`**

Replace the file contents (keep what is unchanged) with:

```typescript
import type { FieldSource } from './source.js'

export type PageSize = 'custom' | 'A4' | 'A3' | 'Letter' | 'Legal'
export type FieldType = 'text' | 'image' | 'table'
export type TextAlign = 'left' | 'center' | 'right'
export type VerticalAlign = 'top' | 'middle' | 'bottom'
export type FontWeight = 'normal' | 'bold'
export type FontStyle = 'normal' | 'italic'
export type TextDecoration = 'none' | 'underline' | 'line-through'
export type OverflowMode = 'dynamic_font' | 'truncate'
export type ImageFit = 'fill' | 'contain' | 'cover'

export interface TemplateMeta {
  name: string
  width: number
  height: number
  unit: 'pt'
  pageSize: PageSize
  locked: boolean
  maxPages: number
  createdAt: string
  updatedAt: string
}

export interface FontDefinition {
  id: string
  name: string
  filename: string
}

export interface GroupDefinition {
  id: string
  name: string
}

/**
 * Shared cell style used by header cells, body rows, odd/even rows, and
 * per-column overrides in a table field. Every property is required at the
 * top-level style slots (`headerStyle`, `rowStyle`); `Partial<CellStyle>` is
 * used at override slots (odd/even row, per-column).
 */
export interface CellStyle {
  fontFamily: string
  fontSize: number
  fontWeight: FontWeight
  fontStyle: FontStyle
  textDecoration: TextDecoration
  color: string
  backgroundColor: string
  borderWidth: number
  borderColor: string
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
  align: TextAlign
  verticalAlign: VerticalAlign
}

export interface TextFieldStyle {
  fontId: string | null
  fontFamily: string
  fontSize: number
  fontSizeDynamic: boolean
  fontSizeMin: number
  lineHeight: number
  fontWeight: FontWeight
  fontStyle: FontStyle
  textDecoration: TextDecoration
  color: string
  align: TextAlign
  verticalAlign: VerticalAlign
  maxRows: number
  overflowMode: OverflowMode
  snapToGrid: boolean
}

/** Image field style. `placeholderFilename` has moved to `source.placeholder`. */
export interface ImageFieldStyle {
  fit: ImageFit
}

export interface TableColumn {
  key: string
  label: string
  width: number
  /** Full body-cell override (null = inherit from row/odd/even styles). */
  style: Partial<CellStyle> | null
  /** Header-cell override (null = inherit from headerStyle). */
  headerStyle: Partial<CellStyle> | null
}

export interface TableCellRuntimeStyle {
  overflowMode: OverflowMode
}

export interface TableFieldStyle {
  maxRows: number
  maxColumns: number
  multiPage: boolean
  /** When false, the header row is skipped entirely at render time. */
  showHeader: boolean
  headerStyle: CellStyle
  rowStyle: CellStyle
  /** Applied to rows with odd 0-indexed position (1, 3, 5...). */
  oddRowStyle: Partial<CellStyle> | null
  /** Applied to rows with even 0-indexed position (0, 2, 4...). */
  evenRowStyle: Partial<CellStyle> | null
  cellStyle: TableCellRuntimeStyle
  columns: TableColumn[]
}

/** A single row in a table — column key → cell string value. */
export type TableRow = Record<string, string>

/** Image source value: a filename in the archive (`images/` for static, `placeholders/` for dynamic placeholder). */
export interface ImageSourceValue {
  filename: string
}

/** Common field properties shared by text, image, and table fields. */
export interface FieldBase {
  id: string
  groupId: string | null
  pageId: string | null
  label: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

export interface TextField extends FieldBase {
  type: 'text'
  style: TextFieldStyle
  source: FieldSource<string>
}

export interface ImageField extends FieldBase {
  type: 'image'
  style: ImageFieldStyle
  source: FieldSource<ImageSourceValue>
}

export interface TableField extends FieldBase {
  type: 'table'
  style: TableFieldStyle
  source: FieldSource<TableRow[]>
}

export type FieldDefinition = TextField | ImageField | TableField

export type PageBackgroundType = 'image' | 'color' | 'inherit'

export interface PageDefinition {
  id: string
  index: number
  backgroundType: PageBackgroundType
  backgroundColor: string | null
  backgroundFilename: string | null
}

export interface TemplateManifest {
  version: string
  meta: TemplateMeta
  fonts: FontDefinition[]
  groups: GroupDefinition[]
  pages: PageDefinition[]
  fields: FieldDefinition[]
}
```

- [ ] **Step 2: Rewrite `input.ts`**

```typescript
import type { TableRow } from './template.js'

export type TextInputs = Record<string, string>
export type TableInputs = Record<string, TableRow[]>
export type ImageInputs = Record<string, Buffer | string>

export interface InputJSON {
  texts: TextInputs
  images: ImageInputs
  tables: TableInputs
}

// Re-exported for convenience: TableRow lives in template.ts to avoid circular re-export chains.
export type { TableRow } from './template.js'
```

- [ ] **Step 3: Update `index.ts` re-exports**

Open `packages/types/src/index.ts` and replace the body with:

```typescript
export type {
  TemplateManifest,
  TemplateMeta,
  FieldBase,
  FieldDefinition,
  TextField,
  ImageField,
  TableField,
  TextFieldStyle,
  ImageFieldStyle,
  ImageSourceValue,
  TableFieldStyle,
  TableCellRuntimeStyle,
  TableColumn,
  TableRow,
  CellStyle,
  FontDefinition,
  GroupDefinition,
  PageDefinition,
  PageBackgroundType,
  PageSize,
  FieldType,
  TextAlign,
  VerticalAlign,
  FontWeight,
  FontStyle,
  TextDecoration,
  OverflowMode,
  ImageFit,
} from './template.js'
export type { InputJSON, TextInputs, TableInputs, ImageInputs } from './input.js'
export type { StaticSource, DynamicSource, FieldSource } from './source.js'
export { isStaticSource, isDynamicSource } from './source.js'
export type { LoadedTemplate, TemplateAssets } from './loaded.js'
export { TemplateGoblinError } from './errors.js'
export type { ValidationResult, ValidationError, ValidationErrorCode, ErrorCode } from './errors.js'
```

- [ ] **Step 4: Build types package**

Run: `cd packages/types && pnpm build`

Expected: clean build. If `loaded.ts` references `LoopInputs` or `LoopField`, fix it in the next task.

- [ ] **Step 5: Fix `loaded.ts` if it references old names**

Open `packages/types/src/loaded.ts` and update any `LoopField`/`LoopInputs`/`LoopRow` references to the new `TableField`/`TableInputs`/`TableRow` names. Also update any reference to `placeholderFilename` to pull from `source.placeholder` where applicable. If `LoadedTemplate` stored placeholder image buffers, rename the map consistently (keep `placeholders` naming since the folder name is unchanged) and add `staticImages: Map<string, Buffer>` for Phase 2.

Note: adding `staticImages` now (empty in Phase 1 loader) is fine — Phase 2 populates it.

- [ ] **Step 6: Re-run build**

Run: `cd packages/types && pnpm build`

Expected: clean build.

- [ ] **Step 7: Commit**

```bash
git add packages/types/
git commit -m "types: rename Loop→Table, introduce source on fields, shared CellStyle"
```

---

## Task 8: Update error codes

**Files:**

- Modify: `packages/types/src/errors.ts`

- [ ] **Step 1: Add the new codes**

Open `packages/types/src/errors.ts` and extend the `ErrorCode` union:

```typescript
export type ErrorCode =
  | 'FILE_NOT_FOUND'
  | 'INVALID_FORMAT'
  | 'MISSING_MANIFEST'
  | 'INVALID_MANIFEST'
  | 'MISSING_ASSET'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_DATA_TYPE'
  | 'MAX_PAGES_EXCEEDED'
  | 'FONT_LOAD_FAILED'
  | 'PDF_GENERATION_FAILED'
  | 'SAVE_FAILED'
  | 'INVALID_SOURCE_MODE'
  | 'INVALID_STATIC_VALUE'
  | 'MISSING_STATIC_IMAGE_FILE'
  | 'MISSING_PLACEHOLDER_IMAGE_FILE'
  | 'INVALID_DYNAMIC_SOURCE'
  | 'DUPLICATE_JSON_KEY'
  | 'INVALID_TABLE_ROW'
```

- [ ] **Step 2: Update `ValidationErrorCode`**

```typescript
export type ValidationErrorCode =
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_DATA_TYPE'
  | 'INVALID_TABLE_ROW'
```

- [ ] **Step 3: Build types**

Run: `cd packages/types && pnpm build`

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/errors.ts
git commit -m "types: add error codes for source validation"
```

---

## Task 9: Write `resolveValue` utility (TDD)

**Files:**

- Create: `packages/core/src/utils/resolveValue.ts`
- Test: `packages/core/tests/resolveValue.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/core/tests/resolveValue.test.ts`:

```typescript
import { resolveValue } from '../src/utils/resolveValue.js'
import type { TextField, ImageField, TableField, InputJSON } from '@template-goblin/types'

function makeTextField(source: TextField['source']): TextField {
  return {
    id: 't1',
    type: 'text',
    label: 'T',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    zIndex: 0,
    style: {} as TextField['style'],
    source,
  }
}

function emptyInput(): InputJSON {
  return { texts: {}, images: {}, tables: {} }
}

describe('resolveValue', () => {
  test('returns static value for static text field', () => {
    const field = makeTextField({ mode: 'static', value: 'Hello' })
    expect(resolveValue(field, emptyInput())).toBe('Hello')
  })

  test('returns dynamic value for dynamic text field when present in input', () => {
    const field = makeTextField({
      mode: 'dynamic',
      jsonKey: 'greeting',
      required: true,
      placeholder: null,
    })
    const input: InputJSON = { texts: { greeting: 'Hi' }, images: {}, tables: {} }
    expect(resolveValue(field, input)).toBe('Hi')
  })

  test('returns undefined for dynamic text field when not in input', () => {
    const field = makeTextField({
      mode: 'dynamic',
      jsonKey: 'missing',
      required: false,
      placeholder: null,
    })
    expect(resolveValue(field, emptyInput())).toBeUndefined()
  })

  test('resolves dynamic image field from images bucket', () => {
    const field: ImageField = {
      id: 'i1',
      type: 'image',
      label: 'I',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      zIndex: 0,
      style: { fit: 'contain' },
      source: { mode: 'dynamic', jsonKey: 'photo', required: true, placeholder: null },
    }
    const buf = Buffer.from([1, 2, 3])
    const input: InputJSON = { texts: {}, images: { photo: buf }, tables: {} }
    expect(resolveValue(field, input)).toBe(buf)
  })

  test('static image returns the filename wrapper', () => {
    const field: ImageField = {
      id: 'i2',
      type: 'image',
      label: 'I',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      zIndex: 0,
      style: { fit: 'contain' },
      source: { mode: 'static', value: { filename: 'logo.png' } },
    }
    expect(resolveValue(field, emptyInput())).toEqual({ filename: 'logo.png' })
  })

  test('resolves dynamic table from tables bucket', () => {
    const field: TableField = {
      id: 'tb1',
      type: 'table',
      label: 'Tab',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      zIndex: 0,
      style: {} as TableField['style'],
      source: { mode: 'dynamic', jsonKey: 'rows', required: true, placeholder: null },
    }
    const rows = [{ a: '1' }, { a: '2' }]
    const input: InputJSON = { texts: {}, images: {}, tables: { rows } }
    expect(resolveValue(field, input)).toBe(rows)
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

Run: `cd packages/core && pnpm test -- resolveValue`

Expected: test file fails because `resolveValue` import fails.

- [ ] **Step 3: Implement `resolveValue`**

Create `packages/core/src/utils/resolveValue.ts`:

```typescript
import type {
  FieldDefinition,
  InputJSON,
  TextField,
  ImageField,
  TableField,
  TableRow,
  ImageSourceValue,
} from '@template-goblin/types'

/**
 * Resolve a field's runtime value. For static fields returns the baked-in
 * `source.value`. For dynamic fields returns the entry from the matching
 * InputJSON bucket, or undefined if the key is absent.
 *
 * Never consults `source.placeholder` — that is designer-time only.
 */
export function resolveValue(field: TextField, input: InputJSON): string | undefined
export function resolveValue(
  field: ImageField,
  input: InputJSON,
): ImageSourceValue | Buffer | string | undefined
export function resolveValue(field: TableField, input: InputJSON): TableRow[] | undefined
export function resolveValue(field: FieldDefinition, input: InputJSON): unknown {
  if (field.source.mode === 'static') {
    return field.source.value
  }
  const key = field.source.jsonKey
  switch (field.type) {
    case 'text':
      return input.texts[key]
    case 'image':
      return input.images[key]
    case 'table':
      return input.tables[key]
  }
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `cd packages/core && pnpm test -- resolveValue`

Expected: all 6 tests pass.

- [ ] **Step 5: Re-export from `packages/core/src/index.ts`**

Add to `packages/core/src/index.ts`:

```typescript
export { resolveValue } from './utils/resolveValue.js'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/utils/resolveValue.ts packages/core/tests/resolveValue.test.ts packages/core/src/index.ts
git commit -m "core: add resolveValue helper for static/dynamic field resolution"
```

---

## Task 10: Write `validateManifest` — source-discriminator validation (TDD)

**Files:**

- Create: `packages/core/src/validateManifest.ts`
- Test: `packages/core/tests/validateManifest.test.ts`

This task is long; each numbered step below is a single action. Do each in order, committing at the end.

- [ ] **Step 1: Write the failing tests (file skeleton)**

Create `packages/core/tests/validateManifest.test.ts`:

```typescript
import { validateManifest } from '../src/validateManifest.js'
import { TemplateGoblinError } from '@template-goblin/types'
import type { TemplateManifest } from '@template-goblin/types'

function makeValidManifest(): TemplateManifest {
  return {
    version: '2.0',
    meta: {
      name: 't',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 50,
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    },
    pages: [
      {
        id: 'p0',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#FFFFFF',
        backgroundFilename: null,
      },
    ],
    fonts: [],
    groups: [],
    fields: [],
  }
}

describe('validateManifest — source discriminator', () => {
  test('valid manifest with no fields passes', () => {
    expect(() => validateManifest(makeValidManifest())).not.toThrow()
  })

  test('INVALID_SOURCE_MODE when source.mode missing', () => {
    const m = makeValidManifest()
    m.fields.push({
      id: 'f',
      type: 'text',
      label: 'L',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: {} as any,
      source: {} as any,
    })
    try {
      validateManifest(m)
      fail('expected throw')
    } catch (e) {
      expect(e).toBeInstanceOf(TemplateGoblinError)
      expect((e as TemplateGoblinError).code).toBe('INVALID_SOURCE_MODE')
    }
  })

  test('INVALID_STATIC_VALUE when static text value is not a string', () => {
    const m = makeValidManifest()
    m.fields.push({
      id: 'f',
      type: 'text',
      label: 'L',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: {} as any,
      source: { mode: 'static', value: 42 as any },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_STATIC_VALUE' }),
    )
  })

  test('INVALID_DYNAMIC_SOURCE when jsonKey is empty', () => {
    const m = makeValidManifest()
    m.fields.push({
      id: 'f',
      type: 'text',
      label: 'L',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: {} as any,
      source: { mode: 'dynamic', jsonKey: '', required: true, placeholder: null },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_DYNAMIC_SOURCE' }),
    )
  })

  test('INVALID_DYNAMIC_SOURCE when jsonKey has invalid chars', () => {
    const m = makeValidManifest()
    m.fields.push({
      id: 'f',
      type: 'text',
      label: 'L',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: {} as any,
      source: { mode: 'dynamic', jsonKey: 'has space', required: true, placeholder: null },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_DYNAMIC_SOURCE' }),
    )
  })

  test('DUPLICATE_JSON_KEY across same-type dynamic fields', () => {
    const m = makeValidManifest()
    const make = (id: string) => ({
      id,
      type: 'text' as const,
      label: id,
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: {} as any,
      source: { mode: 'dynamic' as const, jsonKey: 'name', required: true, placeholder: null },
    })
    m.fields.push(make('a'), make('b'))
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'DUPLICATE_JSON_KEY' }),
    )
  })

  test('same jsonKey across different types is allowed (text.logo vs image.logo)', () => {
    const m = makeValidManifest()
    m.fields.push({
      id: 'a',
      type: 'text',
      label: 'a',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: {} as any,
      source: { mode: 'dynamic', jsonKey: 'logo', required: true, placeholder: null },
    })
    m.fields.push({
      id: 'b',
      type: 'image',
      label: 'b',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: { fit: 'contain' },
      source: { mode: 'dynamic', jsonKey: 'logo', required: true, placeholder: null },
    })
    expect(() => validateManifest(m)).not.toThrow()
  })

  test('INVALID_STATIC_VALUE when static image missing filename', () => {
    const m = makeValidManifest()
    m.fields.push({
      id: 'i',
      type: 'image',
      label: 'i',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: { fit: 'contain' },
      source: { mode: 'static', value: {} as any },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_STATIC_VALUE' }),
    )
  })

  test('INVALID_STATIC_VALUE when static table value is not an array', () => {
    const m = makeValidManifest()
    m.fields.push({
      id: 'tb',
      type: 'table',
      label: 'tb',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      zIndex: 0,
      style: {
        maxRows: 10,
        maxColumns: 3,
        multiPage: false,
        showHeader: true,
        headerStyle: {} as any,
        rowStyle: {} as any,
        oddRowStyle: null,
        evenRowStyle: null,
        cellStyle: { overflowMode: 'truncate' },
        columns: [{ key: 'a', label: 'A', width: 50, style: null, headerStyle: null }],
      },
      source: { mode: 'static', value: 'not an array' as any },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_STATIC_VALUE' }),
    )
  })

  test('INVALID_TABLE_ROW when static table row has unknown key', () => {
    const m = makeValidManifest()
    m.fields.push({
      id: 'tb',
      type: 'table',
      label: 'tb',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 200,
      height: 100,
      zIndex: 0,
      style: {
        maxRows: 10,
        maxColumns: 3,
        multiPage: false,
        showHeader: true,
        headerStyle: {} as any,
        rowStyle: {} as any,
        oddRowStyle: null,
        evenRowStyle: null,
        cellStyle: { overflowMode: 'truncate' },
        columns: [{ key: 'a', label: 'A', width: 50, style: null, headerStyle: null }],
      },
      source: { mode: 'static', value: [{ a: '1', b: 'unknown col' }] },
    })
    expect(() => validateManifest(m)).toThrow(
      expect.objectContaining({ code: 'INVALID_TABLE_ROW' }),
    )
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

Run: `cd packages/core && pnpm test -- validateManifest`

Expected: file-not-found / import failure.

- [ ] **Step 3: Implement `validateManifest.ts`**

Create `packages/core/src/validateManifest.ts`:

```typescript
import {
  TemplateGoblinError,
  type TemplateManifest,
  type FieldDefinition,
  type TextField,
  type ImageField,
  type TableField,
  type FieldSource,
  type TableRow,
} from '@template-goblin/types'

const JSON_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

function fail(
  code: import('@template-goblin/types').ErrorCode,
  message: string,
  details?: Record<string, unknown>,
): never {
  throw new TemplateGoblinError(code, message, details)
}

function validateSourceMode(
  source: unknown,
  fieldId: string,
): asserts source is FieldSource<unknown> {
  if (source === null || typeof source !== 'object') {
    fail('INVALID_SOURCE_MODE', `Field ${fieldId}: source is missing or not an object`, { fieldId })
  }
  const mode = (source as { mode?: unknown }).mode
  if (mode !== 'static' && mode !== 'dynamic') {
    fail('INVALID_SOURCE_MODE', `Field ${fieldId}: source.mode must be 'static' or 'dynamic'`, {
      fieldId,
      actual: mode,
    })
  }
}

function validateDynamicCommon(
  source: { jsonKey: unknown; required: unknown; placeholder: unknown },
  fieldId: string,
): void {
  if (typeof source.jsonKey !== 'string' || !JSON_KEY_RE.test(source.jsonKey)) {
    fail('INVALID_DYNAMIC_SOURCE', `Field ${fieldId}: jsonKey must match ${JSON_KEY_RE}`, {
      fieldId,
      actual: source.jsonKey,
    })
  }
  if (typeof source.required !== 'boolean') {
    fail('INVALID_DYNAMIC_SOURCE', `Field ${fieldId}: required must be boolean`, { fieldId })
  }
}

function validateTextField(field: TextField): void {
  validateSourceMode(field.source, field.id)
  if (field.source.mode === 'static') {
    if (typeof field.source.value !== 'string') {
      fail('INVALID_STATIC_VALUE', `Text field ${field.id}: static value must be a string`, {
        fieldId: field.id,
      })
    }
  } else {
    validateDynamicCommon(field.source, field.id)
    if (field.source.placeholder !== null && typeof field.source.placeholder !== 'string') {
      fail('INVALID_DYNAMIC_SOURCE', `Text field ${field.id}: placeholder must be string or null`, {
        fieldId: field.id,
      })
    }
  }
}

function validateImageField(field: ImageField): void {
  validateSourceMode(field.source, field.id)
  if (field.source.mode === 'static') {
    const v = field.source.value
    if (
      !v ||
      typeof v !== 'object' ||
      typeof (v as { filename?: unknown }).filename !== 'string' ||
      (v as { filename: string }).filename.length === 0
    ) {
      fail(
        'INVALID_STATIC_VALUE',
        `Image field ${field.id}: static value must be { filename: string }`,
        {
          fieldId: field.id,
        },
      )
    }
  } else {
    validateDynamicCommon(field.source, field.id)
    const ph = field.source.placeholder
    if (ph !== null) {
      if (typeof ph !== 'object' || typeof (ph as { filename?: unknown }).filename !== 'string') {
        fail(
          'INVALID_DYNAMIC_SOURCE',
          `Image field ${field.id}: placeholder must be { filename: string } or null`,
          {
            fieldId: field.id,
          },
        )
      }
    }
  }
}

function validateTableField(field: TableField): void {
  validateSourceMode(field.source, field.id)
  const columnKeys = new Set(field.style.columns.map((c) => c.key))
  if (field.source.mode === 'static') {
    const rows = field.source.value
    if (!Array.isArray(rows)) {
      fail(
        'INVALID_STATIC_VALUE',
        `Table field ${field.id}: static value must be an array of row objects`,
        {
          fieldId: field.id,
        },
      )
    }
    rows.forEach((row: TableRow, i: number) => {
      if (row === null || typeof row !== 'object' || Array.isArray(row)) {
        fail('INVALID_TABLE_ROW', `Table field ${field.id}: row ${i} must be an object`, {
          fieldId: field.id,
          rowIndex: i,
        })
      }
      for (const key of Object.keys(row)) {
        if (!columnKeys.has(key)) {
          fail(
            'INVALID_TABLE_ROW',
            `Table field ${field.id}: row ${i} has unknown column key '${key}'`,
            {
              fieldId: field.id,
              rowIndex: i,
              key,
            },
          )
        }
        if (typeof row[key] !== 'string') {
          fail(
            'INVALID_TABLE_ROW',
            `Table field ${field.id}: row ${i} key '${key}' must be a string`,
            {
              fieldId: field.id,
              rowIndex: i,
              key,
            },
          )
        }
      }
    })
  } else {
    validateDynamicCommon(field.source, field.id)
    const ph = field.source.placeholder
    if (ph !== null && !Array.isArray(ph)) {
      fail(
        'INVALID_DYNAMIC_SOURCE',
        `Table field ${field.id}: placeholder must be TableRow[] or null`,
        {
          fieldId: field.id,
        },
      )
    }
  }
}

function validateField(field: FieldDefinition): void {
  switch (field.type) {
    case 'text':
      return validateTextField(field)
    case 'image':
      return validateImageField(field)
    case 'table':
      return validateTableField(field)
    default: {
      const _exhaustive: never = field
      void _exhaustive
      fail('INVALID_MANIFEST', `Unknown field type`)
    }
  }
}

function checkDuplicateJsonKeys(fields: FieldDefinition[]): void {
  const seen = { text: new Set<string>(), image: new Set<string>(), table: new Set<string>() }
  for (const f of fields) {
    if (f.source.mode !== 'dynamic') continue
    const bucket = seen[f.type]
    if (bucket.has(f.source.jsonKey)) {
      fail(
        'DUPLICATE_JSON_KEY',
        `Duplicate dynamic jsonKey '${f.source.jsonKey}' among ${f.type} fields`,
        {
          type: f.type,
          jsonKey: f.source.jsonKey,
        },
      )
    }
    bucket.add(f.source.jsonKey)
  }
}

/**
 * Validate a parsed TemplateManifest against the v2.0 schema rules.
 * Throws TemplateGoblinError on the first violation encountered.
 *
 * Note: this function validates shape and logical invariants of the manifest
 * itself. Archive-existence checks (static image file present in images/,
 * placeholder image present in placeholders/) are performed separately during
 * loadTemplate, once the archive contents are known.
 */
export function validateManifest(manifest: TemplateManifest): void {
  for (const field of manifest.fields) {
    validateField(field)
  }
  checkDuplicateJsonKeys(manifest.fields)
}
```

- [ ] **Step 4: Run tests — expect all pass**

Run: `cd packages/core && pnpm test -- validateManifest`

Expected: all 10 tests pass.

- [ ] **Step 5: Re-export from `packages/core/src/index.ts`**

Add: `export { validateManifest } from './validateManifest.js'`

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/validateManifest.ts packages/core/tests/validateManifest.test.ts packages/core/src/index.ts
git commit -m "core: validateManifest — source discriminator and duplicate key checks"
```

---

## Task 11: Update existing input-data validator (`validate.ts`)

**Files:**

- Modify: `packages/core/src/validate.ts`
- Modify: `packages/core/tests/validate.test.ts`

- [ ] **Step 1: Update the failing-test list**

The existing `validate.test.ts` currently uses `field.jsonKey`, `field.required`, and `InputJSON.loops`. Update it to the new shape: fixtures now use `source: { mode: 'dynamic', jsonKey, required, placeholder }` and `InputJSON.tables`.

For each existing test case, apply the following mechanical transform in the fixture setup:

- Replace `jsonKey: X, required: Y, placeholder: Z` on the field object with `source: { mode: 'dynamic', jsonKey: X, required: Y, placeholder: Z }`.
- Replace `{ loops: ... }` with `{ tables: ... }` in InputJSON literals.
- Replace `type: 'loop'` with `type: 'table'`.

Add new tests:

```typescript
test('static fields are NOT required in InputJSON (no error when absent)', () => {
  const template: LoadedTemplate = makeLoadedTemplate([
    {
      id: 'static-text',
      type: 'text',
      label: 'L',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: {} as any,
      source: { mode: 'static', value: 'hardcoded' },
    },
  ])
  const result = validateData(template, { texts: {}, images: {}, tables: {} })
  expect(result.valid).toBe(true)
  expect(result.errors).toHaveLength(0)
})

test('dynamic required field missing → MISSING_REQUIRED_FIELD with correct jsonKey', () => {
  const template: LoadedTemplate = makeLoadedTemplate([
    {
      id: 'd',
      type: 'text',
      label: 'L',
      groupId: null,
      pageId: null,
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      zIndex: 0,
      style: {} as any,
      source: { mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null },
    },
  ])
  const result = validateData(template, { texts: {}, images: {}, tables: {} })
  expect(result.valid).toBe(false)
  expect(result.errors[0]).toMatchObject({ code: 'MISSING_REQUIRED_FIELD', field: 'name' })
})
```

(`makeLoadedTemplate` should be a small helper in the test file that wraps `fields` into a minimal `LoadedTemplate`.)

- [ ] **Step 2: Run tests — expect failures after fixture update**

Run: `cd packages/core && pnpm test -- validate`

Expected: tests fail because `validate.ts` still reads `field.jsonKey` / `field.required`.

- [ ] **Step 3: Update `validate.ts`**

Open `packages/core/src/validate.ts` and rewrite `validateField` to branch on `field.source.mode`:

```typescript
function validateField(field: FieldDefinition, data: InputJSON): ValidationError[] {
  const errors: ValidationError[] = []

  if (field.source.mode === 'static') {
    return errors // static fields contribute no input-data requirements
  }

  const { jsonKey, required } = field.source
  const bucketKey = field.type === 'text' ? 'texts' : field.type === 'image' ? 'images' : 'tables'
  const bucket = data[bucketKey] as Record<string, unknown>
  const value = bucket?.[jsonKey]

  if (required) {
    if (value === undefined || value === null || value === '') {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        field: jsonKey,
        message: `Missing required field: ${jsonKey}`,
      })
      return errors
    }
  }
  if (value === undefined || value === null) return errors

  switch (field.type) {
    case 'text':
      // ... existing string / length checks, unchanged except for `field.jsonKey` → `jsonKey`
      break
    case 'image':
      // ... existing buffer / base64 / size checks, unchanged
      break
    case 'table':
      if (!Array.isArray(value)) {
        errors.push({
          code: 'INVALID_DATA_TYPE',
          field: jsonKey,
          message: `Invalid data for field "${jsonKey}": expected array of rows`,
        })
      } else {
        const columnKeys = new Set(field.style.columns.map((c) => c.key))
        value.forEach((row, i) => {
          if (row === null || typeof row !== 'object' || Array.isArray(row)) {
            errors.push({
              code: 'INVALID_TABLE_ROW',
              field: jsonKey,
              message: `Row ${i} of '${jsonKey}' must be an object`,
            })
            return
          }
          for (const k of Object.keys(row)) {
            if (!columnKeys.has(k)) {
              errors.push({
                code: 'INVALID_TABLE_ROW',
                field: jsonKey,
                message: `Row ${i} of '${jsonKey}' has unknown column key '${k}'`,
              })
            }
          }
        })
      }
      break
  }

  return errors
}
```

Remove the `resolveKey` import if no longer used (input lookups are now direct into the relevant bucket). Keep all existing size-limit constants.

- [ ] **Step 4: Run tests — expect pass**

Run: `cd packages/core && pnpm test -- validate`

Expected: all validate tests pass, including the two new ones.

- [ ] **Step 5: Run the full core test suite**

Run: `cd packages/core && pnpm test`

Expected: existing tests that referenced the old schema need fixtures updated. Go through any failures and apply the same fixture transforms as Step 1. This is mechanical but do NOT skip any failing test — tests that can't be updated because they test removed behavior (like a loop field style change) should be rewritten to test the corresponding table behavior instead. Commit at Step 6 only when all green.

- [ ] **Step 6: Commit**

```bash
git add packages/core/
git commit -m "core: validate input data against dynamic source; static fields bypass input validation"
```

---

## Task 12: Wire `validateManifest` into `loadTemplate` (no archive-existence checks yet)

**Files:**

- Modify: `packages/core/src/load.ts`
- Modify: `packages/core/tests/load.test.ts`

- [ ] **Step 1: Call `validateManifest` after parsing the manifest**

In `packages/core/src/load.ts`, find where `manifest.json` is parsed (likely `JSON.parse(manifestBuffer.toString())`). Immediately after the parse, call `validateManifest(manifest)` and let errors propagate.

```typescript
import { validateManifest } from './validateManifest.js'
// ...
const manifest = JSON.parse(manifestBuffer.toString()) as TemplateManifest
validateManifest(manifest)
```

Archive-existence checks (`MISSING_STATIC_IMAGE_FILE`, `MISSING_PLACEHOLDER_IMAGE_FILE`) are added in Phase 2.

- [ ] **Step 2: Add a failing test for malformed manifest**

In `packages/core/tests/load.test.ts`, add:

```typescript
test('loadTemplate rejects manifest with invalid source', async () => {
  const tgbl = makeTgblWithManifest({
    /* ... valid top-level ... */
    fields: [
      {
        id: 'f',
        type: 'text',
        label: 'L',
        groupId: null,
        pageId: null,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        zIndex: 0,
        style: {} as any,
        source: { mode: 'dynamic', jsonKey: '', required: true, placeholder: null },
      },
    ],
  })
  await expect(loadTemplate(tgbl)).rejects.toMatchObject({ code: 'INVALID_DYNAMIC_SOURCE' })
})
```

(Reuse or extend an existing helper that builds a `.tgbl` buffer from a manifest.)

- [ ] **Step 3: Update existing `load.test.ts` fixtures**

Mechanical update: same fixture transform as Task 11 Step 1 (add `source`, rename loop→table, replace `loops` key).

- [ ] **Step 4: Run load tests**

Run: `cd packages/core && pnpm test -- load`

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/load.ts packages/core/tests/load.test.ts
git commit -m "core: validate manifest during loadTemplate"
```

---

## Task 13: Full test sweep + type check

- [ ] **Step 1: Run all Jest tests**

Run: `cd /home/jaimin/My/Dev/Projects/fun/template-goblin && pnpm test`

Expected: every test passes. If anything fails, open it, read what it's asserting, and fix either the fixture (for shape migrations) or the production code (if it still references `field.jsonKey`/`field.required`/`loops`).

- [ ] **Step 2: Run type-check across workspaces**

Run: `cd /home/jaimin/My/Dev/Projects/fun/template-goblin && pnpm type-check`

Expected: zero errors. Note: UI package (`packages/ui`) will have many errors referring to `field.jsonKey`, `field.required`, `LoopField`, `InputJSON.loops`, `ImageFieldStyle.placeholderFilename`. These are expected — they get fixed in Phase 4+ plans.

If the UI fails type-check and blocks the build pipeline, add a temporary `// @ts-expect-error TODO(phase4)` near each affected call site to keep CI green until Phase 4. Do NOT delete the UI code; Phase 4 rewrites the affected components in place.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`

Expected: clean. Fix any lint issues from the new files.

- [ ] **Step 4: Commit any lint/type-check stabilization**

```bash
git add -A
git commit -m "chore: stabilize UI type-check with phase4 markers after schema refactor"
```

(Only if Step 2 required ts-expect-error markers.)

---

## Task 14: Add changeset entry

**Files:**

- Create: `.changeset/<random-name>.md` — follow the existing changeset naming convention

- [ ] **Step 1: Run `pnpm changeset` if interactive, or hand-write the file**

Create `.changeset/static-dynamic-schema.md`:

```markdown
---
'@template-goblin/types': major
'template-goblin': major
---

Introduce static/dynamic field sources.

- Every field (text, image, table) now has a `source: FieldSource<V>` property that is either `{ mode: 'static', value }` or `{ mode: 'dynamic', jsonKey, required, placeholder }`.
- `loop` is renamed to `table` throughout: types (`TableField`, `TableFieldStyle`, `TableColumn`, `TableRow`), `InputJSON.loops` → `InputJSON.tables`.
- Shared `CellStyle` type introduced; `TableFieldStyle` gains `showHeader`, `oddRowStyle`, `evenRowStyle`; `TableColumn` gains full `Partial<CellStyle>` style overrides plus per-column `headerStyle`.
- `ImageFieldStyle.placeholderFilename` removed — the placeholder file now lives in `source.placeholder.filename` for dynamic image fields.
- New error codes: `INVALID_SOURCE_MODE`, `INVALID_STATIC_VALUE`, `MISSING_STATIC_IMAGE_FILE`, `MISSING_PLACEHOLDER_IMAGE_FILE`, `INVALID_DYNAMIC_SOURCE`, `DUPLICATE_JSON_KEY`, `INVALID_TABLE_ROW`.

No migration path — pre-existing templates must be recreated.
```

- [ ] **Step 2: Commit**

```bash
git add .changeset/static-dynamic-schema.md
git commit -m "changeset: static/dynamic field sources (major)"
```

---

## Phase 1 Exit Criteria

All of the following must hold before declaring Phase 1 complete and moving to Phase 2:

1. `pnpm test` is green across all packages that have tests.
2. `pnpm type-check` passes (UI may carry temporary `// @ts-expect-error TODO(phase4)` markers but types package and core package have zero errors).
3. `pnpm lint` is clean.
4. A round-trip example compiles in TypeScript:
   ```typescript
   const f: TextField = {
     id: '1', type: 'text', label: 'name', groupId: null, pageId: null,
     x: 0, y: 0, width: 100, height: 20, zIndex: 0,
     style: /* ... */,
     source: { mode: 'static', value: 'Hello' },
   }
   resolveValue(f, { texts: {}, images: {}, tables: {} }) // → 'Hello'
   ```
5. Running the existing `pnpm build` at the repo root completes (types → core → ui) with the UI marker exceptions above.

---

## Phases 2–7 — Outline

The following phase plans will be authored after Phase 1 lands and its exit criteria are met. Each outline below lists scope and main tasks so the executing agent can sense-check that Phase 1 leaves the right seams open for subsequent work.

### Phase 2 — Core: `loadTemplate` and archive validation

- Parse `images/` folder from ZIP into `LoadedTemplate.staticImages: Map<string, Buffer>`
- Parse `placeholders/` folder into `LoadedTemplate.placeholderImages: Map<string, Buffer>` (may already exist)
- Emit `MISSING_STATIC_IMAGE_FILE` when a static image field's `source.value.filename` isn't in `images/`
- Emit `MISSING_PLACEHOLDER_IMAGE_FILE` when a dynamic image field's `source.placeholder.filename` isn't in `placeholders/`
- Tests: full `.tgbl` round-trip with static + dynamic image fields

### Phase 3 — Core: `generatePDF` rendering

- Replace per-field key resolution with `resolveValue`
- Render static images from `LoadedTemplate.staticImages`
- Implement `showHeader` / `oddRowStyle` / `evenRowStyle` / per-column style cascade per design §4.6
- Static table rendering (rows pulled from `source.value` directly)
- Verify `MAX_PAGES_EXCEEDED` still fires for static tables that overflow
- Tests: snapshot PDFs for static-only, dynamic-only, and mixed templates; zebra striping and header-hide coverage

### Phase 4 — UI: element creation popup + canvas draw integration

- Cancel pre-commit field creation on mouse-up; surface a modal with mode toggle and all style controls
- Persist creation on confirm; discard drawn rectangle on cancel
- Wire keyboard shortcuts
- Write `specs/024-element-creation-popup.md` in full
- Playwright tests for draw → popup → confirm / cancel per field type

### Phase 5 — UI: right panel double-click + mode switching

- Change selection behavior: single-click selects, double-click opens right panel
- Mode-toggle control in right panel with style-preserving swap of `field.source`
- Live-update debouncing
- Playwright tests: double-click, mode flip, style preservation across flip

### Phase 6 — UI: static table inline editor

- Spreadsheet-style grid for column + row editing
- Column add/remove/reorder, key/label/width inputs
- Row add/remove, per-cell inputs
- Canvas preview updates on blur
- Write `specs/025-static-table-editor.md` in full
- Playwright tests

### Phase 7 — UI: advanced table styling + JSON preview filter

- Controls for `showHeader`, zebra styling (odd/even), per-column background, per-column header overrides
- JSON preview (spec 014) filters out static fields, adds static-content summary footer
- Update `specs/014-ui-json-preview.md` with new rules
- Playwright tests for every new style control

---

## Self-Review Notes

- All tasks in Phase 1 deal only with files in `packages/types`, `packages/core`, `specs/`, and `docs/superpowers/`. No UI code is touched in Phase 1 (other than the temporary ts-expect-error markers to keep CI green).
- Every task has concrete file paths, concrete test code, expected command output, and a commit step.
- `resolveValue` is introduced in Phase 1 because it's used by the input-data validator and will be reused in Phase 3's render path — fits the DRY principle.
- No placeholder steps (no "TBD" / "handle edge cases" / "write tests for X").
- Type consistency: every type name used in later tasks (`TableField`, `FieldSource`, `resolveValue`, `validateManifest`, `CellStyle`, etc.) is defined in an earlier task within this phase.
- Spec coverage: each design-doc section §3, §4, §5, §9 has a task. §6 (rendering), §7 (archive layout), §8 (UI) are in Phase 2, 3, and 4–7 plans respectively.
