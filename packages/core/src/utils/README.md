# @template-goblin/core/src/utils

Pure utility and helper modules for measurement, font registration, image input resolution, code point extraction, dynamic layout expansion, and error context enrichment.

## Overview

Supporting utility modules for the core PDF engine, encompassing text measurement, glyph availability checks, font subsetting, image sniffing and network fetching, and dynamic single-page table layout adjustment.

## Interface

- `resolveValue(field: FieldDefinition, input: InputJSON): unknown`: Extracts static or dynamic field values
- `wrapText(doc: PDFDocument, text: string, maxWidth: number): string[]`: Splits text into wrapped lines
- `measureText(doc: PDFDocument, text: string, fontSize: number, maxWidth: number, maxRows: number): MeasureResult`
- `truncateLines(doc: PDFDocument, lines: string[], maxRows: number, maxWidth: number): string[]`
- `registerFonts(doc: PDFDocument, template: LoadedTemplate): Map<string, string>`
- `canFontRenderText(doc: PDFDocument, fontName: string, text: string): boolean`
- `getSafeFontForText(doc: PDFDocument, requestedFontName: string, text: string): string`
- `extractUsedCodePoints(manifest: TemplateManifest): Set<number>`
- `subsetFont(fontBuffer: Buffer, codePoints: Set<number>): Buffer`
- `subsetTemplateFonts(manifest: TemplateManifest, fonts: Map<string, Buffer>): Map<string, Buffer>`
- `adjustPageLayout(fields, data, baseWidth, baseHeight): PageLayoutResult`: Calculates dynamic single-page table expansion and shifts lower elements down
- `computeTableRenderedHeight(field, data): number`: Calculates exact vertical height for table rows
- `sniffImageFormat(buffer: Buffer): 'png' | 'jpeg' | null`
- `resolveImageInput(input: ImageInput, ctx: ResolveContext, opts?: ResolveOptions): Promise<Buffer>`
- `allManifestFields(manifest: Pick<TemplateManifest, 'fields' | 'header' | 'footer'>): FieldDefinition[]`
- `fieldErrorDetails(field: FieldDefinition, ctx: PageContext): { suffix: string; details: Record<string, unknown> }`
- Constants: `DEFAULT_UNICODE_FONT_NAME`, `DEFAULT_IMAGE_FETCH_TIMEOUT_MS`, `DEFAULT_IMAGE_RESOLVE_CONCURRENCY`

## Invariants

- **Value Resolution Priority**: Resolves static values from `field.source.value` and dynamic values from `input[bucket][jsonKey]`; placeholder values are ignored during generation.
- **Glyph Fallback**: Automatically falls back to `TG-Default-Unicode` when a requested font lacks glyph support for a string.
- **Magic Byte Validation**: `sniffImageFormat` validates PNG and JPEG magic bytes and returns `null` for unsupported formats.
- **Dynamic Layout Safety**: `adjustPageLayout` groups dynamic tables into vertical clusters, handling single, stacked, and side-by-side tables without delta accumulation. Shifts only elements located below expanding dynamic tables, preserving relative spacing and leaving aside elements untouched.

## Side Effects

- `resolveImageInput`: Performs network fetch requests (for remote URLs) and disk reads (for file paths).
- `registerFonts`: Registers TrueType fonts on the PDFKit document instance.

## Verification

- Run: `pnpm --filter template-goblin test`
