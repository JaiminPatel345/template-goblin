# template-goblin-ui

Visual template builder for [TemplateGoblin](https://github.com/JaiminPatel345/template-goblin) — drag-and-drop design surface that exports `.tgbl` templates for the [`template-goblin`](https://www.npmjs.com/package/template-goblin) PDF engine.

## Run locally (no install)

```bash
npx template-goblin-ui
```

Opens the visual builder in your browser at `http://localhost:4242`. Design your template, then **Export → .tgbl** and feed the file into the SDK.

## What you can design

- Multi-page templates with custom or preset page sizes (A3 / A4 / A5 / Letter / Legal)
- Text fields with dynamic font-fitting, alignment, decoration, and JSON-key bindings
- Image fields with `fill` / `contain` / `cover` modes and static or dynamic sources
- Table fields with fixed height, single-page dynamic vertical expansion (selected by default for dynamic tables), or multi-page continuation flow with per-column styling, header/row themes, and fit-to-content layout
- Hyperlinks that open URLs from the input JSON
- Page-level backgrounds (solid colour, image, or inherit from the previous page)

Everything saves as a single portable `.tgbl` archive — design once, render anywhere with [`template-goblin`](https://www.npmjs.com/package/template-goblin).

## Generate PDFs from your template

```ts
import { writeFile } from 'node:fs/promises'
import { loadTemplate, generatePDF } from 'template-goblin'

const template = await loadTemplate('./my-template.tgbl')
const pdf = await generatePDF(template, {
  /* your JSON input */
})
await writeFile('out.pdf', pdf)
```

## Subdirectories & Boundaries

- [bin](./bin/README.md): Standalone static HTTP server executable that hosts the pre-built visual builder UI.
- [src](./src/README.md): React application root, canvas surface, toolbar, inspector panels, state stores, and utilities.

## Interface

- CLI: `npx template-goblin-ui` (`bin/cli.js`)
- Web application entry point: `index.html`, `src/main.tsx`
- Monorepo package scripts: `dev`, `build`, `type-check`, `lint`, `test`, `test:e2e`

## Invariants

- **Component Isolation**: Zero UI dependencies allowed in `packages/core`, and `packages/ui` must never be imported by `packages/core`.
- **File Length Limit**: No source file (`.ts`/`.tsx`) may exceed 300 lines.
- **Zero Icon Libraries**: Strictly uses inline SVGs with no third-party icon libraries.
- **Strict Bounding Box**: All canvas elements render strictly inside their defined bounding boxes.

## Side Effects

- Starts development server or CLI static web server on local port (default 4242).
- Saves and loads templates using browser IndexedDB storage and triggers file downloads for `.tgbl` archives.

## Verification

To run UI test suites:

```bash
pnpm --filter template-goblin-ui test
```

## Links

- 📖 **Full docs and examples** — https://github.com/JaiminPatel345/template-goblin
- 🐛 **Issues & feature requests** — https://github.com/JaiminPatel345/template-goblin/issues
- 📄 **License** — MIT
