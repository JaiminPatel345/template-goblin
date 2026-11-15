# @template-goblin/types/src

Core TypeScript type definitions, schemas, and pure utility functions that form the public contract for TemplateGoblin.

## Overview

This directory contains the component definitions and contract types shared across all TemplateGoblin packages (`@template-goblin/core`, `@template-goblin/ui`, and external consumers). All exports are consolidated and exposed via [index.ts](./index.ts).

## Interface

### Exported Modules

- [template.ts](./template.ts): Primary template manifest schema and element structures:
  - `TemplateManifest`, `TemplateMeta`, `PageDefinition`, `PageSize`, `PageBackgroundType`
  - `FieldDefinition`, `FieldBase`, `TextField`, `ImageField`, `TableField`
  - `TextFieldStyle`, `ImageFieldStyle`, `TableFieldStyle`, `TableCellRuntimeStyle`, `TableBorderStyle`, `TableColumn`, `TableRow`, `CellStyle`
  - `GroupDefinition`, `FontDefinition`
  - `PageBand`, `PageBandStyle`, `PageBandDivider`
  - `PageNumberConfig`, `PageNumberPlacement`, `PageNumberAlign`, `PageNumberNumeralStyle`
  - Type guards: `isImageFilenameValue`, `isImageColorValue`
- [input.ts](./input.ts): Runtime input data schemas supplied to PDF generation:
  - `InputJSON`, `TextInputs`, `TableInputs`, `ImageInputs`, `ImageInput`, `LinkInputs`
- [source.ts](./source.ts): Field data binding source variants:
  - `FieldSource<V>`, `StaticSource<V>`, `DynamicSource<V>`
  - Type guards: `isStaticSource`, `isDynamicSource`
- [hyperlink.ts](./hyperlink.ts): Clickable hyperlink structures and protocol validation:
  - `Hyperlink`, `StaticHyperlink`, `DynamicHyperlink`
  - Validator: `isValidHyperlinkUrl`
  - Type guards: `isStaticHyperlink`, `isDynamicHyperlink`
- [pageNumber.ts](./pageNumber.ts): Page numbering helpers:
  - `toRoman(value: number): string`
  - `formatPageNumber(pageIndex1Based: number, style: PageNumberNumeralStyle): string`
  - `defaultPageNumberConfig(): PageNumberConfig`
- [pageSize.ts](./pageSize.ts): Page geometry preset metrics and size resolution:
  - `PAGE_SIZE_PRESETS`
  - `getPageSize(page, meta): { width: number; height: number }`
- [safeKey.ts](./safeKey.ts): Prototype-pollution safety validation:
  - `isSafeKey(key: string): boolean`
- [loaded.ts](./loaded.ts): In-memory template asset bundles:
  - `LoadedTemplate`, `TemplateAssets`
- [errors.ts](./errors.ts): Canonical error codes and error hierarchy:
  - `ErrorCode`, `ValidationErrorCode`, `ValidationError`, `ValidationResult`
  - `TemplateGoblinError`

## Invariants

- **Zero UI Dependencies**: Source modules must never import or depend on UI frameworks or DOM APIs.
- **Pure Functions**: All helper functions (`toRoman`, `formatPageNumber`, `isValidHyperlinkUrl`, `getPageSize`, `isSafeKey`, and type guards) are deterministic and free of side effects.
- **Prototype Pollution Safety**: `isSafeKey` rejects non-identifier keys and prohibited property names (`__proto__`, `constructor`, `prototype`, `hasOwnProperty`, `toString`, `valueOf`).
- **Hyperlink Protocol Restrictions**: `isValidHyperlinkUrl` enforces strict allowlist checks (`https:`, `http:`, `mailto:`, `tel:`).
- **Roman Numeral Bounds**: `toRoman` supports integers in the range `1..3999`; numbers outside this range or non-integers safely fallback to Arabic string representation.
- **Page Size Resolution**: `getPageSize` only overrides metadata dimensions when explicit positive numeric dimensions (`w > 0 && h > 0`) are present on the page definition.
- **Strict Typing**: No `any` types; all types are explicitly typed.

## Side Effects

None. This component has zero runtime side effects, executes no I/O, does not access the filesystem, makes no network calls, and performs no global state mutations.

## Verification

Run the package type-check command from the monorepo root:

```bash
pnpm --filter @template-goblin/types type-check
```
