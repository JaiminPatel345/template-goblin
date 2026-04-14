# Spec 007 — Load Template

## Status

Draft

## Summary

The `loadTemplate` function is the entry point for the core library. It reads a `.tgbl` file from disk, verifies it is a valid ZIP archive by checking PK magic bytes, extracts and validates the `manifest.json` against the template schema, and loads all referenced assets (background image, fonts, placeholder images) into memory as Buffers. It is designed to be called once at startup and returns a `LoadedTemplate` object that is reused across unlimited `generatePDF` calls with zero further disk I/O.

## Requirements

- [ ] REQ-001: Accept a file path string pointing to a `.tgbl` file and return a `Promise<LoadedTemplate>`
- [ ] REQ-002: Verify the file begins with PK magic bytes (`0x50 0x4B`) before attempting ZIP extraction
- [ ] REQ-003: Extract the ZIP archive contents using `adm-zip` (Node.js environment)
- [ ] REQ-004: Locate and parse `manifest.json` from the root of the ZIP archive
- [ ] REQ-005: Validate the parsed manifest against the template schema defined in spec 002 (version, meta, fonts, groups, fields)
- [ ] REQ-006: Load the background image file referenced in the manifest into a `Buffer`, or set to `null` if no background image exists
- [ ] REQ-007: Load all font files referenced in `manifest.fonts[].filename` into a `Map<string, Buffer>` keyed by `fontId`
- [ ] REQ-008: Load all placeholder image files referenced in image field `style.placeholderFilename` into a `Map<string, Buffer>` keyed by the filename
- [ ] REQ-009: Verify that every asset referenced in the manifest (background image, fonts, placeholders) actually exists within the ZIP archive
- [ ] REQ-010: Return the complete `LoadedTemplate` object containing `manifest`, `backgroundImage`, `fonts`, and `placeholders`
- [ ] REQ-011: All types must be imported from `@template-goblin/types` -- no local type duplication

## Behaviour

### Happy path

1. Caller passes a valid file path to a `.tgbl` file
2. Function reads the file from disk, verifies PK magic bytes
3. ZIP is extracted in memory (no temp files written to disk)
4. `manifest.json` is parsed and validated against the schema
5. Background image (if present) is loaded into a Buffer
6. All fonts referenced in `manifest.fonts` are loaded into a Map keyed by `fontId`
7. All placeholder images referenced in image fields are loaded into a Map keyed by filename
8. `LoadedTemplate` is returned, ready for use by `generatePDF`

### Edge cases

- Template with no background image: `backgroundImage` is `null`
- Template with no custom fonts: `fonts` Map is empty
- Template with no image fields or no placeholder images: `placeholders` Map is empty
- Template with zero fields: valid -- returns a `LoadedTemplate` with empty fields array in the manifest
- Very large `.tgbl` file: must load entirely into memory; no streaming required but should not block the event loop unnecessarily
- File path with spaces, special characters, or Unicode characters in the path: must handle correctly
- Relative file path: resolve relative to `process.cwd()` before reading
- Symlinked file: follow the symlink and read the target file

### Error conditions

- `FILE_NOT_FOUND`: The file at the given path does not exist or is not readable. Include the attempted path in the error message.
- `INVALID_FORMAT`: The file does not begin with PK magic bytes (`0x50 0x4B`), meaning it is not a valid ZIP archive. Include the first two bytes found.
- `MISSING_MANIFEST`: The ZIP archive does not contain a `manifest.json` file at its root.
- `INVALID_MANIFEST`: The `manifest.json` exists but fails schema validation. Include all validation errors in the error message.
- `MISSING_ASSET`: A file referenced in the manifest (background image, font, or placeholder) does not exist in the ZIP archive. Include the missing filename in the error message.

## Input / Output

### Input

```ts
loadTemplate(path: string): Promise<LoadedTemplate>
```

- `path` — Absolute or relative file path to a `.tgbl` file. Relative paths are resolved against `process.cwd()`.

### Output

```ts
interface LoadedTemplate {
  manifest: TemplateManifest // Parsed and validated manifest.json
  backgroundImage: Buffer | null // Background image bytes, or null if none
  fonts: Map<string, Buffer> // fontId -> .ttf file bytes
  placeholders: Map<string, Buffer> // filename (e.g. "placeholders/student_photo.png") -> image bytes
}
```

### Errors

```ts
class TemplateGoblinError extends Error {
  code:
    | 'FILE_NOT_FOUND'
    | 'INVALID_FORMAT'
    | 'MISSING_MANIFEST'
    | 'INVALID_MANIFEST'
    | 'MISSING_ASSET'
  details?: string
}
```

## Acceptance Criteria

- [ ] AC-001: Calling `loadTemplate` with a valid `.tgbl` file returns a `LoadedTemplate` with all manifest data parsed correctly
- [ ] AC-002: Calling `loadTemplate` with a non-existent path rejects with a `TemplateGoblinError` having code `FILE_NOT_FOUND`
- [ ] AC-003: Calling `loadTemplate` with a file that is not a ZIP (e.g. a plain text file) rejects with `INVALID_FORMAT`
- [ ] AC-004: Calling `loadTemplate` with a ZIP file missing `manifest.json` rejects with `MISSING_MANIFEST`
- [ ] AC-005: Calling `loadTemplate` with a ZIP whose `manifest.json` has invalid schema (e.g. missing `version`, invalid field types) rejects with `INVALID_MANIFEST` and includes specific validation errors
- [ ] AC-006: Calling `loadTemplate` with a ZIP whose manifest references a font file not present in the ZIP rejects with `MISSING_ASSET` and includes the missing filename
- [ ] AC-007: Calling `loadTemplate` with a ZIP whose manifest references a placeholder image not present in the ZIP rejects with `MISSING_ASSET`
- [ ] AC-008: Background image is loaded as a Buffer when present, and is `null` when no background image exists
- [ ] AC-009: All fonts are loaded into the `fonts` Map keyed by their `fontId` from the manifest
- [ ] AC-010: All placeholder images are loaded into the `placeholders` Map keyed by their filename path
- [ ] AC-011: The returned `LoadedTemplate` can be passed directly to `generatePDF` without additional processing
- [ ] AC-012: The function performs zero writes to disk -- all extraction is in-memory only
- [ ] AC-013: PK magic bytes (`0x50 0x4B`) are checked before any ZIP extraction is attempted

## Dependencies

- Spec 001 — `.tgbl` File Format (ZIP structure, magic bytes, file layout)
- Spec 002 — Template Schema (manifest.json structure and validation rules)

## Notes

- The `adm-zip` library is used in Node.js for ZIP extraction. The browser-side equivalent (`JSZip`) is used in `packages/ui` but is not relevant to this function.
- Should the function accept a `Buffer` directly (in addition to a file path) for cases where the file is already in memory? This would be useful for testing and for the UI package. Consider adding an overload: `loadTemplate(pathOrBuffer: string | Buffer)`.
- Manifest schema validation should reuse the same validation logic used by spec 002 to avoid divergence.
- Performance consideration: for templates with many large fonts, the initial load may take noticeable time. Consider whether a progress callback is needed for large templates.
