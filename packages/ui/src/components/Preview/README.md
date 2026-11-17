# @template-goblin/ui/src/components/Preview

Interactive PDF preview dialog allowing real-time JSON input payload editing and test image replacement using the core PDF generation engine.

## Overview

Provides modal dialog and real-time generation previews of PDFs directly in the browser by executing the core `generatePDF` engine with local input data and live placeholder image swaps.

## Interface

- `PdfPreview`: Main dialog component embedding the generated PDF preview
- `PreviewDialog`: Dialog container with control headers and actions
- `PreviewImageUploadRow`: Component for mapping runtime images to template field keys
- `PreviewDialogHeader`: Modal header with action buttons (Download, Open in New Tab, Close)
- `parseInputJson(text: string): InputJSON`: Input JSON parser with validation
- `validateUpload(file: File): string | null`: File validation for test image uploads

## Invariants

- **Session Isolation**: JSON payload edits and uploaded test images remain local to the preview session and do not mutate the template manifest.
- **Engine Parity**: Preview compiles PDFs using core `generatePDF` to guarantee pixel-identical output to backend SDK execution.

## Side Effects

- Asynchronously executes core PDF generation in browser.
- Generates object URLs and opens compiled PDF documents in browser tabs.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
