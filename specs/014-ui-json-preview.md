# Spec 014 — UI JSON Preview

## Status

Draft

## Summary

Defines the JSON preview panel in the template builder UI. As the user adds and configures fields on the canvas, the panel auto-generates a JSON object that matches the exact structure expected by the core library's `generatePDF()` function. The panel supports three data modes -- Default, Max, and Min -- to help designers preview how their template behaves with varying data volumes. The JSON is syntax-highlighted, copyable with a single click, and accompanied by an approximate PDF file size estimate.

## Requirements

- [ ] REQ-001: Auto-generate a JSON preview object that updates in real time as fields are added, removed, or modified on the canvas.
- [ ] REQ-002: The generated JSON MUST match the exact structure accepted by the `generatePDF()` function defined in Spec 008.
- [ ] REQ-003: Support three preview data modes selectable via a segmented control or tab bar: Default, Max, and Min.
- [ ] REQ-004: Default mode populates text fields with empty strings, image fields with `null`, and loop fields with an empty array `[]`.
- [ ] REQ-005: Max mode populates text fields with the string `"It works in my machine "` repeated N times, image fields with a placeholder image data URI, and loop fields with N rows of sample data.
- [ ] REQ-006: Min mode populates required fields with short representative values (e.g., `"x"` for text, a 1x1 pixel data URI for images, one row for loops) and optional fields with empty strings, `null`, or empty arrays respectively.
- [ ] REQ-007: The repeat count N in Max mode MUST be adjustable via a slider control, with a default value of 5 and a range of 1 to 50.
- [ ] REQ-008: The JSON output MUST be syntax-highlighted using colour-coded tokens for strings, numbers, booleans, null, keys, and structural characters.
- [ ] REQ-009: Provide a one-click copy button that copies the full JSON string to the clipboard and shows a brief confirmation (e.g., "Copied!" tooltip for 2 seconds).
- [ ] REQ-010: Display an approximate PDF file size estimate below the JSON preview, updated whenever the JSON content changes.
- [ ] REQ-011: The JSON preview MUST be read-only (not user-editable) to prevent desynchronization with the canvas state.

## Behaviour

### Happy Path

1. User adds a text field with JSON key `name` and an image field with JSON key `photo` to the canvas.
2. The JSON preview panel immediately shows:
   ```json
   {
     "name": "",
     "photo": null
   }
   ```
3. User switches to Max mode with N = 5.
4. The preview updates to:
   ```json
   {
     "name": "It works in my machine It works in my machine It works in my machine It works in my machine It works in my machine ",
     "photo": "data:image/png;base64,..."
   }
   ```
5. User adjusts the slider to N = 10; the repeated text and loop rows update accordingly.
6. User clicks the copy button; the JSON string is copied to the clipboard and a "Copied!" tooltip appears.
7. The approximate file size estimate below the JSON updates (e.g., "~24 KB").

### Edge Cases

- A canvas with no fields produces an empty JSON object `{}` in all three modes.
- Fields with duplicate JSON keys: the preview should warn the user with a visual indicator (e.g., highlighted key with a warning icon) since duplicate keys would produce undefined behaviour in JSON parsing.
- Nested JSON keys using dot notation (e.g., `address.city`) should produce nested objects in the preview output.
- When the slider value N changes rapidly, JSON regeneration should be debounced (100ms) to avoid UI jank.
- Very large JSON output (N = 50 with many loop fields) should remain performant; consider virtualizing the display if line count exceeds 500 lines.

### Error Conditions

- Clipboard API unavailable (e.g., insecure context): show a fallback message "Copy not available. Select and copy manually." and select the full JSON text for manual copying.
- File size estimation fails (e.g., unexpected data types): display "Size estimate unavailable" rather than crashing.

## Input / Output

```typescript
// JSON preview data modes
type JsonPreviewMode = 'default' | 'max' | 'min'

// Configuration for the JSON preview panel
interface JsonPreviewConfig {
  mode: JsonPreviewMode
  maxRepeatCount: number // N, default 5, range 1..50
}

// Generated preview output
interface JsonPreviewOutput {
  json: Record<string, unknown> // the generated JSON object
  jsonString: string // pretty-printed JSON string
  estimatedPdfSizeBytes: number // approximate size in bytes
}

// React component props
interface JsonPreviewPanelProps {
  fields: CanvasField[] // current fields on canvas (from Spec 009)
  config: JsonPreviewConfig
  onConfigChange: (config: JsonPreviewConfig) => void
}

// Generation function
function generatePreviewJson(
  fields: CanvasField[],
  mode: JsonPreviewMode,
  repeatCount: number,
): JsonPreviewOutput

// File size estimator
function estimatePdfSize(json: Record<string, unknown>, templateMeta: TemplateMeta): number // bytes
```

## Acceptance Criteria

- [ ] AC-001: Adding a text field with JSON key `title` to an empty canvas produces `{ "title": "" }` in Default mode.
- [ ] AC-002: Switching to Max mode with N = 5 produces a text value of `"It works in my machine "` repeated exactly 5 times (with trailing space).
- [ ] AC-003: Switching to Min mode produces `"x"` for required text fields and `""` for optional text fields.
- [ ] AC-004: Min mode produces a single-row array for required loop fields and `[]` for optional loop fields.
- [ ] AC-005: The slider adjusts N from 1 to 50, and the JSON updates accordingly within 200ms of the slider stopping.
- [ ] AC-006: The JSON output is syntax-highlighted with distinct colours for keys, strings, numbers, booleans, null, and brackets.
- [ ] AC-007: Clicking the copy button places the full JSON string on the clipboard and displays a "Copied!" confirmation.
- [ ] AC-008: An approximate PDF file size is displayed below the JSON and updates when the JSON content changes.
- [ ] AC-009: The generated JSON structure is accepted by `generatePDF()` without schema validation errors.
- [ ] AC-010: A canvas with no fields shows `{}` in all three modes.
- [ ] AC-011: Fields with dot-notation JSON keys (e.g., `address.city`) produce correctly nested JSON objects.

## Dependencies

- Spec 002 — Template Schema (defines the JSON structure that `generatePDF()` expects)
- Spec 009 — UI Canvas (provides the list of fields and their JSON key bindings)

## Notes

- The file size estimate is intentionally approximate. It should account for template background size, font embedding overhead, and a rough content-to-PDF-bytes ratio. Exact accuracy is not required; a ballpark within 20% is acceptable.
- Open question: should the user be allowed to manually edit the JSON for one-off testing, with a "Reset to auto-generated" button to resync? Currently specified as read-only to keep the scope simple.
- The Max mode repeat string `"It works in my machine "` is deliberately chosen as a memorable, non-Lorem-Ipsum phrase that makes overflow and wrapping behaviour obvious during preview.
