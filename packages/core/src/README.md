# @template-goblin/core/src

Primary PDF engine implementation source tree for TemplateGoblin.

## Overview

Coordinates the end-to-end PDF generation workflow: template parsing, data schema validation, static/dynamic split caching (`prepareTemplate`), batch worker parallelization, dynamic page height expansion, and rendering.

## Subdirectories & Boundaries

- [file](./file/README.md): Low-level file I/O operations and archive management for `.tgbl` ZIP packages.
- [fonts](./fonts/README.md): Embedded fallback TrueType fonts supporting universal Unicode character ranges.
- [render](./render/README.md): PDFKit rendering pipeline for backgrounds, fields, tables, and page bands.
- [types](./types/README.md): Structural types partition pointing to `@template-goblin/types`.
- [utils](./utils/README.md): Pure utility and helper modules for measurement, font registration, image resolution, and dynamic layout.

## Interface

- `loadTemplate(path: string): Promise<LoadedTemplate>`: Parses a `.tgbl` file into an in-memory template
- `generatePDF(template: LoadedTemplate, data: InputJSON, options?: GeneratePDFOptions): Promise<Buffer>`: Renders a PDF buffer from data
- `generatePDFFromFile(path: string, data: InputJSON): Promise<Buffer>`: Single-shot load and render convenience helper
- `generateBatchPDF(template: LoadedTemplate, dataArray: InputJSON[], options?: BatchOptions): Promise<BatchResult[]>`: Multi-core parallel batch generation
- `validateData(template: LoadedTemplate, input: InputJSON): ValidationResult`: Validates data against template keys
- `validateManifest(manifest: TemplateManifest): void`: Checks manifest geometry, bounds, and fields
- `prepareTemplate(template: LoadedTemplate): Promise<PreparedTemplate>`: Pre-renders static layers into a reusable base PDF
- `generatePreparedPDF(prepared: PreparedTemplate, data: InputJSON, options?: GeneratePDFOptions): Promise<Buffer>`: High-speed rendering using prepared template
- `generateAndStore(template, data, storage, options): Promise<StoreResult>`: Renders and uploads directly to cloud storage (S3)
- `preflightImages(template: LoadedTemplate, data: InputJSON, opts?: PreflightOptions): Promise<PreflightResult>`: Asynchronously pre-fetches and validates image assets
- `S3StorageProvider`: Cloud storage integration class

## Invariants

- **Zero UI Dependencies (Rule 1)**: Pure Node.js and TypeScript implementation; zero dependencies on UI packages or DOM APIs.
- **Zero Disk I/O on Hot Path**: The core rendering pipeline (`generatePDF`) performs zero filesystem operations; all assets reside in memory within `LoadedTemplate`.
- **Static Optimization Guarantees**: `prepareTemplate` accelerates rendering only when element z-order and table properties are provably deterministic.
- **Strict Bounding Boxes (Rule 10)**: All elements render inside their bounding rectangle without overflow.
- **Batch Concurrency Ceiling**: `generateBatchPDF` enforces a maximum batch size of 10,000 items.

## Side Effects

- Filesystem I/O during template loading (`loadTemplate`) and file generation (`generatePDFFromFile`).
- Network I/O during remote image fetching and S3 storage uploads (`generateAndStore`).
- Process spawning via `child_process.fork` during parallel batch generation (`generateBatchPDF`).

## Verification

- Run: `pnpm --filter template-goblin test`
