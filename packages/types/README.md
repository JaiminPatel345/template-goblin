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

## Links

- 📖 **Repo, docs, and examples** — https://github.com/JaiminPatel345/template-goblin
- 🐛 **Issues** — https://github.com/JaiminPatel345/template-goblin/issues
- 📄 **License** — MIT
