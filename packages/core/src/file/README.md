# @template-goblin/core/src/file

Low-level file I/O operations and archive management for .tgbl ZIP packages, including binary buffer verification, security sanitization, manifest extraction, and template packaging.

## Overview

Handles physical template archive serialization and deserialization. Parses `.tgbl` ZIP archives into memory, enforces security protections against malicious archives (ZIP bombs, path traversal, prototype pollution), and serializes new templates to disk.

## Interface

- `readTgblBuffer(path: string): Buffer`: Validates and reads template file into a Buffer
- `parseManifestFromZip(zip: AdmZip): TemplateManifest`: Extracts and deserializes manifest JSON from ZIP
- `readManifest(path: string): Promise<TemplateManifest>`: Reads manifest from disk path without loading asset payloads
- `saveTemplate(manifest: TemplateManifest, assets: TemplateAssets, outputPath: string, options?: { subsetFonts?: boolean }): Promise<void>`: Packages manifest, fonts, and images into a `.tgbl` ZIP archive
- Constants: `ZIP_MAGIC_BYTES`, `TGBL_EXTENSION`, `MANIFEST_FILENAME`, `BACKGROUND_FILENAME`, `FONTS_DIR`, `PLACEHOLDERS_DIR`, `IMAGES_DIR`, `BACKGROUNDS_DIR`, `MANIFEST_VERSION`

## Invariants

- **Magic Byte Verification**: Templates must begin with ZIP magic bytes (`0x50, 0x4b`) and have the `.tgbl` extension.
- **ZIP Bomb Defense**: Archive files must not exceed 100 MB; uncompressed manifests must not exceed 10 MB.
- **Prototype Pollution Defense**: Manifest parsing recursively strips prototype pollution keys (`__proto__`, `constructor`, `prototype`, `hasOwnProperty`).
- **Coordinate Bounds**: Page dimensions must be strictly between 1 and 10,000 points; field counts must not exceed 1,000.
- **Path Traversal Defense**: Asset filenames in manifest must not contain path traversal sequences (`..` or leading `/`).
- **Asset Garbage Collection**: `saveTemplate` sweeps unreferenced image assets via `collectReferencedImageAssets` prior to archiving.

## Side Effects

- Reads files and file metadata from disk (`readFileSync`, `statSync`, `existsSync`).
- Writes `.tgbl` ZIP files to disk (`writeFileSync`) and creates directories (`mkdirSync`).

## Verification

- Run: `pnpm --filter template-goblin test`
