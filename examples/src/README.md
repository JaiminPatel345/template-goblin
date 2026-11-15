# Examples Source

The `examples/src` directory is the designated source directory for TemplateGoblin demonstration scripts, showcasing how to build `.tgbl` templates and generate PDFs using the core SDK.

## Overview

Contains example Node.js scripts demonstrating end-to-end integration: creating templates, assembling manifests, loading templates, and executing batch or single PDF rendering.

## Interface

- Example script entrypoints referenced in `examples/package.json` (`01-build-tgbl.ts`, `02-generate-pdf.ts`)
- No external public library exports

## Invariants

- Must only depend on public SDK contracts (`template-goblin` and `@template-goblin/types`)
- Zero dependency on `packages/ui`

## Side Effects

- Reads `.tgbl` templates from `examples/tgbl_files/` and writes rendered PDF outputs to disk when run

## Verification

- Run: `pnpm test`
