# Spec 021 — Error Handling

## Status

Draft

## Summary

Establishes a unified error handling strategy for the TemplateGoblin library and UI. All errors extend a base `TemplateGoblinError` class with a machine-readable `code` property. The library surfaces structured errors with code and message for programmatic handling, while the UI translates these into user-friendly toasts, banners, inline warnings, and confirmation dialogs. No raw stack traces are ever shown to end users.

## Requirements

- [ ] REQ-001: All errors thrown by the TemplateGoblin library MUST extend a base `TemplateGoblinError` class.
- [ ] REQ-002: Every `TemplateGoblinError` instance MUST include a `code` property (string enum) and a human-readable `message`.
- [ ] REQ-003: Define the following error codes: `FILE_NOT_FOUND`, `INVALID_FORMAT`, `MISSING_MANIFEST`, `INVALID_MANIFEST`, `MISSING_ASSET`, `MISSING_REQUIRED_FIELD`, `INVALID_DATA_TYPE`, `MAX_PAGES_EXCEEDED`, `FONT_LOAD_FAILED`, `PDF_GENERATION_FAILED`, `INVALID_SOURCE_MODE`, `INVALID_STATIC_VALUE`, `MISSING_STATIC_IMAGE_FILE`, `MISSING_PLACEHOLDER_IMAGE_FILE`, `INVALID_DYNAMIC_SOURCE`, `DUPLICATE_JSON_KEY`, `INVALID_TABLE_ROW`.
- [ ] REQ-004: Library errors MUST include sufficient context (e.g., field name, expected type, file path) for consumers to act on them.
- [ ] REQ-005: The UI MUST display file-level errors (load/save failures) as toast notifications or banners.
- [ ] REQ-006: The UI MUST display inline warnings for duplicate JSON keys in data input.
- [ ] REQ-007: The UI MUST prompt for a missing background image rather than failing silently.
- [ ] REQ-008: The UI MUST show a confirmation dialog before removing a font that is referenced by fields.
- [ ] REQ-009: The UI MUST display PDF generation errors in the preview panel with a clear message.
- [ ] REQ-010: No raw stack traces or internal error objects are ever displayed to end users in the UI.
- [ ] REQ-011: Provide a `ValidationResult` type for batch validation that collects all errors rather than failing on the first one.

## Behaviour

### Error Codes

| Code                             | When Thrown                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------- |
| `FILE_NOT_FOUND`                 | The specified `.tgbl` file path does not exist.                                                    |
| `INVALID_FORMAT`                 | The file is not a valid ZIP archive (PK header check fails).                                       |
| `MISSING_MANIFEST`               | The `.tgbl` archive does not contain `manifest.json`.                                              |
| `INVALID_MANIFEST`               | `manifest.json` fails schema validation.                                                           |
| `MISSING_ASSET`                  | A referenced asset (background, font, placeholder) is missing.                                     |
| `MISSING_REQUIRED_FIELD`         | Required data fields are absent when generating a PDF.                                             |
| `INVALID_DATA_TYPE`              | A data field value does not match the expected type.                                               |
| `MAX_PAGES_EXCEEDED`             | Table data would produce more pages than `maxPages` allows.                                        |
| `FONT_LOAD_FAILED`               | A font file in the archive cannot be parsed or loaded.                                             |
| `PDF_GENERATION_FAILED`          | An unrecoverable error occurred during PDF rendering.                                              |
| `INVALID_SOURCE_MODE`            | `field.source` is missing or `source.mode` is not `"static"` / `"dynamic"`.                        |
| `INVALID_STATIC_VALUE`           | `source.mode === "static"` but `source.value` is missing or the wrong shape.                       |
| `MISSING_STATIC_IMAGE_FILE`      | Static image's `source.value.filename` is absent from the archive's `images/` folder.              |
| `MISSING_PLACEHOLDER_IMAGE_FILE` | Dynamic image's `source.placeholder.filename` is absent from the archive's `placeholders/` folder. |
| `INVALID_DYNAMIC_SOURCE`         | `source.mode === "dynamic"` but `jsonKey`, `required`, or `placeholder` is missing or malformed.   |
| `DUPLICATE_JSON_KEY`             | Two dynamic fields of the same type share a `jsonKey`.                                             |
| `INVALID_TABLE_ROW`              | A static table row is not an object or contains a key not declared in `style.columns`.             |

### Library Behaviour

1. Each error is instantiated with `new TemplateGoblinError(code, message, details?)`.
2. The `details` object carries contextual data (e.g., `{ field: "studentName", expected: "string", received: "number" }`).
3. Validation functions return a `ValidationResult` rather than throwing, allowing callers to inspect all issues at once.
4. Generation functions (`generatePDF`) throw on fatal errors after attempting to collect as much context as possible.

### UI Behaviour

1. **File errors** (`FILE_NOT_FOUND`, `INVALID_FORMAT`, `MISSING_MANIFEST`): Toast notification at the top of the screen with a dismiss button. Message example: "Could not open template: the file format is invalid."
2. **Duplicate JSON keys**: Inline warning badge next to the data input field. Message example: "Duplicate key 'name' detected -- only the last value will be used."
3. **Missing background**: Modal prompt asking the user to upload a background image before continuing.
4. **Font removal**: Confirmation dialog listing affected fields. Options: "Remove Anyway" (resets fields to default font) or "Cancel."
5. **Preview errors** (`PDF_GENERATION_FAILED`, `FONT_LOAD_FAILED`): Error overlay in the preview panel with a retry button. Message example: "Preview failed: could not load font 'CustomSerif'. Check that the font file is valid."
6. **Validation errors** (`MISSING_REQUIRED_FIELD`, `INVALID_DATA_TYPE`): Displayed as a list in a validation summary panel before generation proceeds.

### Edge Cases

- Multiple errors in a single validation pass: all are collected into `ValidationResult.errors[]` and returned together.
- An error code not recognized by the UI (future codes): display a generic "An unexpected error occurred" toast with the error code for reference.
- Nested errors (e.g., `PDF_GENERATION_FAILED` caused by `FONT_LOAD_FAILED`): the outer error's `details` includes a `cause` property referencing the inner error.

### Error Conditions

- All error conditions are self-describing by design; this spec defines the framework itself.

## Input / Output

```typescript
class TemplateGoblinError extends Error {
  readonly code: ErrorCode
  readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>)
}

type ErrorCode =
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
  | 'INVALID_SOURCE_MODE'
  | 'INVALID_STATIC_VALUE'
  | 'MISSING_STATIC_IMAGE_FILE'
  | 'MISSING_PLACEHOLDER_IMAGE_FILE'
  | 'INVALID_DYNAMIC_SOURCE'
  | 'DUPLICATE_JSON_KEY'
  | 'INVALID_TABLE_ROW'

interface ValidationError {
  code: ErrorCode
  field?: string
  message: string
}

interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

function validateTemplate(manifest: unknown): ValidationResult
function validateData(manifest: Manifest, data: Record<string, unknown>): ValidationResult
```

## Acceptance Criteria

- [ ] AC-001: All library errors are instances of `TemplateGoblinError` and include a `code` property.
- [ ] AC-002: Passing a non-existent file path to `loadTemplate()` throws with code `FILE_NOT_FOUND`.
- [ ] AC-003: Passing a file with invalid ZIP headers throws with code `INVALID_FORMAT`.
- [ ] AC-004: A `.tgbl` without `manifest.json` throws with code `MISSING_MANIFEST`.
- [ ] AC-005: A manifest that fails schema validation throws with code `INVALID_MANIFEST`.
- [ ] AC-006: Generating a PDF with missing required data fields throws with code `MISSING_REQUIRED_FIELD`.
- [ ] AC-007: Generating a PDF with wrong data types throws with code `INVALID_DATA_TYPE`.
- [ ] AC-008: Table data exceeding `maxPages` throws with code `MAX_PAGES_EXCEEDED`.
- [ ] AC-009: A corrupt font file triggers `FONT_LOAD_FAILED` with the font ID in details.
- [ ] AC-010: `validateData()` returns a `ValidationResult` with `valid: false` and a populated `errors` array when data is invalid.
- [ ] AC-011: The UI never displays raw stack traces to the user; all errors are shown as user-friendly messages.
- [ ] AC-012: File load errors appear as toast notifications in the UI.
- [ ] AC-013: Preview generation errors appear as an overlay in the preview panel with a retry option.

## Dependencies

- All other specs. This spec provides the error handling foundation used across the entire project.

## Notes

- Error codes are intentionally broad categories. The `message` and `details` properties carry the specifics.
- Open question: should we provide an error-code-to-HTTP-status mapping for potential future server-side usage?
- Open question: should `ValidationResult` include warnings (non-fatal) in addition to errors?
