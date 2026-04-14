# Spec 019 — UI Custom Fonts

## Status

Draft

## Summary

Adds a font management panel to the TemplateGoblin UI, accessible via a "Fonts" button, that allows designers to upload `.ttf` font files, preview them, and use them across text fields and loop columns. Uploaded fonts are stored inside the `.tgbl` ZIP archive under `fonts/` and tracked in the manifest's `fonts[]` array. Removing a font that is actively referenced by fields triggers a confirmation warning.

## Requirements

- [ ] REQ-001: Provide a "Fonts" button in the UI toolbar that opens a font management panel or dialog.
- [ ] REQ-002: Allow uploading `.ttf` files through the font management panel via file picker or drag-and-drop.
- [ ] REQ-003: Store uploaded font files in the `.tgbl` ZIP archive under the `fonts/` directory (e.g., `fonts/Roboto-Bold.ttf`).
- [ ] REQ-004: Record font metadata in the manifest `fonts[]` array with `id` and `filename` properties.
- [ ] REQ-005: Populate the font family dropdown for text fields and loop column style overrides with all uploaded custom fonts, in addition to built-in fonts.
- [ ] REQ-006: Display a preview of each uploaded font in the font management panel using sample text (e.g., "The quick brown fox...").
- [ ] REQ-007: Allow users to edit the preview sample text.
- [ ] REQ-008: Warn the user before removing a font that is currently referenced by one or more fields, listing the affected fields.
- [ ] REQ-009: Validate that uploaded files are valid `.ttf` fonts (check file extension and basic header bytes).
- [ ] REQ-010: Generate a unique `id` for each font entry derived from the filename, avoiding duplicates.

## Behaviour

### Happy Path

1. Designer clicks the "Fonts" button in the toolbar.
2. The font management panel opens, showing any previously uploaded fonts with previews.
3. Designer clicks "Upload Font" or drags a `.ttf` file into the panel.
4. The engine validates the file, stores it in memory, and adds an entry to the manifest `fonts[]` array.
5. The new font appears in the panel with a text preview.
6. Designer closes the panel, opens a text field's style editor, and sees the new font in the font family dropdown.
7. Designer selects the custom font; the canvas updates to render text in that font.
8. On save, the font file is written to `fonts/` inside the `.tgbl` archive.

### Edge Cases

- Uploading a font with the same filename as an existing font: append a numeric suffix to the `id` (e.g., `roboto-bold-2`) and store under the suffixed filename.
- Uploading a non-`.ttf` file (e.g., `.otf`, `.woff`): reject with an inline error message explaining only `.ttf` is supported.
- Uploading a file with `.ttf` extension but invalid font data: reject with a "Font file is corrupted or unreadable" message.
- Font file exceeds a reasonable size limit (e.g., 10 MB): reject with a file-too-large warning.

### Error Conditions

- Invalid file type: display inline error "Only .ttf font files are supported."
- Corrupt font file: display inline error "Font file could not be loaded. The file may be corrupted."
- Font removal blocked: display confirmation dialog listing all fields that reference the font, with options to proceed (which resets those fields to the default font) or cancel.
- Font load failure during PDF generation: throw `FONT_LOAD_FAILED` error with the font ID.

## Input / Output

```typescript
interface FontEntry {
  id: string
  filename: string
}

// UI: upload a font file, returns the new font entry
function uploadFont(file: File): Promise<FontEntry>

// UI: remove a font by ID, returns list of affected field IDs
function removeFont(fontId: string): { affectedFields: string[] }

// UI: get all available fonts (built-in + custom)
function getAvailableFonts(): FontEntry[]

// Library: load a font buffer from the .tgbl archive
function loadFont(archive: TgblArchive, fontId: string): Promise<Buffer>
```

## Acceptance Criteria

- [ ] AC-001: Clicking the "Fonts" button opens the font management panel.
- [ ] AC-002: Uploading a valid `.ttf` file adds it to the font list and displays a preview.
- [ ] AC-003: The uploaded font appears in the font family dropdown for text field style editing.
- [ ] AC-004: The uploaded font appears in the font family dropdown for loop column style overrides.
- [ ] AC-005: Saving the template writes the font file to `fonts/<filename>.ttf` inside the `.tgbl` archive.
- [ ] AC-006: The manifest `fonts[]` array contains an entry with the correct `id` and `filename` for each uploaded font.
- [ ] AC-007: Attempting to remove a font that is used by at least one field shows a confirmation dialog listing affected fields.
- [ ] AC-008: Confirming font removal resets affected fields to the default font family.
- [ ] AC-009: Uploading a non-`.ttf` file displays an inline error and does not add the file.
- [ ] AC-010: Reopening a saved `.tgbl` file loads all custom fonts and makes them available in dropdowns and on the canvas.

## Dependencies

- Spec 002 — Template Schema (manifest `fonts[]` array structure).
- Spec 009 — UI Builder (toolbar, style editors, canvas rendering).

## Notes

- Only `.ttf` (TrueType) fonts are supported in v1. OTF and WOFF support may be added later.
- Open question: should there be a maximum number of fonts per template to keep archive size manageable?
- Open question: should the font preview panel allow choosing font size and style (bold/italic) for the preview, or keep it simple?
