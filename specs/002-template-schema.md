# Spec 002 — Template Schema

## Status

Draft

## Summary

Defines the structure and validation rules for `manifest.json`, the central configuration file inside every `.tgbl` archive. The manifest describes template metadata, page dimensions, page definitions (multi-page support), fonts, field groups, and individual fields (text, image, table). Every field carries a `source` discriminator that declares whether its runtime value is **static** (baked into the template and rendered on every generated PDF) or **dynamic** (supplied at `generatePDF` time via `InputJSON`). This spec covers both the shape of the manifest and the validation rules enforced at load time. The resolution algorithm for `source` is defined in Spec 023; static image assets live under `images/` inside the archive (Spec 001).

## Requirements

- [ ] REQ-001: Validate `manifest.json` against the defined schema on both read and write, rejecting documents with missing or invalid properties.
- [ ] REQ-002: Check the `version` field and reject manifests whose version is unsupported by the current engine. The current schema version is `"2.0"`.
- [ ] REQ-003: Resolve named page size presets (`A4`, `A3`, `Letter`, `Legal`) to their canonical point dimensions; support `custom` with explicit width/height.
- [ ] REQ-004: Validate the `type` field of each entry in the `fields` array, accepting only `text`, `image`, and `table`.
- [ ] REQ-005: Validate style objects per field type — text fields use `TextFieldStyle`, image fields use `ImageFieldStyle`, and table fields use `TableFieldStyle` (which reuses the shared `CellStyle` at every styling level).
- [ ] REQ-006: Validate the `pages` array in the manifest. Every manifest MUST contain at least one page definition. Each page must have a unique `id` and a valid `index` (0-based, contiguous, no gaps).
- [ ] REQ-007: Validate `PageDefinition.backgroundType` — must be one of `"image"`, `"color"`, or `"inherit"`. If `"image"`, `backgroundFilename` must be a non-empty string pointing to a file in the archive. If `"color"`, `backgroundColor` must be a valid hex color string. If `"inherit"`, the page inherits the background from the previous page (invalid for the first page unless another page precedes it in index order).
- [ ] REQ-008: Validate that every field's `pageId` references a valid page `id` from the `pages` array, or is `null` (in which case the field is assigned to the first page).
- [ ] REQ-009: The first page (index 0) MUST NOT use `backgroundType: "inherit"` — it must define its own background explicitly (`"image"` or `"color"`).
- [ ] REQ-010: Every field's `source` property MUST be present and MUST have a `mode` of exactly `"static"` or `"dynamic"`. Missing or misspelled modes raise `INVALID_SOURCE_MODE`.
- [ ] REQ-011: When `source.mode === "static"`, `source.value` MUST be present and shape-matching for the field type — a string for text, `{ filename: string }` for image, `TableRow[]` for table. Violations raise `INVALID_STATIC_VALUE`.
- [ ] REQ-012: When `source.mode === "dynamic"`, `source.jsonKey` MUST be a non-empty string matching the safe-key pattern (alphanumeric + underscore, not starting with a digit) and MUST NOT equal any of the reserved prototype-pollution keys `__proto__`, `constructor`, `prototype`, `hasOwnProperty`, `toString`, `valueOf`. Violations raise `INVALID_DYNAMIC_SOURCE`.
- [ ] REQ-013: When `source.mode === "dynamic"`, `source.required` MUST be a boolean and `source.placeholder` MUST be either `null` or shape-matching for the field type. Violations raise `INVALID_DYNAMIC_SOURCE`.
- [ ] REQ-014: Dynamic `jsonKey` values MUST be unique per type namespace. Two dynamic `text` fields cannot share a `jsonKey`; the same string may however appear on a text field and an image field because each type has its own namespace. Violations raise `DUPLICATE_JSON_KEY`.
- [ ] REQ-015: Every row in a static table's `source.value` MUST be a `Record<string, string>` whose keys are a subset of the column keys declared in `style.columns[].key`. Violations raise `INVALID_TABLE_ROW`.
- [ ] REQ-016: Every filename referenced by a static image's `source.value.filename` MUST exist under `images/` inside the archive. Archive-existence is verified at load time and raises `MISSING_STATIC_IMAGE_FILE` when the file is absent.
- [ ] REQ-017: Every filename referenced by a dynamic image's `source.placeholder.filename` MUST exist under `placeholders/` inside the archive. Archive-existence raises `MISSING_PLACEHOLDER_IMAGE_FILE` when the file is absent.

## Behaviour

### Manifest Structure

```jsonc
{
  "version": "2.0",
  "meta": {
    "name": "string",
    "width": 595, // points
    "height": 842, // points
    "unit": "pt",
    "pageSize": "A4", // "custom" | "A4" | "A3" | "Letter" | "Legal"
    "locked": false,
    "maxPages": 50, // hard limit for table-overflow pages
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
  },
  "pages": [
    // see PageDefinition below
  ],
  "fonts": [{ "id": "string", "name": "string", "filename": "string" }],
  "groups": [{ "id": "string", "name": "string" }],
  "fields": [
    // see field schemas below — each field has `pageId`, `source`, and its type-specific style
  ],
}
```

### PageDefinition

```jsonc
{
  "id": "string", // unique identifier (UUID)
  "index": 0, // 0-based page order, contiguous, no gaps
  "backgroundType": "image", // "image" | "color" | "inherit"
  "backgroundColor": "#FFFFFF", // required when backgroundType is "color", ignored otherwise
  "backgroundFilename": "background-0.png", // required when backgroundType is "image", ignored otherwise
}
```

- `backgroundType: "image"` — the page uses a raster image as its background. The file referenced by `backgroundFilename` must exist inside the `.tgbl` archive.
- `backgroundType: "color"` — the page uses a solid color fill. `backgroundColor` must be a valid 6-digit hex color (e.g., `"#FFFFFF"`).
- `backgroundType: "inherit"` — the page inherits the resolved background of the previous page (by index order). NOT allowed on the first page (index 0).

### Page Size Presets

| Name   | Width (pt)   | Height (pt)  |
| ------ | ------------ | ------------ |
| A4     | 595          | 842          |
| A3     | 842          | 1191         |
| Letter | 612          | 792          |
| Legal  | 612          | 1008         |
| custom | user-defined | user-defined |

When `pageSize` is a named preset, `width` and `height` MUST match the preset values. When `pageSize` is `custom`, `width` and `height` are required and may be any positive number.

### Field Source Discriminator

Every field carries a `source` property that is one of two shapes:

```ts
type StaticSource<V> = { mode: 'static'; value: V }
type DynamicSource<V> = {
  mode: 'dynamic'
  jsonKey: string
  required: boolean
  placeholder: V | null // canvas-preview content; never consulted at PDF generation time
}
type FieldSource<V> = StaticSource<V> | DynamicSource<V>
```

`V` is fixed per field type:

- Text field: `V = string`.
- Image field: `V = { filename: string }`.
- Table field: `V = TableRow[]` where `TableRow = Record<string, string>`.

See Spec 023 — Field Source Model for the full resolution algorithm, runtime semantics, and validation rules.

### Shared `CellStyle`

Table fields reuse a single shared style object at every styling level (top-level header, top-level row, per-column, per-column header, odd/even row overrides). Every property is required at the top-level baseline slots (`headerStyle`, `rowStyle`) and optional at override slots (`Partial<CellStyle> | null`).

```ts
interface CellStyle {
  fontFamily: string
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

### Field Types

#### Common Field Properties

Every field (text, image, table) includes the following common properties in addition to its type-specific `style` and `source`:

- `id: string` — unique field identifier.
- `type: 'text' | 'image' | 'table'` — discriminator.
- `label: string` — human-facing name used in the left panel.
- `groupId: string | null` — optional group assignment (Spec 020).
- `pageId: string | null` — the `id` of the page this field belongs to. `null` resolves to the first page (index 0). Must reference a valid page `id` from the `pages` array.
- `x`, `y`, `width`, `height`, `zIndex: number` — geometry.

#### Text Field

```jsonc
{
  "id": "string",
  "type": "text",
  "label": "string",
  "groupId": null,
  "pageId": null,
  "x": 0,
  "y": 0,
  "width": 200,
  "height": 50,
  "zIndex": 0,
  "style": {
    "fontId": null,
    "fontFamily": "Helvetica",
    "fontSize": 12,
    "fontSizeDynamic": false,
    "fontSizeMin": 6,
    "lineHeight": 1.2,
    "fontWeight": "normal", // "normal" | "bold"
    "fontStyle": "normal", // "normal" | "italic"
    "textDecoration": "none", // "none" | "underline" | "line-through"
    "color": "#000000",
    "align": "left", // "left" | "center" | "right"
    "verticalAlign": "top", // "top" | "middle" | "bottom"
    "maxRows": 3,
    "overflowMode": "truncate", // "truncate" | "dynamic_font"
    "snapToGrid": false,
  },
  "source": { "mode": "static", "value": "Certificate of Completion" },
}
```

#### Image Field

```jsonc
{
  "id": "string",
  "type": "image",
  "label": "string",
  "groupId": null,
  "pageId": null,
  "x": 0,
  "y": 0,
  "width": 200,
  "height": 150,
  "zIndex": 0,
  "style": {
    "fit": "contain", // "fill" | "contain" | "cover"
  },
  "source": { "mode": "static", "value": { "filename": "logo.png" } },
}
```

`ImageFieldStyle.placeholderFilename` from the pre-2.0 schema is removed; the placeholder filename for dynamic image fields now lives in `source.placeholder.filename`.

#### Table Field

```jsonc
{
  "id": "string",
  "type": "table",
  "label": "string",
  "groupId": null,
  "pageId": null,
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 300,
  "zIndex": 0,
  "style": {
    "maxRows": 10,
    "maxColumns": 5,
    "multiPage": false,
    "showHeader": true,
    "headerStyle": {
      /* full CellStyle */
    },
    "rowStyle": {
      /* full CellStyle */
    },
    "oddRowStyle": null, // Partial<CellStyle> | null — applied to rows at odd 0-indexed positions (1, 3, 5…)
    "evenRowStyle": null, // Partial<CellStyle> | null — applied to rows at even 0-indexed positions (0, 2, 4…)
    "cellStyle": { "overflowMode": "truncate" }, // "truncate" | "dynamic_font"
    "columns": [
      {
        "key": "subject",
        "label": "Subject", // defaults to key if omitted
        "width": 100,
        "style": null, // Partial<CellStyle> | null — full per-column body override
        "headerStyle": null, // Partial<CellStyle> | null — per-column header override
      },
    ],
  },
  "source": {
    "mode": "static",
    "value": [{ "subject": "Math", "score": "90" }],
  },
}
```

#### Style Resolution Order (table)

Per property, not per object. A per-column override can replace `backgroundColor` alone while inheriting `fontFamily`, `fontSize`, etc. from the baseline.

For a header cell, per property:

1. `column.headerStyle` (if set and property present).
2. `style.headerStyle`.

For a body cell at 0-indexed row `i`, per property:

1. `column.style` (if set and property present).
2. If `i` is odd → `style.oddRowStyle`; if `i` is even → `style.evenRowStyle` (if set and property present).
3. `style.rowStyle`.

`showHeader: false` skips the header-drawing pass entirely — body rows start at the table's `y`.

### Archive Layout Reference

Static image content lives under `images/<filename>`. Dynamic image placeholders (canvas-preview only) live under `placeholders/<filename>`. The manifest stores bare filenames in both cases; the loader and writer handle the folder prefixes. See Spec 001 for the full archive layout.

### Happy Path

1. Engine reads `manifest.json` from the `.tgbl` archive.
2. Validates `version` against supported versions (`"2.0"`).
3. Resolves `pageSize` to canonical dimensions.
4. Validates the `pages` array: at least one page, unique ids, contiguous indices, valid background types.
5. Iterates over `fields`, validating each entry's `type`, corresponding `style` schema, `pageId` reference, and `source` discriminator.
6. Enforces `jsonKey` uniqueness per type namespace across all dynamic fields.
7. Verifies archive-existence of every filename referenced by static image `source.value.filename` (under `images/`) and dynamic image `source.placeholder.filename` (under `placeholders/`).
8. Returns a fully parsed and validated template object.

### Edge Cases

- `pageSize` is a preset but `width`/`height` do not match: reject with a dimension mismatch error.
- A field has an unknown `type` value: reject with an unknown field type error.
- `columns[].label` is omitted: default to the value of `columns[].key`.
- `fontSizeDynamic` is `true` but `fontSizeMin` is not set: default `fontSizeMin` to `6`.
- `pages` array is empty: reject with a schema validation error (at least one page required).
- `pages` array has duplicate `id` values: reject with a schema validation error.
- First page (index 0) has `backgroundType: "inherit"`: reject with a schema validation error.
- A field has a `pageId` that does not match any page `id`: reject with `INVALID_MANIFEST`.
- A field has `pageId: null`: assign to the first page (index 0) during validation.
- Static table with an empty `value: []`: valid — the table renders header only (subject to `showHeader`).
- Static text with `value: ""`: valid — the field renders as empty.
- Dynamic field with `placeholder: null`: valid — canvas uses a generic placeholder rendering.
- Same `jsonKey` on a text field and an image field: valid — namespaces are independent per type.
- Same `jsonKey` on two dynamic text fields: invalid — `DUPLICATE_JSON_KEY`.
- Static table row containing a key not declared in `style.columns`: invalid — `INVALID_TABLE_ROW`.
- `jsonKey === "__proto__"` (or any reserved prototype key): invalid — `INVALID_DYNAMIC_SOURCE`.

### Error Conditions

- `INVALID_MANIFEST` — catch-all for schema-shape violations (missing `version`, malformed `meta`, unknown field `type`, invalid `pageId`, unreachable `"inherit"` background, etc.).
- `INVALID_SOURCE_MODE` — `source` is missing, `source.mode` is absent, or `source.mode` is not `"static"` / `"dynamic"`.
- `INVALID_STATIC_VALUE` — `source.mode === "static"` but `value` is missing or the wrong shape for the field type.
- `INVALID_DYNAMIC_SOURCE` — `source.mode === "dynamic"` but `jsonKey`, `required`, or `placeholder` is missing or malformed, or `jsonKey` uses a reserved prototype-pollution name.
- `DUPLICATE_JSON_KEY` — two dynamic fields of the same type share a `jsonKey`.
- `INVALID_TABLE_ROW` — a static table row is not an object, is an array, or contains a key not declared in `style.columns`, or a cell value is not a string.
- `MISSING_STATIC_IMAGE_FILE` — a static image's `source.value.filename` is not present under `images/` in the archive.
- `MISSING_PLACEHOLDER_IMAGE_FILE` — a dynamic image's `source.placeholder.filename` is not present under `placeholders/` in the archive.

All errors are `TemplateGoblinError` instances carrying the code and contextual `details` (see Spec 021).

## Input / Output

```typescript
type StaticSource<V> = { mode: 'static'; value: V }
type DynamicSource<V> = {
  mode: 'dynamic'
  jsonKey: string
  required: boolean
  placeholder: V | null
}
type FieldSource<V> = StaticSource<V> | DynamicSource<V>

interface FieldBase {
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

interface TextField extends FieldBase {
  type: 'text'
  style: TextFieldStyle
  source: FieldSource<string>
}

interface ImageField extends FieldBase {
  type: 'image'
  style: ImageFieldStyle // { fit: 'fill' | 'contain' | 'cover' }
  source: FieldSource<{ filename: string }>
}

type TableRow = Record<string, string>

interface TableField extends FieldBase {
  type: 'table'
  style: TableFieldStyle
  source: FieldSource<TableRow[]>
}

type FieldDefinition = TextField | ImageField | TableField

interface PageDefinition {
  id: string
  index: number
  backgroundType: 'image' | 'color' | 'inherit'
  backgroundColor: string | null
  backgroundFilename: string | null
}

interface TemplateManifest {
  version: string // "2.0"
  meta: TemplateMeta
  pages: PageDefinition[]
  fonts: FontDefinition[]
  groups: GroupDefinition[]
  fields: FieldDefinition[]
}

function validateManifest(manifest: TemplateManifest): void
function resolvePageSize(
  pageSize: string,
  width?: number,
  height?: number,
): { width: number; height: number }
```

## Acceptance Criteria

- [ ] AC-001: A valid `manifest.json` with `version: "2.0"` and all required fields passes validation without errors.
- [ ] AC-002: A manifest with an unsupported `version` is rejected with `INVALID_MANIFEST`.
- [ ] AC-003: `resolvePageSize("A4")` returns `{ width: 595, height: 842 }`.
- [ ] AC-004: `resolvePageSize("A3")` returns `{ width: 842, height: 1191 }`.
- [ ] AC-005: `resolvePageSize("Letter")` returns `{ width: 612, height: 792 }`.
- [ ] AC-006: `resolvePageSize("Legal")` returns `{ width: 612, height: 1008 }`.
- [ ] AC-007: A field with `type: "unknown"` causes validation to fail with `INVALID_MANIFEST`.
- [ ] AC-008: Text field style missing required properties (e.g., `fontSize`) fails validation with `INVALID_MANIFEST`.
- [ ] AC-009: Image field style with `fit` value other than `fill`, `contain`, or `cover` fails validation with `INVALID_MANIFEST`.
- [ ] AC-010: Table column with omitted `label` defaults to the column's `key` value after parsing.
- [ ] AC-011: A manifest with an empty `pages` array fails validation.
- [ ] AC-012: A manifest with duplicate page `id` values fails validation.
- [ ] AC-013: A manifest where the first page (index 0) has `backgroundType: "inherit"` fails validation.
- [ ] AC-014: A manifest with `backgroundType: "image"` but missing `backgroundFilename` fails validation.
- [ ] AC-015: A manifest with `backgroundType: "color"` but missing or invalid `backgroundColor` fails validation.
- [ ] AC-016: A field with a `pageId` that does not match any page `id` fails validation with `INVALID_MANIFEST`.
- [ ] AC-017: A field with `pageId: null` is assigned to the first page (index 0) after validation.
- [ ] AC-018: A valid manifest with multiple pages, each with a valid background type, passes validation.
- [ ] AC-019: A field with a missing `source` property fails validation with `INVALID_SOURCE_MODE`.
- [ ] AC-020: A field with `source.mode: "analog"` fails validation with `INVALID_SOURCE_MODE`.
- [ ] AC-021: A static text field with `value: 42` fails validation with `INVALID_STATIC_VALUE`.
- [ ] AC-022: A static image field missing `filename` inside `source.value` fails validation with `INVALID_STATIC_VALUE`.
- [ ] AC-023: A static table field with `source.value = "oops"` fails validation with `INVALID_STATIC_VALUE`.
- [ ] AC-024: A dynamic field with an empty `jsonKey` fails validation with `INVALID_DYNAMIC_SOURCE`.
- [ ] AC-025: A dynamic field whose `jsonKey` is `"has space"` fails validation with `INVALID_DYNAMIC_SOURCE`.
- [ ] AC-026: A dynamic field whose `jsonKey` is one of `__proto__`, `constructor`, `prototype`, `hasOwnProperty`, `toString`, or `valueOf` fails validation with `INVALID_DYNAMIC_SOURCE`.
- [ ] AC-027: A dynamic field with `required` set to a non-boolean fails validation with `INVALID_DYNAMIC_SOURCE`.
- [ ] AC-028: Two dynamic text fields sharing `jsonKey: "name"` fail validation with `DUPLICATE_JSON_KEY`.
- [ ] AC-029: A dynamic text field with `jsonKey: "logo"` coexisting with a dynamic image field with `jsonKey: "logo"` passes validation.
- [ ] AC-030: A static table row containing a key not declared in `style.columns` fails validation with `INVALID_TABLE_ROW`.
- [ ] AC-031: A static image whose `source.value.filename` is absent from `images/` in the archive raises `MISSING_STATIC_IMAGE_FILE` at load time.
- [ ] AC-032: A dynamic image whose `source.placeholder.filename` is absent from `placeholders/` in the archive raises `MISSING_PLACEHOLDER_IMAGE_FILE` at load time.

## Dependencies

- Spec 001 — .tgbl File Format (archive layout: `manifest.json`, `images/`, `placeholders/`, `fonts/`, `backgrounds/`).
- Spec 003 — Text Rendering (how `TextField` style properties are honoured at render time).
- Spec 004 — Image Rendering (how `ImageField` style properties are honoured at render time).
- Spec 005 — Table Rendering (how `TableFieldStyle` and the style resolution order are honoured at render time).
- Spec 023 — Field Source Model (authoritative definition of `FieldSource<V>`, `resolveValue`, and per-mode validation).
- Spec 021 — Error Handling (`TemplateGoblinError`, error-code catalogue).

## Notes

- The `version` field uses semver-like strings. The current schema version is `"2.0"`. This is a hard break from `"1.0"` — there is no migration path. Pre-2.0 templates must be rebuilt; the project is pre-release and carries no backward-compatibility promise.
- The `locked` meta flag is reserved for a future feature that prevents edits via the UI builder.
- `meta.maxPages` serves as the hard limit for table-overflow page generation only. User-defined pages in the `pages` array are not counted against `maxPages`. The `pages` array defines the explicit structure; `maxPages` limits dynamic expansion from table overflow.
- `CellStyle` is defined once and reused at every level of `TableFieldStyle` — baseline header, baseline row, odd/even overrides, per-column body overrides, per-column header overrides. Implementations must resolve style per property, not per object.
- The editor's rendering engine is Fabric.js (v6); the manifest schema defined above is engine-agnostic. The UI serialises Fabric's object tree into `FieldDefinition[]` at save time and rebuilds Fabric objects from `FieldDefinition[]` at load time. See spec 009 §F-Mapping for the Fabric↔Field mapping. Neither the schema nor the PDF output pipeline (`packages/core`, PDFKit) has any dependency on the editor's rendering engine — swapping Fabric for another 2D canvas library in the future would touch only `packages/ui`.

## F-Mapping

The UI binds `FieldDefinition` instances to Fabric objects via the following mapping. This is a pointer to spec 009 §F-Mapping; the authoritative mapping lives there.

| Fabric construct                             | Template-schema mapping                                                                        |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `fabric.Group` with custom `__fieldId` prop  | One `FieldDefinition` of any type                                                              |
| `fabric.Rect` child                          | Visible bounds: `field.x`, `field.y`, `field.width`, `field.height`, plus stroke/fill          |
| `fabric.Text` child                          | `TextField` label text (and, when resolvable, the rendered value)                              |
| `fabric.Image` child                         | `ImageField` content — static `source.value.filename` OR dynamic `source.placeholder.filename` |
| `fabric.Group` of cells                      | `TableField` content                                                                           |
| `canvas.backgroundImage` / `backgroundColor` | `PageDefinition.backgroundFilename` / `backgroundColor`                                        |
