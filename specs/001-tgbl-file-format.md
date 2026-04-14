# Spec 001 — .tgbl File Format

## Status

Draft

## Summary

Defines the `.tgbl` file format used by TemplateGoblin to package templates. A `.tgbl` file is a standard ZIP archive with a custom extension containing a manifest, background image, fonts, and placeholder images. This spec covers creation, reading, validation, storage paths, and template identity resolution.

## Requirements

- [ ] REQ-001: Create a valid ZIP archive with the `.tgbl` extension containing all required template assets.
- [ ] REQ-002: Read and extract contents from a `.tgbl` ZIP archive.
- [ ] REQ-003: Verify PK magic bytes (`0x50 0x4B`) at the start of the file before attempting to parse.
- [ ] REQ-004: Every `.tgbl` archive MUST include a `manifest.json` at the archive root.
- [ ] REQ-005: Store binary assets (background image, fonts, placeholder images) in their designated paths within the archive (`background.png`, `fonts/*.ttf`, `placeholders/*.png`).
- [ ] REQ-006: Reject files whose extension is not `.tgbl` when loading a template.
- [ ] REQ-007: Use `~/.templateGoblin/` as the default storage directory on Unix and `%APPDATA%\templateGoblin\` on Windows.
- [ ] REQ-008: Derive the template ID from the filename without its `.tgbl` extension (e.g., `invoice.tgbl` -> template ID `invoice`).

## Behaviour

### Happy Path

1. User creates or saves a template via the UI.
2. The engine assembles `manifest.json`, `background.png`, font files, and placeholder images into a ZIP archive.
3. The archive is written to the default storage directory with the `.tgbl` extension.
4. On load, the engine reads the file, checks for PK magic bytes, extracts contents, and parses `manifest.json`.

### Edge Cases

- A `.tgbl` file with no `manifest.json` inside is rejected with an error indicating a missing manifest.
- A file with a `.tgbl` extension but invalid ZIP structure (no PK header) is rejected with a corruption error.
- Template IDs containing path separators or special characters are sanitized or rejected.
- If the default storage directory does not exist, it is created on first use.

### Error Conditions

- PK header check fails: throw `InvalidFileError` with message indicating the file is not a valid `.tgbl` archive.
- Missing `manifest.json`: throw `MissingManifestError`.
- File extension is not `.tgbl`: throw `UnsupportedExtensionError`.
- Disk write failure (permissions, disk full): propagate the underlying OS error with context.

## Input / Output

```typescript
// Creating a .tgbl file
function createTgbl(template: TemplateData, outputPath: string): Promise<void>

// Reading a .tgbl file
function readTgbl(filePath: string): Promise<TemplateData>

// Resolving template ID from filename
function resolveTemplateId(filename: string): string

// Getting default storage path
function getStoragePath(): string
```

## Acceptance Criteria

- [ ] AC-001: A `.tgbl` file created by the engine can be opened by any standard ZIP utility.
- [ ] AC-002: Reading a valid `.tgbl` file returns the parsed `manifest.json` and all binary assets.
- [ ] AC-003: A file without PK magic bytes (`0x50 0x4B`) at offset 0 is rejected before any further parsing.
- [ ] AC-004: A `.tgbl` archive missing `manifest.json` produces a `MissingManifestError`.
- [ ] AC-005: Files with extensions other than `.tgbl` are rejected with `UnsupportedExtensionError`.
- [ ] AC-006: On Unix the default storage path resolves to `~/.templateGoblin/`; on Windows to `%APPDATA%\templateGoblin\`.
- [ ] AC-007: `resolveTemplateId("invoice.tgbl")` returns `"invoice"`.
- [ ] AC-008: The archive contains `manifest.json` at the root, `background.png`, entries under `fonts/`, and entries under `placeholders/`.

## Dependencies

None. This is the foundational spec.

## Notes

- The ZIP format is chosen for broad tooling support and straightforward streaming.
- Future specs may add versioning to the archive structure itself (e.g., a `version` file at root), but for now version lives inside `manifest.json`.
- Open question: should template IDs enforce a character whitelist (e.g., alphanumeric + hyphens)?
