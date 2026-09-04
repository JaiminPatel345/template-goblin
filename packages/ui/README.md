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
- Table fields with per-column styling, header/row themes, transparent fills, table-level borders, and fit-to-content layout
- Condition-based styling: configure multiple styling variants per field with custom names and defaults
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

## Links

- 📖 **Full docs and examples** — https://github.com/JaiminPatel345/template-goblin
- 🐛 **Issues & feature requests** — https://github.com/JaiminPatel345/template-goblin/issues
- 📄 **License** — MIT
