# Spec 002 — Template Schema

## Status

Draft

## Summary

Defines the structure and validation rules for `manifest.json`, the central configuration file inside every `.tgbl` archive. The manifest describes template metadata, page dimensions, fonts, field groups, and individual fields (text, image, loop) along with their type-specific style schemas.

## Requirements

- [ ] REQ-001: Validate `manifest.json` against the defined schema on both read and write, rejecting documents with missing or invalid properties.
- [ ] REQ-002: Check the `version` field and reject manifests whose version is unsupported by the current engine.
- [ ] REQ-003: Resolve named page size presets (`A4`, `A3`, `Letter`, `Legal`) to their canonical point dimensions; support `custom` with explicit width/height.
- [ ] REQ-004: Validate the `type` field of each entry in the `fields` array, accepting only `text`, `image`, and `loop`.
- [ ] REQ-005: Validate style objects per field type — text fields use the text style schema, image fields use the image style schema, and loop fields use the loop style schema.

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
    "maxPages": 1,
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601",
  },
  "fonts": [{ "id": "string", "filename": "string" }],
  "groups": [{ "id": "string", "label": "string", "fieldIds": ["string"] }],
  "fields": [
    // see field schemas below
  ],
}
```

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

#### Text Field

```jsonc
{
  "id": "string",
  "type": "text",
  "label": "string",
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
4. Iterates over `fields`, validating each entry's `type` and corresponding `style` schema.
5. Returns a fully parsed and validated template object.

### Edge Cases

- `pageSize` is a preset but `width`/`height` do not match: reject with a dimension mismatch error.
- A field has an unknown `type` value: reject with an unknown field type error.
- `columns[].label` is omitted: default to the value of `columns[].key`.
- `fontSizeDynamic` is `true` but `fontSizeMin` is not set: default `fontSizeMin` to `6`.

### Error Conditions

- Schema validation failure: throw `SchemaValidationError` listing all violations.
- Unsupported version: throw `UnsupportedVersionError` with the found and expected versions.
- Unknown field type: throw `UnknownFieldTypeError` with the offending type string.

## Input / Output

```typescript
interface Manifest {
  version: string
  meta: TemplateMeta
  fonts: FontEntry[]
  groups: GroupEntry[]
  fields: (TextField | ImageField | LoopField)[]
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

## Dependencies

- Spec 001 — .tgbl File Format (manifest is read from the archive defined there).

## Notes

- The `version` field uses semver-like strings. For now only `"1.0"` is supported. Future versions may introduce migration logic.
- The `locked` meta flag is reserved for a future feature that prevents edits via the UI builder.
- Open question: should `groups` be required or optional? Currently treated as required but may be an empty array.
