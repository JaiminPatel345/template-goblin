# template-goblin

<div align="center">
  <img src="../../packages/site/public/logo-full.png" alt="TemplateGoblin Logo" width="400" />
</div>

PDF template engine for Node.js — load a `.tgbl` template + JSON data and generate a PDF.

```bash
npm install template-goblin
```

```ts
import { writeFile } from 'node:fs/promises'
import { loadTemplate, generatePDF } from 'template-goblin'

const template = await loadTemplate('./result.tgbl')

const pdf = await generatePDF(template, {
  texts: { studentName: 'Aisha Khan', grade: 'A' },
  tables: { subjects: [{ subject: 'Math', marks: '95' }] },
})

await writeFile('result.pdf', pdf)
```

## What is a `.tgbl` template?

A `.tgbl` is a ZIP archive containing the layout, fonts, and images needed to render a page. Design one in the visual builder ([`template-goblin-ui`](https://www.npmjs.com/package/template-goblin-ui)) or hand-craft one with `@template-goblin/types`. Templates are loaded once, then reused for millions of PDFs.

## API

| Function                                   | Purpose                                                  |
| ------------------------------------------ | -------------------------------------------------------- |
| `loadTemplate(path)`                       | Parse a `.tgbl` file into an in-memory `LoadedTemplate`  |
| `generatePDF(template, input)`             | Render a single PDF as a `Buffer`                        |
| `generateBatchPDF(template, inputs, opts)` | Render many PDFs from a shared template                  |
| `validateData(template, input)`            | Validate input JSON against the template's required keys |

Types live in [`@template-goblin/types`](https://www.npmjs.com/package/@template-goblin/types).

## Subdirectories & Boundaries

- [src](./src/README.md): Primary PDF engine implementation source tree including archive handling, rendering pipeline, fonts, and utilities.

## Interface

Exported from package root via [`./src/index.ts`](./src/index.ts):

- **Template Loading & Assembly**: `loadTemplate`, `readManifest`, `saveTemplate`
- **PDF Generation**: `generatePDF`, `generatePDFFromFile`, `generateBatchPDF`
- **Optimized Generation**: `prepareTemplate`, `generatePreparedPDF`
- **Validation**: `validateData`, `validateManifest`
- **Cloud Storage**: `generateAndStore`, `S3StorageProvider`
- **Asset Utilities**: `collectReferencedImageAssets`, `preflightImages`, `subsetTemplateFonts`, `extractUsedCodePoints`

## Invariants

- **Zero UI Dependencies (Rule 1)**: Pure Node.js and TypeScript implementation with zero UI dependencies.
- **Zero Disk I/O on Hot Path**: In-memory template rendering performs zero filesystem reads during PDF generation.
- **Single Source of Truth for Types (Rule 3)**: All shared data structures reside in `@template-goblin/types`.
- **Bounding Box Strictness (Rule 10)**: All elements render inside their bounding boxes without overflow.
- **Strict Typing (Rule 4)**: No `any` types; strictly typed TypeScript everywhere.

## Side Effects

- Synchronous disk I/O when loading templates or reading manifests from disk.
- Network requests when resolving dynamic remote image URLs or uploading PDFs to S3 storage.
- Subprocess spawning for parallel batch PDF generation jobs.

## Verification

To run core unit and integration test suites:

```bash
pnpm --filter template-goblin test
```

## Links

- 📖 **Full docs, examples, and the visual builder** — https://github.com/JaiminPatel345/template-goblin
- 🐛 **Issues & feature requests** — https://github.com/JaiminPatel345/template-goblin/issues
- 📄 **License** — GPLv3
