# Spec 016 — UI Save/Open

## Status

Draft

## Summary

Defines the Save and Open functionality in the template builder UI. "Save .tgbl" collects the current template manifest and all referenced assets (background image, fonts, placeholder images), packages them into a ZIP archive using JSZip, and triggers a browser download. "Open .tgbl" presents a file picker, reads the selected ZIP with JSZip, validates its structure and manifest schema, restores all assets, and populates the canvas with the loaded template.

## Requirements

- [ ] REQ-001: Provide a "Save .tgbl" action (toolbar button and Ctrl+S / Cmd+S keyboard shortcut) that packages the current template into a `.tgbl` file and triggers a browser download.
- [ ] REQ-002: The saved `.tgbl` file MUST conform to the ZIP archive structure defined in Spec 001, containing `manifest.json` at the root, `background.png` (if set), font files under `fonts/`, and placeholder images under `placeholders/`.
- [ ] REQ-003: The `manifest.json` included in the archive MUST conform to the schema defined in Spec 002.
- [ ] REQ-004: Use JSZip to create and read ZIP archives in the browser.
- [ ] REQ-005: Provide an "Open .tgbl" action (toolbar button and Ctrl+O / Cmd+O keyboard shortcut) that opens a file picker filtered to `.tgbl` files.
- [ ] REQ-006: On open, validate the ZIP structure: verify PK magic bytes, check for `manifest.json` at root, and verify all asset paths referenced in the manifest exist in the archive.
- [ ] REQ-007: On open, validate the manifest JSON against the schema defined in Spec 002 and report clear, human-readable errors if validation fails.
- [ ] REQ-008: On successful open, restore all assets (background, fonts, placeholders) and populate the canvas with the template's fields in their saved positions.
- [ ] REQ-009: The default filename for save MUST be derived from the template name in the manifest (e.g., a template named "Invoice" saves as `Invoice.tgbl`). If no name is set, default to `Untitled.tgbl`.
- [ ] REQ-010: Show a confirmation dialog before opening a file if the current canvas has unsaved changes: "You have unsaved changes. Open a new template anyway?"

## Behaviour

### Happy Path — Save

1. User clicks "Save .tgbl" or presses Ctrl+S / Cmd+S.
2. The engine collects the current manifest, background image, loaded fonts, and placeholder images.
3. JSZip assembles the archive with the correct directory structure.
4. The browser download is triggered with the filename derived from the template name.
5. The file saves to the user's default download location.

### Happy Path — Open

1. User clicks "Open .tgbl" or presses Ctrl+O / Cmd+O.
2. If there are unsaved changes, a confirmation dialog appears. User confirms.
3. A file picker opens, filtered to `.tgbl` files.
4. User selects a file.
5. The engine reads the file, validates PK magic bytes, extracts contents with JSZip.
6. The engine validates `manifest.json` against the schema.
7. All assets are loaded: background image is set on the canvas, fonts are registered, placeholder images are attached to their fields.
8. The canvas populates with all fields at their saved positions, sizes, and properties.

### Edge Cases

- Saving a template with no fields: the archive contains only `manifest.json` (with an empty fields array) and optionally a background image. This is valid.
- Saving a template with no background image: `background.png` is omitted from the archive. The manifest's background reference should be null or omitted.
- Opening a `.tgbl` file created by a newer version of TemplateGoblin with unknown manifest fields: ignore unknown fields and load what is recognized, log a warning to the console.
- Opening a `.tgbl` file that references a font not present in the `fonts/` directory: load the template but show a warning listing missing fonts and fall back to the default font for affected fields.
- The file picker may return no selection (user cancels): no action is taken, no error shown.
- Saving when the template name contains characters invalid in filenames (e.g., `/`, `\`, `:`): sanitize the filename by replacing invalid characters with hyphens.

### Error Conditions

- Open — file is not a valid ZIP (PK magic bytes missing): show error dialog "The selected file is not a valid .tgbl template. The file may be corrupted."
- Open — `manifest.json` is missing from the archive: show error dialog "This .tgbl file does not contain a valid template manifest."
- Open — `manifest.json` fails schema validation: show error dialog listing specific validation errors (e.g., "Missing required field: pageSize", "Invalid value for field type: 'unknown'").
- Open — referenced asset missing from archive: show warning (not blocking error) listing missing assets, load the rest of the template.
- Save — JSZip fails to create the archive (e.g., memory pressure with very large assets): show error dialog "Failed to save template. The template may be too large. Try reducing image sizes."
- Save — browser blocks the download (popup blocker): show a message "Download was blocked. Please allow downloads from this site."

## Input / Output

```typescript
// Save function
async function saveTemplate(manifest: TemplateManifest, assets: TemplateAssets): Promise<Blob> // the .tgbl ZIP as a Blob for download

// Open function
async function openTemplate(file: File): Promise<LoadedTemplate>

// Validation result
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

interface ValidationError {
  code: string // e.g., "MISSING_MANIFEST", "INVALID_SCHEMA", "NOT_A_ZIP"
  message: string // human-readable description
  path?: string // JSON path or archive path, if applicable
}

interface ValidationWarning {
  code: string // e.g., "MISSING_FONT", "UNKNOWN_FIELD"
  message: string
  path?: string
}

// Asset bundle for save
interface TemplateAssets {
  background: Blob | null
  fonts: Map<string, Blob> // font name -> font file blob
  placeholders: Map<string, Blob> // field ID -> placeholder image blob
}

// Loaded template for open
interface LoadedTemplate {
  manifest: TemplateManifest
  assets: TemplateAssets
  validation: ValidationResult
}

// Filename derivation
function deriveFilename(templateName: string): string
// e.g., deriveFilename("Invoice") => "Invoice.tgbl"
// e.g., deriveFilename("") => "Untitled.tgbl"
// e.g., deriveFilename("My/Template") => "My-Template.tgbl"
```

## Acceptance Criteria

- [ ] AC-001: Clicking "Save .tgbl" triggers a browser download of a valid ZIP file with the `.tgbl` extension.
- [ ] AC-002: The downloaded `.tgbl` file can be opened by any standard ZIP utility and contains `manifest.json` at the root.
- [ ] AC-003: The `manifest.json` in the saved file conforms to the schema in Spec 002.
- [ ] AC-004: All referenced assets (background, fonts, placeholders) are present in the archive at their expected paths.
- [ ] AC-005: Clicking "Open .tgbl" opens a file picker that accepts `.tgbl` files.
- [ ] AC-006: Opening a valid `.tgbl` file populates the canvas with all fields at their saved positions and properties.
- [ ] AC-007: Opening a file that is not a valid ZIP shows the error "The selected file is not a valid .tgbl template."
- [ ] AC-008: Opening a `.tgbl` file without `manifest.json` shows the error about a missing manifest.
- [ ] AC-009: Opening a `.tgbl` file with an invalid manifest shows specific schema validation errors.
- [ ] AC-010: A confirmation dialog appears before opening a file when the canvas has unsaved changes.
- [ ] AC-011: Ctrl+S / Cmd+S triggers save; Ctrl+O / Cmd+O triggers open.
- [ ] AC-012: The saved filename is derived from the template name, with invalid filename characters replaced by hyphens.

## Dependencies

- Spec 001 — .tgbl File Format (defines the ZIP archive structure, PK magic byte validation, and directory layout)
- Spec 002 — Template Schema (defines the `manifest.json` schema used for both save and validation on open)
- Spec 009 — UI Canvas (provides the current template state to save, and is the target for populating on open)

## Notes

- JSZip is chosen for its broad browser compatibility and well-tested API. No server-side component is needed.
- Open question: should the save action support "Save As" (always prompt for filename) vs. "Save" (overwrite last saved file)? In a browser context, downloads always go to the download directory, so "Save As" behaviour is the natural default. A future Electron/Tauri wrapper could support true file-system save.
- Open question: should there be an auto-save to localStorage or IndexedDB as a crash recovery mechanism? This is out of scope for this spec but worth considering in a future spec.
- The 5 MB per-image limit from Spec 013 applies to placeholder images at save time as well. Very large templates with many high-resolution placeholders could produce archives exceeding 50 MB; a warning should be shown if the archive exceeds this threshold.
