# @template-goblin/ui/src/components/RightPanel

Right sidebar presenting template field structure, live two-way JSON data projections, PDF size estimations, and field property controls.

## Overview

Provides structural overview of all fields across template pages, real-time JSON input payload generation, estimated PDF file size calculation, and field-specific configuration panels.

## Interface

- `StructurePanel`: Tree view of pages, bands, groups, and contained fields
- `JsonPreview`: Interactive projection of template fields into sample `InputJSON`
- `PdfSizeEstimate`: Real-time estimation of compiled PDF output byte size
- `TextFieldProps`: Detailed styling and format controls for text fields
- `ImageFieldProps`: Fit mode, URL/file binding, and color replacement controls for image fields
- `LoopFieldProps`: Dynamic table column, row style, and height mode controls

## Invariants

- **Live JSON Projection**: JSON preview is a live projection of fields; editing values writes back to field placeholder data.
- **Typing Buffer**: Maintains raw text buffer during active typing and formats back to canonical projection on blur.

## Side Effects

- Mutates `templateStore` fields upon JSON projection edits.
- Writes JSON strings to system clipboard upon copy actions.

## Verification

- Run: `pnpm --filter template-goblin-ui test`
