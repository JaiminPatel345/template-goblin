# Design — Static / Dynamic Fields and Table Upgrade

**Date:** 2026-04-18
**Status:** Proposed
**Scope:** Full cross-cutting change to schema, renderer, UI, and tests. No migration (pre-release project).

---

## 1. Goals

1. Every field (text, image, table) can be either **static** (content baked into the template, appears on every generated PDF) or **dynamic** (content supplied by the library consumer at generation time via `InputJSON`).
2. A new **element creation popup** captures the mode decision and all style options up-front when the designer draws a new element. After creation, double-clicking the element opens the right panel for ongoing edits, including switching modes.
3. The historical term **loop** is renamed to **table** across types, specs, UI, file formats, and the `InputJSON` contract.
4. Tables gain advanced styling: zebra striping, full per-column style, per-column header overrides, and a header-hiding toggle.
5. Library consumers never see static content in `InputJSON`. Static fields contribute no validation requirements to the input.

## 2. Non-goals

- No migration of pre-existing `.tgbl` files. The project is in development; fresh schema only.
- No per-row override styles (e.g. first/last row emphasis). Zebra striping + per-column styles cover the common needs; further granularity can be added without a breaking change.
- No vertical-vs-horizontal border split. Borders remain a single `borderWidth`/`borderColor`.
- No separate authoring UI for importing large static tables from CSV. Designer types rows inline.

## 3. Conceptual model

A field is a geometric region on a page with a style and a **source**. The source answers "where does the runtime value come from?" and is the only part of a field that changes when the designer toggles mode.

```ts
type StaticSource<V> = { mode: 'static'; value: V }
type DynamicSource<V> = {
  mode: 'dynamic'
  jsonKey: string
  required: boolean
  placeholder: V | null // canvas-preview content; never used at PDF generation time
}
type FieldSource<V> = StaticSource<V> | DynamicSource<V>
```

### Rationale

- Nesting under `source` isolates mode-specific data from geometry and style. Switching mode in the UI is a single replacement of `field.source`; nothing else has to move.
- The discriminated union makes illegal states unrepresentable (`value` and `jsonKey` can never coexist).
- A single generic `FieldSource<V>` means validation and resolution logic is written once and reused per field type.
- Parameterizing `placeholder` as `V | null` means the canvas-preview content has the same shape as the eventual runtime value for every field type: a text field's placeholder is a string; an image field's placeholder is `{ filename }`; a table field's placeholder is `TableRow[]`. This replaces the existing `ImageFieldStyle.placeholderFilename` (which conflated canvas-preview content with style).

## 4. Schema (types)

All types live in `packages/types/src`.

### 4.1 Text field

```ts
interface TextField {
  id: string
  type: 'text'
  label: string // human-facing name used in the left panel
  pageId: string | null
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  style: TextFieldStyle // unchanged from spec 010
  source: FieldSource<string> // static value is the literal rendered text
}
```

### 4.2 Image field

```ts
interface ImageField {
  id: string
  type: 'image'
  label: string
  pageId: string | null
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  style: ImageFieldStyle // { fit: 'fill' | 'contain' | 'cover' }
  source: FieldSource<{ filename: string }>
}
```

- **Static image**: `source.value.filename` points to a file stored in `images/<filename>` inside the `.tgbl` archive. Rendered directly during PDF generation.
- **Dynamic image**: `source.placeholder = { filename }` points to a file stored in `placeholders/<filename>`, used only for canvas preview in the designer. Runtime value comes from `InputJSON.images[jsonKey]`.
- `ImageFieldStyle.placeholderFilename` from the pre-change schema is removed — the placeholder file now lives in `source.placeholder`.

### 4.3 Table field (renamed from Loop)

```ts
type TableRow = Record<string, string> // keys match the column keys

interface TableField {
  id: string
  type: 'table'
  label: string
  pageId: string | null
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  style: TableFieldStyle
  source: FieldSource<TableRow[]>
}
```

### 4.4 `CellStyle`

A shared style object reused by header, row, odd/even rows, and per-column overrides.

```ts
interface CellStyle {
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textDecoration: 'none' | 'underline' | 'line-through'
  color: string
  backgroundColor: string
  borderWidth: number
  borderColor: string
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
  align: 'left' | 'center' | 'right'
  verticalAlign: 'top' | 'middle' | 'bottom'
}
```

Per-level overrides use `Partial<CellStyle> | null`; `null` means "inherit from the next level."

### 4.5 `TableFieldStyle`

```ts
interface TableFieldStyle {
  maxRows: number
  maxColumns: number
  multiPage: boolean

  showHeader: boolean // NEW: if false, the header row is not rendered
  headerStyle: CellStyle // global header baseline
  rowStyle: CellStyle // baseline for data rows
  oddRowStyle: Partial<CellStyle> | null // NEW: applied to rows with odd 0-indexed position (1, 3, 5...)
  evenRowStyle: Partial<CellStyle> | null // NEW: applied to rows with even 0-indexed position (0, 2, 4...)
  cellStyle: { overflowMode: 'truncate' | 'dynamic_font' }
  columns: TableColumn[]
}

interface TableColumn {
  key: string
  label: string // defaults to key if omitted
  width: number
  style: Partial<CellStyle> | null // NEW: full per-column body override (was a limited subset)
  headerStyle: Partial<CellStyle> | null // NEW: per-column header override
}
```

### 4.6 Style resolution order

For a header cell, per property:

1. `column.headerStyle` (if set and property present)
2. `style.headerStyle`

For a body cell at row index `i` (0-indexed), per property:

1. `column.style` (if set and property present)
2. `i` odd → `style.oddRowStyle`; `i` even → `style.evenRowStyle` (if set and property present)
3. `style.rowStyle`

Resolution is **per property**, not per object — a column can override only `backgroundColor` while inheriting font from the row style.

### 4.7 Manifest shape

```jsonc
{
  "version": "2.0",
  "meta": {
    /* unchanged */
  },
  "pages": [
    /* unchanged */
  ],
  "fonts": [
    /* unchanged */
  ],
  "groups": [
    /* unchanged — only dynamic fields may be grouped; see §5.3 */
  ],
  "fields": [
    {
      "type": "text",
      "source": { "mode": "static", "value": "Certificate of Completion" },
      /* ... */
    },
    {
      "type": "text",
      "source": {
        "mode": "dynamic",
        "jsonKey": "student_name",
        "required": true,
        "placeholder": null,
      },
      /* ... */
    },
    {
      "type": "image",
      "source": { "mode": "static", "value": { "filename": "logo.png" } },
      /* ... */
    },
    {
      "type": "table",
      "source": { "mode": "static", "value": [{ "subject": "Math", "score": "90" }] },
      /* ... */
    },
  ],
}
```

### 4.8 `InputJSON`

```ts
interface InputJSON {
  texts: Record<string, string>
  images: Record<string, Buffer | string> // Buffer or base64
  tables: Record<string, TableRow[]> // renamed from `loops`
}
```

Static fields never appear. A generated PDF with only static content is valid with `InputJSON = { texts: {}, images: {}, tables: {} }`.

## 5. Validation

### 5.1 At template load

- `source.mode` must be one of `"static"` / `"dynamic"`.
- `mode === "static"`:
  - `value` must be present and shape-matching for the field type (string / `{ filename }` / `TableRow[]`).
  - For image: the referenced `filename` must exist in `images/` inside the archive.
  - For table: every row must be a `Record<string, string>` whose keys are a subset of `style.columns[].key`.
- `mode === "dynamic"`:
  - `jsonKey` must be a non-empty string, alphanumeric + underscore only.
  - `required` must be a boolean.
  - `placeholder` must be either `null` or shape-matching for the field type (string / `{ filename }` / `TableRow[]`). For image placeholders, the referenced filename must exist in `placeholders/`.
- Uniqueness: `jsonKey` values are unique per field type (dynamic text fields share one namespace, dynamic images another, dynamic tables another). Static fields contribute nothing to these namespaces.

### 5.2 At PDF generation

- For each dynamic field with `required: true`, the corresponding `InputJSON[<type>][jsonKey]` must be present (not `undefined`, not `null`).
- For optional dynamic fields, missing values are skipped — the field is not rendered.
- Static fields are always rendered regardless of `InputJSON` contents.

### 5.3 Groups

Groups (§ existing spec 020) logically partition dynamic fields for the JSON preview and left-panel organization. Static fields may be placed in a group for organizational purposes in the left panel but are never part of any input contract, so they do not appear in the JSON preview.

### 5.4 Error codes

New / updated error codes:

- `INVALID_SOURCE_MODE` — `source.mode` missing or not one of the allowed values.
- `INVALID_STATIC_VALUE` — `source.mode === "static"` but `value` is missing or the wrong shape.
- `MISSING_STATIC_IMAGE_FILE` — static image refers to a filename not present in `images/`.
- `MISSING_PLACEHOLDER_IMAGE_FILE` — dynamic image's `source.placeholder.filename` not present in `placeholders/`.
- `INVALID_DYNAMIC_SOURCE` — `source.mode === "dynamic"` but `jsonKey` is missing, empty, malformed, or `required`/`placeholder` is malformed.
- `DUPLICATE_JSON_KEY` — two dynamic fields of the same type share a `jsonKey`.
- `MISSING_REQUIRED_FIELD` — unchanged semantics, now only applies to dynamic fields with `required: true`.
- `INVALID_TABLE_ROW` — a static table row contains a key not declared in `style.columns`.

## 6. Rendering

### 6.1 Value resolution

At the start of each field's render step, resolve the value:

```ts
function resolveValue<V>(
  field: { source: FieldSource<V> },
  input: InputJSON,
  typeBucket: keyof InputJSON,
): V | undefined {
  if (field.source.mode === 'static') return field.source.value
  const bucket = input[typeBucket] as Record<string, unknown>
  return bucket[field.source.jsonKey] as V | undefined
}
```

The `resolveValue` step is the only place the renderer needs to know about modes. Downstream rendering (wrapping, overflow handling, image fit, table layout) consumes the resolved value unchanged and therefore carries no new logic.

### 6.2 Images

- **Static image** path: the archive is already loaded by `loadTemplate`; static image bytes are cached in `LoadedTemplate.staticImages: Map<string, Buffer>` keyed by `filename`.
- **Dynamic image** path: unchanged — decode from `InputJSON.images[jsonKey]` (Buffer or base64).

### 6.3 Tables

- Static table: `resolveValue` returns the baked-in `TableRow[]`.
- Dynamic table: lookup in `InputJSON.tables`.
- Advanced styling is applied during the existing per-row/per-cell paint loop using the resolution order in §4.6.
- `showHeader: false` skips the header-drawing pass entirely and starts body rows at `y`.

### 6.4 Multi-page

Multi-page behaviour (spec 006) applies to tables regardless of source mode. A static table with many rows and `multiPage: true` correctly overflows onto additional pages. `meta.maxPages` enforcement is unchanged.

## 7. Archive layout (.tgbl)

```
manifest.json
backgrounds/<id>.png           # page backgrounds
images/<name>.<ext>            # NEW — static image content baked into the template
placeholders/<name>.<ext>      # canvas-preview images for dynamic image fields (existing)
fonts/<name>.<ext>             # custom fonts
```

The `images/` folder is introduced for static image content. `placeholders/` remains for the designer-time preview of dynamic image fields. A single field uses at most one of these two folders.

## 8. UI

### 8.1 Creation popup

Triggered when the designer finishes drawing a rectangle with the text / image / table tool active.

Contents (single modal, scrollable):

1. **Mode toggle** — `Static` / `Dynamic`. Default: `Dynamic`. Includes an info button explaining the distinction ("static = same on every PDF; dynamic = supplied via JSON").
2. **Mode-specific block** — swaps based on the toggle:
   - Static text: `Value` textarea
   - Dynamic text: `JSON key` (prefixed `texts.`), `Required` toggle, `Placeholder` (shown only when `Required = false`)
   - Static image: `Upload image file` (stored in `images/` on save). A preview thumbnail appears after upload.
   - Dynamic image: `JSON key` (prefixed `images.`), `Required`, `Placeholder image upload` (stored in `placeholders/`, canvas-preview only)
   - Static table: inline grid editor (see §8.4)
   - Dynamic table: `JSON key` (prefixed `tables.`), `Required`, column definition (key + label + width)
3. **Style block** — all the style controls that exist today per field type (font, color, alignment, overflow, fit, table styles including the new advanced options). Organized into collapsible sections so the popup remains scannable.
4. Footer: `Cancel` / `Create` buttons. `Cancel` discards the drawn rectangle. `Create` commits the field to the store.

Keyboard: `Esc` cancels, `Cmd/Ctrl+Enter` confirms.

### 8.2 Right panel (post-creation editing)

- **Activation**: double-click an element on the canvas. Single-click still selects for move/resize without opening the panel.
- The panel contains the same sections as the creation popup, minus the `Cancel` / `Create` footer — changes are applied live (debounced 150 ms for text inputs).
- A prominent **Mode toggle** at the top of the panel switches between static and dynamic. Switching:
  - Preserves geometry, `zIndex`, `label`, and the entire `style` object.
  - Discards the old mode-specific data with no confirmation dialog (per brainstorming decision).
  - When switching to dynamic, `jsonKey` is pre-filled with a slugified form of `label` (or empty if no label).
  - When switching to static, `value` is initialized to an empty string / empty rows / null image.

### 8.3 Canvas preview

- Static text: rendered with the literal `source.value`.
- Static image: rendered with the uploaded image.
- Static table: rendered with the baked-in rows.
- Dynamic text: rendered with the preview input value if the designer has typed one, otherwise the placeholder string.
- Dynamic image: rendered with the uploaded placeholder image, or a generic icon if none.
- Dynamic table: rendered with designer-supplied sample data (existing JSON preview pane).

### 8.4 Static table inline editor

A compact spreadsheet-style grid:

- Columns row at the top lets the designer add/remove/reorder columns and set `key`, `label`, and `width` per column. Column `key` validation: alphanumeric + underscore, unique within the table.
- Body rows below: each row is a set of cells, one per column, each a text input. Add-row button below the last row. Row delete control on each row.
- Up to `style.maxRows` rows (configurable in the advanced style section).
- Live canvas preview updates on blur (to avoid re-rendering the whole table per keystroke).

### 8.5 JSON preview

The JSON preview pane (spec 014) lists **only dynamic fields**. A new section at the bottom shows "Static content baked into template: N text / M images / K tables" as a summary — no editable JSON for them.

## 9. Specs to add / update / rename

- **RENAME**: `specs/005-loop-table-rendering.md` → `specs/005-table-rendering.md`. Replace "loop" with "table" throughout. Add advanced style resolution order, `showHeader`, zebra, per-column / per-column-header overrides.
- **RENAME**: `specs/012-ui-loop-field.md` → `specs/012-ui-table-field.md`. Update for table + static/dynamic creation flow.
- **UPDATE 001**: Add `images/` folder to archive layout.
- **UPDATE 002**: Replace loop → table; introduce `source` field on each `fields[]` entry; update validation rules; bump `version` to `"2.0"`.
- **UPDATE 003**: No logic change; just references to loops become tables; text rendering unchanged.
- **UPDATE 004**: Document the two code paths (archive-backed static, InputJSON-backed dynamic).
- **UPDATE 006**: Rename loops → tables; multi-page rules unchanged.
- **UPDATE 007**: `loadTemplate` now populates `staticImages` map and parses `source` on each field.
- **UPDATE 008**: `generatePDF` delegates to `resolveValue`; required-field validation limited to dynamic + required fields.
- **UPDATE 009**: Canvas draw flow now triggers the creation popup on mouse-up instead of immediately creating the field.
- **UPDATE 010**: Text field UI — popup layout, right panel parity, mode toggle, preview semantics per mode.
- **UPDATE 011**: Image field UI — split static upload (`images/`) from placeholder upload (`placeholders/`).
- **UPDATE 013**: Right panel — double-click activation, mode toggle, parity with creation popup.
- **UPDATE 014**: JSON preview filters to dynamic fields only; adds static-content summary footer.
- **UPDATE 020**: Groups — clarify that static fields can be grouped for organization but do not participate in the JSON contract.
- **UPDATE 021**: Error handling — add the new error codes in §5.4.
- **NEW SPEC**: `specs/023-field-source-model.md` — the `source` discriminator, `FieldSource<V>` shape, resolution algorithm, validation rules for each mode, shared across field types.
- **NEW SPEC**: `specs/024-element-creation-popup.md` — popup UX, trigger (draw release), keyboard shortcuts, form layout, cancel-vs-commit semantics.
- **NEW SPEC**: `specs/025-static-table-editor.md` — inline grid editor UX, column/row management, validation, canvas preview cadence.

## 10. Testing strategy

### 10.1 `packages/core` (Jest)

For each field type × each mode × each relevant scenario:

- Schema validation (valid + every error code in §5.4).
- `resolveValue` round-trip for every mode.
- Static text / image / table renders identically regardless of `InputJSON` contents.
- Dynamic field with `required: true` missing → `MISSING_REQUIRED_FIELD` with correct `jsonKey`.
- Optional dynamic field missing → skipped, no error.
- Static image file present in archive → rendered; missing file → `MISSING_STATIC_IMAGE_FILE` at load time (not at generate time).
- Static table rows whose keys don't match columns → `INVALID_TABLE_ROW`.
- Table style resolution: header and body cells correctly inherit through `column → odd/even → row`, with per-property granularity.
- Zebra striping: rows at even/odd 0-indexed positions use the correct style.
- `showHeader: false` omits the header row; body rows start at `y`.
- Multi-page: static table with rows exceeding one page triggers overflow correctly.
- Snapshot test: the full PDF-byte signature of a "hello world" template with a static text, a static image, and a static table (no `InputJSON` dynamic input) remains stable.

### 10.2 `packages/ui` (Playwright)

- Draw a rectangle with each tool → creation popup opens with the expected controls; `Esc` cancels; `Create` commits.
- Mode toggle in popup swaps the mode-specific block without losing style input.
- Double-click an element → right panel opens populated.
- Switch an element from dynamic → static and back; confirm style persists, mode-specific fields reset as specified.
- Static table editor: add columns, add rows, type cell values, reorder/delete; live canvas preview reflects the state.
- Advanced table styles: toggle `showHeader`, set zebra colors, set per-column background — canvas preview updates; save / reload round-trips the styles.
- JSON preview pane shows only dynamic keys and summary footer for static content.
- Save template → reload → all static content preserved; no `InputJSON` required to render the preview PDF.
- Required dynamic field missing → preview pane flags the error with the specific `jsonKey`.

### 10.3 Review gates

Each spec-level change is reviewed by the Reviewer Agent per CLAUDE.md workflow. Tests are written by the QA Agent from the final specs, not from implementation code.

## 11. Changeset

A single changeset entry will accompany the implementation PR recording:

- `@template-goblin/types`: breaking — `source` field added, `loop` renamed to `table`.
- `template-goblin`: breaking — `InputJSON.loops` renamed to `InputJSON.tables`; `loadTemplate` / `generatePDF` behaviour extended with static-field resolution.
- `template-goblin-ui`: minor — new creation-popup, right-panel double-click, static-table editor, advanced table styling controls.

Documentation in the README / CHANGELOG points at the changeset for the full version-to-version diff instead of duplicating migration notes.

## 12. Open questions

None remaining after brainstorming. Any ambiguity discovered during implementation is surfaced back to this spec and resolved before code lands (per CLAUDE.md Hard Rule 8).
