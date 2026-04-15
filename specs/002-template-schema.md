# Spec 002 — Template Schema

## Status

Draft

## Summary

Defines the structure and validation rules for `manifest.json`, the central configuration file inside every `.tgbl` archive. The manifest describes template metadata, page dimensions, page definitions (multi-page support), fonts, field groups, and individual fields (text, image, loop) along with their type-specific style schemas.

## Requirements

- [ ] REQ-001: Validate `manifest.json` against the defined schema on both read and write, rejecting documents with missing or invalid properties.
- [ ] REQ-002: Check the `version` field and reject manifests whose version is unsupported by the current engine.
- [ ] REQ-003: Resolve named page size presets (`A4`, `A3`, `Letter`, `Legal`) to their canonical point dimensions; support `custom` with explicit width/height.
- [ ] REQ-004: Validate the `type` field of each entry in the `fields` array, accepting only `text`, `image`, and `loop`.
- [ ] REQ-005: Validate style objects per field type — text fields use the text style schema, image fields use the image style schema, and loop fields use the loop style schema.
- [ ] REQ-006: Validate the `pages` array in the manifest. Every manifest MUST contain at least one page definition. Each page must have a unique `id` and a valid `index` (0-based, contiguous, no gaps).
- [ ] REQ-007: Validate `PageDefinition.backgroundType` — must be one of `"image"`, `"color"`, or `"inherit"`. If `"image"`, `backgroundFilename` must be a non-empty string pointing to a file in the archive. If `"color"`, `backgroundColor` must be a valid hex color string. If `"inherit"`, the page inherits the background from the previous page (invalid for the first page unless another page precedes it in index order).
- [ ] REQ-008: Validate that every field's `pageId` references a valid page `id` from the `pages` array, or is `null` (in which case the field is assigned to the first page).
- [ ] REQ-009: The first page (index 0) MUST NOT use `backgroundType: "inherit"` — it must define its own background explicitly (`"image"` or `"color"`).

## Behaviour

### Manifest Structure

```jsonc
{
  "version": "1.0",
  "meta": {
    "name": "string",
    "width": 595, // points
    "height": 842, // points
    "unit": "pt",
    "pageSize": "A4", // "custom" | "A4" | "A3" | "Letter" | "Legal"
    "locked": false,
    "maxPages": 50, // hard limit for loop-overflow pages
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
  },
  "pages": [
    // see PageDefinition below
  ],
  "fonts": [{ "id": "string", "filename": "string" }],
  "groups": [{ "id": "string", "label": "string", "fieldIds": ["string"] }],
  "fields": [
    // see field schemas below — each field has a `pageId`
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
- `backgroundType: "inherit"` — the page inherits the resolved background of the previous page (by index order). This is NOT allowed on the first page (index 0).

When pages are reordered, `index` values are renumbered to remain 0-based and contiguous. Any page using `"inherit"` resolves from the page immediately before it in index order at render time.

### Page Size Presets

| Name   | Width (pt)   | Height (pt)  |
| ------ | ------------ | ------------ |
| A4     | 595          | 842          |
| A3     | 842          | 1191         |
| Letter | 612          | 792          |
| Legal  | 612          | 1008         |
| custom | user-defined | user-defined |

When `pageSize` is a named preset, `width` and `height` MUST match the preset values. When `pageSize` is `custom`, `width` and `height` are required and may be any positive number.

### Field Types

#### Common Field Properties

Every field (text, image, loop) includes the following common properties in addition to its type-specific properties:

- `pageId: string | null` — the `id` of the page this field belongs to. If `null`, the field is assigned to the first page (index 0). Must reference a valid page `id` from the `pages` array.

#### Text Field

```jsonc
{
  "id": "string",
  "type": "text",
  "label": "string",
  "pageId": "string | null", // page this field belongs to
  "x": 0,
  "y": 0,
  "width": 200,
  "height": 50,
  "style": {
    "fontId": "string",
    "fontFamily": "string",
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
}
```

#### Image Field

```jsonc
{
  "id": "string",
  "type": "image",
  "label": "string",
  "pageId": "string | null", // page this field belongs to
  "x": 0,
  "y": 0,
  "width": 200,
  "height": 150,
  "style": {
    "fit": "contain", // "fill" | "contain" | "cover"
    "placeholderFilename": "string",
  },
}
```

#### Loop Field

```jsonc
{
  "id": "string",
  "type": "loop",
  "label": "string",
  "pageId": "string | null", // page this field belongs to
  "x": 0,
  "y": 0,
  "width": 500,
  "height": 300,
  "style": {
    "maxRows": 10,
    "maxColumns": 5,
    "multiPage": false,
    "headerStyle": {
      "fontSize": 10,
      "fontWeight": "bold",
      "color": "#000000",
      "backgroundColor": "#EEEEEE",
      "borderWidth": 1,
      "borderColor": "#000000",
      "paddingTop": 2,
      "paddingBottom": 2,
      "paddingLeft": 4,
      "paddingRight": 4,
    },
    "rowStyle": {
      "fontSize": 10,
      "fontWeight": "normal",
      "color": "#000000",
      "backgroundColor": "#FFFFFF",
      "borderWidth": 1,
      "borderColor": "#CCCCCC",
      "paddingTop": 2,
      "paddingBottom": 2,
      "paddingLeft": 4,
      "paddingRight": 4,
    },
    "cellStyle": {
      "overflowMode": "truncate", // "truncate" | "dynamic_font"
    },
    "columns": [
      {
        "key": "string",
        "label": "string", // defaults to key if omitted
        "width": 100,
        "style": {
          // optional per-column overrides
          "fontSize": 10,
          "fontWeight": "normal",
          "textDecoration": "none",
          "color": "#000000",
          "align": "left",
        },
      },
    ],
  },
}
```

### Happy Path

1. Engine reads `manifest.json` from the `.tgbl` archive.
2. Validates the `version` field against supported versions.
3. Resolves `pageSize` to canonical dimensions.
4. Validates the `pages` array: at least one page, unique ids, contiguous indices, valid background types.
5. Iterates over `fields`, validating each entry's `type`, corresponding `style` schema, and `pageId` reference.
6. Returns a fully parsed and validated template object.

### Edge Cases

- `pageSize` is a preset but `width`/`height` do not match: reject with a dimension mismatch error.
- A field has an unknown `type` value: reject with an unknown field type error.
- `columns[].label` is omitted: default to the value of `columns[].key`.
- `fontSizeDynamic` is `true` but `fontSizeMin` is not set: default `fontSizeMin` to `6`.
- `pages` array is empty: reject with a schema validation error (at least one page required).
- `pages` array has duplicate `id` values: reject with a schema validation error.
- `pages` array has non-contiguous or duplicate `index` values: reject with a schema validation error.
- First page (index 0) has `backgroundType: "inherit"`: reject with a schema validation error.
- A field has a `pageId` that does not match any page `id`: reject with an `InvalidFieldError`.
- A field has `pageId: null`: assign to the first page (index 0) during validation.
- `backgroundType: "image"` but `backgroundFilename` is missing or empty: reject with a schema validation error.
- `backgroundType: "color"` but `backgroundColor` is missing or not a valid hex color: reject with a schema validation error.

### Error Conditions

- Schema validation failure: throw `SchemaValidationError` listing all violations.
- Unsupported version: throw `UnsupportedVersionError` with the found and expected versions.
- Unknown field type: throw `UnknownFieldTypeError` with the offending type string.
- Invalid page reference: throw `InvalidFieldError` when a field's `pageId` does not match any page `id`.
- Invalid page definition: throw `SchemaValidationError` when page definitions violate constraints (missing background, inherit on first page, etc.).

## Input / Output

```typescript
interface PageDefinition {
  id: string
  index: number
  backgroundType: 'image' | 'color' | 'inherit'
  backgroundColor?: string // required when backgroundType is 'color'
  backgroundFilename?: string // required when backgroundType is 'image'
}

interface Manifest {
  version: string
  meta: TemplateMeta
  pages: PageDefinition[]
  fonts: FontEntry[]
  groups: GroupEntry[]
  fields: (TextField | ImageField | LoopField)[] // each field has pageId: string | null
}

function validateManifest(raw: unknown): Manifest
function resolvePageSize(
  pageSize: string,
  width?: number,
  height?: number,
): { width: number; height: number }
```

## Acceptance Criteria

- [ ] AC-001: A valid `manifest.json` with all required fields passes validation without errors.
- [ ] AC-002: A manifest with an unsupported `version` is rejected with `UnsupportedVersionError`.
- [ ] AC-003: `resolvePageSize("A4")` returns `{ width: 595, height: 842 }`.
- [ ] AC-004: `resolvePageSize("A3")` returns `{ width: 842, height: 1191 }`.
- [ ] AC-005: `resolvePageSize("Letter")` returns `{ width: 612, height: 792 }`.
- [ ] AC-006: `resolvePageSize("Legal")` returns `{ width: 612, height: 1008 }`.
- [ ] AC-007: A field with `type: "unknown"` causes validation to fail with `UnknownFieldTypeError`.
- [ ] AC-008: Text field style missing required properties (e.g., `fontSize`) fails validation.
- [ ] AC-009: Image field style with `fit` value other than `fill`, `contain`, or `cover` fails validation.
- [ ] AC-010: Loop field column with omitted `label` defaults to the column's `key` value after parsing.
- [ ] AC-011: A manifest with an empty `pages` array fails validation with `SchemaValidationError`.
- [ ] AC-012: A manifest with duplicate page `id` values fails validation with `SchemaValidationError`.
- [ ] AC-013: A manifest where the first page (index 0) has `backgroundType: "inherit"` fails validation.
- [ ] AC-014: A manifest with `backgroundType: "image"` but missing `backgroundFilename` fails validation.
- [ ] AC-015: A manifest with `backgroundType: "color"` but missing or invalid `backgroundColor` fails validation.
- [ ] AC-016: A field with a `pageId` that does not match any page `id` fails validation with `InvalidFieldError`.
- [ ] AC-017: A field with `pageId: null` is assigned to the first page (index 0) after validation.
- [ ] AC-018: A valid manifest with multiple pages, each with a valid background type, passes validation.

## Dependencies

- Spec 001 — .tgbl File Format (manifest is read from the archive defined there).

## Notes

- The `version` field uses semver-like strings. For now only `"1.0"` is supported. Future versions may introduce migration logic.
- The `locked` meta flag is reserved for a future feature that prevents edits via the UI builder.
- Open question: should `groups` be required or optional? Currently treated as required but may be an empty array.
- `meta.maxPages` now serves as the hard limit for loop-overflow page generation only. User-defined pages in the `pages` array are not counted against `maxPages`. The `pages` array defines the explicit structure; `maxPages` limits dynamic expansion from table overflow.
- Migration note: templates created before multi-page support (no `pages` array) should be auto-migrated by wrapping the existing `background.png` into a single-page `pages` array with `backgroundType: "image"`.
