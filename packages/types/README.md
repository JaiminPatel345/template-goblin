# @template-goblin/types

Shared TypeScript types for the [TemplateGoblin](https://github.com/JaiminPatel345/template-goblin) PDF template engine — the schema for `.tgbl` templates, the shape of input JSON, and the error types thrown by the runtime.

```bash
npm install --save-dev @template-goblin/types
```

This is a **types-only** package. It has no runtime code; you don't need it unless you're writing code that constructs or validates `TemplateManifest` / `InputJSON` shapes by hand.

```ts
import type {
  TemplateManifest,
  InputJSON,
  FieldDefinition,
  TableFieldStyle,
  CellStyle,
} from '@template-goblin/types'
```

## Use this when…

- You're building tooling that emits or consumes `.tgbl` manifests outside the visual builder.
- You want autocomplete / type checking for the input JSON your server feeds into [`template-goblin`](https://www.npmjs.com/package/template-goblin).
- You're contributing to TemplateGoblin core or UI.

If you're just rendering PDFs from a designed template, [`template-goblin`](https://www.npmjs.com/package/template-goblin) re-exports the types you need — install that instead.

## Interface

All public interfaces, types, and utility functions are exported from the package root via [`./src/index.ts`](./src/index.ts):

- **Manifest & Document Models**: `TemplateManifest`, `TemplateMeta`, `PageDefinition`, `FieldDefinition` (`TextField`, `ImageField`, `TableField`), `PageBand`, `PageNumberConfig`
- **Styling**: `TextFieldStyle`, `ImageFieldStyle`, `TableFieldStyle`, `CellStyle`, `TableBorderStyle`
- **Runtime Input**: `InputJSON`, `TextInputs`, `ImageInputs`, `TableInputs`, `LinkInputs`, `ImageInput`
- **Source Bindings**: `FieldSource`, `StaticSource`, `DynamicSource`
- **Hyperlinks**: `Hyperlink`, `StaticHyperlink`, `DynamicHyperlink`, `isValidHyperlinkUrl`
- **Utilities**: `isSafeKey`, `getPageSize`, `PAGE_SIZE_PRESETS`, `toRoman`, `formatPageNumber`, `defaultPageNumberConfig`
- **Errors**: `TemplateGoblinError`, `ErrorCode`, `ValidationError`, `ValidationResult`

Detailed component specifications can be found in [`./src/README.md`](./src/README.md).

## Invariants

- **Strict Separation of Concerns**: Contains zero UI dependencies and must never import `@template-goblin/ui`.
- **Pure Evaluation**: All exported utilities are pure, deterministic functions with no mutable internal or external state.
- **Safe Key Validation**: `isSafeKey` strictly defends against prototype pollution attacks on dynamic input keys.
- **URL Safety**: Dynamic and static hyperlinks restrict protocol schemes exclusively to `https`, `http`, `mailto`, and `tel`.
- **Backward Compatibility**: Preserves backward-compatible manifest deserialization across schema version iterations.

## Side Effects

None. This package executes no runtime side effects, performs no network or disk I/O, and causes no external system mutations.

## Verification

To verify type safety and schema integrity:

```bash
pnpm --filter @template-goblin/types type-check
```

Additional package scripts:

```bash
pnpm --filter @template-goblin/types lint
pnpm --filter @template-goblin/types build
```

## Links

- 📖 **Repo, docs, and examples** — https://github.com/JaiminPatel345/template-goblin
- 🐛 **Issues** — https://github.com/JaiminPatel345/template-goblin/issues
- 📄 **License** — MIT
