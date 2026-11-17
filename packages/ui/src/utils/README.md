# @template-goblin/ui/src/utils

Application utility functions covering .tgbl ZIP archive assembly and extraction, JSON template projection and diffing, error reporting, and preview compilation.

## Overview

Core utility routines for the builder UI, handling `.tgbl` ZIP packaging/unpackaging, JSON schema diffing and projection, browser error surfacing, and client-side PDF preview generation.

## Interface

- `saveTemplate(): Promise<SaveResult>`
- `openTemplate(file: File | Blob): Promise<void>`
- `buildTemplateArchive(state: TemplateStoreSnapshot): BuiltTemplateArchive`
- `templateToLoaded(snapshot: TemplateStoreSnapshot): LoadedTemplate`
- `projectFieldsToJson(fields, bands?, imageDataUrls?): InputJSON`
- `diffJsonEdit(editedJson, originalProjection): JsonEditResult`
- `surfaceError(action: string, error: unknown, alert?: boolean): string`
- `runCorePreview(template: LoadedTemplate, inputData: InputJSON): Promise<Uint8Array>`

## Invariants

- **Archive Security**: ZIP parsing validates path entries to reject path traversal (`..`), absolute paths, and null bytes.
- **Decompression Bounds**: Extraction limits archive size to 100 MB and entry counts to 500 to prevent ZIP bomb vulnerabilities.
- **Sanitization**: All parsed JSON structures undergo prototype pollution sanitization (`__proto__`, `constructor`, `prototype`).

## Side Effects

- Triggers browser file downloads of compiled `.tgbl` archives.
- Reads files via `FileReader` and `ArrayBuffer` browser APIs.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
