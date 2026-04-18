# Spec 023 — Field Source Model

## Status

Draft

## Summary

`FieldSource<V>` is the discriminated union that every field in a TemplateGoblin manifest carries as its `source` property. It answers one question: where does the runtime value for this field come from? The answer is either `static` (baked into the template and rendered on every generated PDF) or `dynamic` (supplied at `generatePDF` time via `InputJSON`). Nesting this decision under a single `source` property isolates mode-specific data from geometry and style so that switching mode becomes a single replacement of `field.source` with nothing else touched. This spec defines the type, the validation rules, the runtime resolution algorithm (`resolveValue`), and the set of error codes that cover every invariant.

## Requirements

- [ ] REQ-001: Every field (text, image, table) MUST have a `source` property. Missing `source` raises `INVALID_SOURCE_MODE`.
- [ ] REQ-002: `source.mode` MUST be exactly `"static"` or `"dynamic"`. Any other value (including `undefined`, misspellings, or uppercase variants) raises `INVALID_SOURCE_MODE`.
- [ ] REQ-003: When `source.mode === "static"`, `source.value` MUST be present and shape-matching for the field type:
  - Text field: `string`.
  - Image field: `{ filename: string }` where `filename` is non-empty.
  - Table field: `TableRow[]` where each row is a `Record<string, string>` whose keys are a subset of the owning table's declared column keys.
    Violations raise `INVALID_STATIC_VALUE`. Static-table row-shape violations raise `INVALID_TABLE_ROW` specifically.
- [ ] REQ-004: When `source.mode === "dynamic"`, `source.placeholder` MUST be either `null` or shape-matching for the field type. For dynamic image fields, if `placeholder !== null`, the referenced `filename` MUST exist under `placeholders/` in the archive (checked at load time and raising `MISSING_PLACEHOLDER_IMAGE_FILE` when absent). Shape violations raise `INVALID_DYNAMIC_SOURCE`.
- [ ] REQ-005: When `source.mode === "dynamic"`, `source.jsonKey` MUST be a non-empty string that matches `/^[A-Za-z_][A-Za-z0-9_]*$/` AND MUST NOT equal any of the reserved prototype-pollution names: `__proto__`, `constructor`, `prototype`, `hasOwnProperty`, `toString`, `valueOf`. This matches the `isSafeKey` predicate used by the validator. Violations raise `INVALID_DYNAMIC_SOURCE`.
- [ ] REQ-006: When `source.mode === "dynamic"`, `source.required` MUST be a strict boolean. A missing or non-boolean value raises `INVALID_DYNAMIC_SOURCE`.
- [ ] REQ-007: `jsonKey` uniqueness is enforced per type namespace. Two dynamic `text` fields cannot share a `jsonKey`; two dynamic `image` fields cannot share a `jsonKey`; two dynamic `table` fields cannot share a `jsonKey`. The same `jsonKey` MAY appear on fields of different types (e.g. a text `logo` and an image `logo` coexist) because each type has its own bucket in `InputJSON`. Violations raise `DUPLICATE_JSON_KEY`.
- [ ] REQ-008: Every row inside a static table's `source.value` MUST declare only keys drawn from the owning table's `style.columns[].key` set, and every cell value MUST be a string. Violations raise `INVALID_TABLE_ROW`.

## Behaviour

### Resolution algorithm (`resolveValue`)

At the start of each field's render step, the renderer resolves the runtime value by consulting the field's `source` and, when dynamic, the matching `InputJSON` bucket:

```ts
function resolveValue<V>(
  field: { source: FieldSource<V> },
  input: InputJSON,
  typeBucket: keyof InputJSON,
): V | undefined {
  if (field.source.mode === 'static') return field.source.value
  const bucket = (input[typeBucket] ?? {}) as Record<string, unknown>
  return bucket[field.source.jsonKey] as V | undefined
}
```

`resolveValue` is the single place in the rendering pipeline that needs to know about modes. Downstream rendering logic (text wrapping, image fit, table layout, multi-page overflow) consumes the resolved value unchanged. When an `InputJSON` bucket (`texts`, `images`, `tables`) is absent entirely, `resolveValue` treats it as an empty bucket and returns `undefined` for any dynamic lookup; static fields are unaffected.

### Placeholder semantics

`DynamicSource.placeholder` is **designer-time canvas-preview content**. It has the same shape as the eventual runtime value but is never consulted at PDF generation. The builder UI uses it to draw a meaningful preview for a dynamic field before real data is supplied. If `placeholder === null` the UI falls back to a generic placeholder rendering (empty string, generic icon, empty table).

### Style is mode-orthogonal

Switching a field's `source.mode` replaces `field.source` entirely but leaves `field.style`, geometry (`x`, `y`, `width`, `height`, `zIndex`), `label`, `groupId`, and `pageId` unchanged. The UI uses this invariant to let the designer flip modes without losing style or position; spec 013 (right panel) and design 2026-04-18 §8.2 describe the UX.

### Required-field validation

Input-data validation (Spec 021's `validateData`) considers a field "required" only when it is dynamic AND `source.required === true`. For such fields, the corresponding bucket entry MUST be present (not `undefined`, not `null`, not the empty string). Absence raises `MISSING_REQUIRED_FIELD` with the offending `jsonKey`. Static fields contribute nothing to input-data validation.

### Edge cases

- **Empty static text** (`value: ""`): valid — the field renders empty. No error is raised.
- **Empty static table** (`value: []`): valid — the header row renders (subject to `showHeader`) but no body rows.
- **`placeholder: null`** on a dynamic field: valid — canvas uses a generic placeholder rendering.
- **Dynamic field with missing bucket**: when the renderer receives `InputJSON` with the relevant bucket absent entirely, `resolveValue` returns `undefined`. Optional dynamic fields skip rendering. Required dynamic fields fail validation up-front with `MISSING_REQUIRED_FIELD`.
- **Mode flip preserves style**: switching a field from dynamic to static (or vice-versa) replaces `source` alone; `style` and geometry are retained by the UI.
- **Shared `jsonKey` across types**: allowed. Namespaces are per-type; `texts.logo` and `images.logo` are independent entries.
- **Static table row with unknown key**: rejected at load with `INVALID_TABLE_ROW`.
- **`jsonKey === "__proto__"`** (or any reserved name): rejected at load with `INVALID_DYNAMIC_SOURCE`.

### Error conditions

| Code                             | Raised when …                                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `INVALID_SOURCE_MODE`            | `source` is missing, or `source.mode` is not exactly `"static"` / `"dynamic"`.                                              |
| `INVALID_STATIC_VALUE`           | `source.mode === "static"` but `value` is missing or the wrong shape for the field type.                                    |
| `INVALID_DYNAMIC_SOURCE`         | `source.mode === "dynamic"` but `jsonKey`, `required`, or `placeholder` is missing or malformed.                            |
| `DUPLICATE_JSON_KEY`             | Two dynamic fields of the same type share a `jsonKey`.                                                                      |
| `INVALID_TABLE_ROW`              | A static table row is not a plain object, or contains a key not declared in `style.columns`, or has non-string values.      |
| `MISSING_STATIC_IMAGE_FILE`      | A static image's `source.value.filename` is not present under `images/` in the archive (checked at load time).              |
| `MISSING_PLACEHOLDER_IMAGE_FILE` | A dynamic image's `source.placeholder.filename` is not present under `placeholders/` in the archive (checked at load time). |
| `MISSING_REQUIRED_FIELD`         | A dynamic field with `required: true` has no entry in the corresponding `InputJSON` bucket.                                 |

All errors surface as `TemplateGoblinError` instances carrying structured `details` (field id, jsonKey, expected shape) per Spec 021.

## Input / Output

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
 * shape for the field type: `string` for text, `{ filename: string }` for
 * image, `TableRow[]` for table (`TableRow = Record<string, string>`).
 */
export type FieldSource<V> = StaticSource<V> | DynamicSource<V>

/** Narrow `FieldSource<V>` to `StaticSource<V>`. */
export function isStaticSource<V>(source: FieldSource<V>): source is StaticSource<V>

/** Narrow `FieldSource<V>` to `DynamicSource<V>`. */
export function isDynamicSource<V>(source: FieldSource<V>): source is DynamicSource<V>

/**
 * Resolve a field's runtime value.
 *
 * For static fields returns `source.value`.
 * For dynamic fields returns the entry from the matching InputJSON bucket, or
 * `undefined` when the key is absent (or the bucket itself is absent).
 *
 * Never consults `source.placeholder`.
 */
export function resolveValue(field: TextField, input: InputJSON): string | undefined
export function resolveValue(
  field: ImageField,
  input: InputJSON,
): ImageSourceValue | Buffer | string | undefined
export function resolveValue(field: TableField, input: InputJSON): TableRow[] | undefined
```

## Acceptance Criteria

- [ ] AC-001: (REQ-001) A field with a missing `source` property fails validation with `INVALID_SOURCE_MODE`.
- [ ] AC-002: (REQ-002) A field with `source.mode: "analog"` fails validation with `INVALID_SOURCE_MODE`.
- [ ] AC-003: (REQ-003) A static text field with `value: 42` fails validation with `INVALID_STATIC_VALUE`; a static image field with `value: {}` fails with `INVALID_STATIC_VALUE`; a static table field with `value: "oops"` fails with `INVALID_STATIC_VALUE`.
- [ ] AC-004: (REQ-004) A dynamic image field with `placeholder: { filename: "missing.png" }` fails at load time with `MISSING_PLACEHOLDER_IMAGE_FILE` when the file is absent from `placeholders/`.
- [ ] AC-005: (REQ-005) A dynamic field with `jsonKey: ""` fails validation with `INVALID_DYNAMIC_SOURCE`; a dynamic field with `jsonKey: "has space"` fails with `INVALID_DYNAMIC_SOURCE`; a dynamic field with `jsonKey: "__proto__"` (or any other reserved name) fails with `INVALID_DYNAMIC_SOURCE`.
- [ ] AC-006: (REQ-006) A dynamic field with `required: "yes"` fails validation with `INVALID_DYNAMIC_SOURCE`.
- [ ] AC-007: (REQ-007) Two dynamic text fields sharing `jsonKey: "name"` fail validation with `DUPLICATE_JSON_KEY`; a dynamic text field with `jsonKey: "logo"` coexisting with a dynamic image field with `jsonKey: "logo"` passes validation.
- [ ] AC-008: (REQ-008) A static table row containing a key not declared in `style.columns` fails validation with `INVALID_TABLE_ROW`; a row whose cell value is not a string fails with `INVALID_TABLE_ROW`.
- [ ] AC-009: `resolveValue` on a static text field returns the baked-in string regardless of `InputJSON` contents.
- [ ] AC-010: `resolveValue` on a dynamic text field with `jsonKey: "greeting"` and `InputJSON.texts.greeting = "Hi"` returns `"Hi"`.
- [ ] AC-011: `resolveValue` on a dynamic field whose bucket is absent entirely returns `undefined` without throwing.
- [ ] AC-012: Flipping a field's `source.mode` in the UI does not disturb `style`, geometry, `label`, `groupId`, or `pageId`.

## Dependencies

- Spec 002 — Template Schema (defines how `source` sits on each field and lists the per-type shapes).
- Spec 021 — Error Handling (catalogues the error codes used here and the `TemplateGoblinError` envelope).

## Notes

- The v2.0 schema break introduced `FieldSource<V>` wholesale. There is no migration from v1.0 manifests; pre-release users must rebuild their templates.
- `resolveValue` is deliberately a single generic function with per-type overloads rather than three separate helpers. Extending to new field types (e.g., barcodes, QR codes) requires only a new overload and a new `V` instantiation.
- Future work: per-field help text accompanying the `jsonKey` (usage hints surfaced in the JSON preview), conditional dynamic fields (rendered only when another field has a given value), and computed fields whose value derives from other fields. None of these are planned for Phase 1; each can be layered on without disturbing the current `FieldSource<V>` shape.
