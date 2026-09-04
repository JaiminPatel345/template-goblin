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
  // Condition-based styling: specify active condition per field or globally
  condition: [{ grade: 'honors' }, { studentName: 'highlight' }],
})

await writeFile('result.pdf', pdf)
```

### Condition-based styling

Fields can define named style rules (e.g. `honors`, `warning`, `default`). Only overridden properties are stored sparsely in `.tgbl`.
In the input JSON, specify conditions using the developer-friendly array format:

```json
{
  "texts": { "grade": "A" },
  "condition": [{ "grade": "honors" }]
}
```

Global string conditions (`"condition": "honors"`) and key-value maps (`"condition": { "grade": "honors" }`) are also supported as fallbacks. If no condition is supplied, fields fall back to their marked default condition.

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

## Links

- 📖 **Full docs, examples, and the visual builder** — https://github.com/JaiminPatel345/template-goblin
- 🐛 **Issues & feature requests** — https://github.com/JaiminPatel345/template-goblin/issues
- 📄 **License** — GPLv3
