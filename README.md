# TemplateGoblin

Open-source PDF template engine for generating PDFs at scale. Non-technical users design templates with a visual drag-and-drop builder, developers use the npm library to generate millions of PDFs from JSON data. Templates are saved as `.tgbl` files — portable ZIP archives containing the layout, fonts, and images needed for rendering.

## Quick Start — Library

```bash
npm install template-goblin
```

### Hono

```ts
import { Hono } from 'hono'
import { loadTemplate, generatePDF } from 'template-goblin'

const app = new Hono()
const template = await loadTemplate('./templates/result-2024.tgbl')

app.post('/pdf', async (c) => {
  const data = await c.req.json()
  const pdf = await generatePDF(template, data)
  return c.body(pdf, 200, { 'Content-Type': 'application/pdf' })
})

export default app
```

### Express

```ts
import express from 'express'
import { loadTemplate, generatePDF } from 'template-goblin'

const app = express()
app.use(express.json())

const template = await loadTemplate('./templates/result-2024.tgbl')

app.post('/pdf', async (req, res) => {
  const pdf = await generatePDF(template, req.body)
  res.type('pdf').send(pdf)
})

app.listen(3000)
```

### Bun

```ts
import { loadTemplate, generatePDF } from 'template-goblin'

const template = await loadTemplate('./templates/result-2024.tgbl')

Bun.serve({
  async fetch(req) {
    const data = await req.json()
    const pdf = await generatePDF(template, data)
    return new Response(pdf, {
      headers: { 'Content-Type': 'application/pdf' },
    })
  },
  port: 3000,
})
```

### Key Pattern

Call `loadTemplate()` **once** at startup — it loads the template into memory. Call `generatePDF()` **millions of times** — it uses the in-memory template with zero disk I/O.

```ts
// Called ONCE — extracts ZIP, parses manifest, loads fonts/images into memory
const template = await loadTemplate('./template.tgbl')

// Called millions of times — zero disk I/O
const pdf = await generatePDF(template, inputData)
```

## Visual Template Builder (UI)

### Run Locally

```bash
npx template-goblin-ui
# Opens at http://localhost:4242
```

### Hosted Version

Visit the hosted UI at your deployment URL to design templates in the browser.

### What You Can Do

- Upload a background image (certificate, invoice, report template)
- Add text fields with customizable fonts, sizes, colors, and overflow handling
- Add image fields with fill/contain/cover modes
- Add loop (table) fields with column definitions and multi-page support
- Preview PDFs live with sample data (Default / Max / Min modes)
- Save templates as `.tgbl` files and share them with developers

## `.tgbl` File Format

A `.tgbl` file is a ZIP archive with a custom extension:

```
template.tgbl (ZIP archive):
  manifest.json          -- Template schema (fields, styles, metadata)
  background.png         -- Background image (actual binary, not base64)
  fonts/
    custom-font.ttf      -- Custom font files
  placeholders/
    photo.png            -- Placeholder images
```

Binary assets are stored as real files inside the ZIP — ~33% smaller than base64 encoding. The library verifies the ZIP `PK` header on read.

## Input JSON Format

```json
{
  "texts": {
    "name": "John Doe",
    "indexnumber": "12345",
    "school_name": "Example School"
  },
  "loops": {
    "marks": [
      { "subjectcode": "101", "subject_name": "Mathematics", "grade": "A" },
      { "subjectcode": "102", "subject_name": "Science", "grade": "B+" }
    ]
  },
  "images": {
    "student_photo": "<Buffer or base64 string>"
  }
}
```

- `texts` — string values for text fields
- `loops` — arrays of row objects for table fields
- `images` — Buffer or base64 string for image fields
- Keys must match `jsonKey` values in the template (dot notation: `texts.name`)

## API Reference

### `loadTemplate(path: string): Promise<LoadedTemplate>`

Load a `.tgbl` file from disk into memory. Call once at startup.

### `generatePDF(template: LoadedTemplate, data: InputJSON): Promise<Buffer>`

Generate a PDF from an in-memory template and JSON data. The hot path — zero disk I/O.

### `generatePDFFromFile(path: string, data: InputJSON): Promise<Buffer>`

Convenience: loads template + generates PDF in one call. Do not use in a loop.

### `validateData(template: LoadedTemplate, data: InputJSON): ValidationResult`

Validate input data against the template. Returns `{ valid: boolean, errors: Array<{ code, field, message }> }`.

### `saveTemplate(manifest, assets, outputPath): Promise<void>`

Create a `.tgbl` ZIP file from a manifest and assets.

### `readManifest(path: string): Promise<TemplateManifest>`

Read only the manifest from a `.tgbl` file without loading assets. Fast operation for validation or listing.

## Error Codes

| Code                     | When                              | Example                                                               |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------- |
| `FILE_NOT_FOUND`         | `.tgbl` path doesn't exist        | `Template file not found: /path/to/template.tgbl`                     |
| `INVALID_FORMAT`         | File is not a valid ZIP           | `Invalid .tgbl file: not a valid ZIP archive`                         |
| `MISSING_MANIFEST`       | ZIP missing `manifest.json`       | `Invalid .tgbl file: missing manifest.json`                           |
| `INVALID_MANIFEST`       | Manifest fails schema validation  | `Invalid manifest: field "fields[2].style.fontSize" must be a number` |
| `MISSING_ASSET`          | Referenced font/image not in ZIP  | `Missing asset: fonts/custom-font.ttf referenced but not found`       |
| `MISSING_REQUIRED_FIELD` | Required field missing from input | `Missing required field: texts.name`                                  |
| `INVALID_DATA_TYPE`      | Wrong data type for field         | `Invalid data for "loops.marks": expected array, got string`          |
| `MAX_PAGES_EXCEEDED`     | Table exceeds max page limit      | `Table "loops.marks" requires 5 pages but maxPages is 3`              |
| `FONT_LOAD_FAILED`       | Corrupt or invalid font file      | `Failed to load font: fonts/custom-font.ttf`                          |
| `PDF_GENERATION_FAILED`  | PDFKit error during rendering     | `PDF generation failed: [error details]`                              |

All errors are instances of `TemplateGoblinError` with a `code` property for programmatic handling:

```ts
import { TemplateGoblinError } from 'template-goblin'

try {
  const pdf = await generatePDF(template, data)
} catch (error) {
  if (error instanceof TemplateGoblinError) {
    switch (error.code) {
      case 'MISSING_REQUIRED_FIELD':
        // Handle missing field
        break
      case 'MAX_PAGES_EXCEEDED':
        // Handle too many pages
        break
    }
  }
}
```

## Custom Fonts

1. Upload `.ttf` fonts in the UI via the Fonts dialog
2. Select the custom font in text field or loop column properties
3. Fonts are stored as binary files inside the `.tgbl` archive
4. The library registers fonts with PDFKit at generation time

## Multi-Page Tables

Tables (loop fields) can span multiple pages when `multiPage` is enabled:

1. Set `multiPage: true` on the loop field in the UI
2. Set `maxPages` to limit the number of pages (e.g., 5)
3. When data rows exceed the table area on a page:
   - Remaining rows continue on a new page
   - Background image is re-rendered on each page
   - Table header is re-rendered on each continuation page
4. Non-loop fields (text, image) appear only on page 1

## Contributing

### Setup

```bash
git clone https://github.com/your-org/template-goblin.git
cd template-goblin
pnpm install
```

### Development

```bash
pnpm dev          # Start UI dev server
pnpm build        # Build all packages (types -> core -> ui)
pnpm type-check   # TypeScript checking
pnpm lint         # ESLint + Prettier
pnpm test         # Jest tests (core library)
pnpm test:e2e     # Playwright tests (UI)
```

### Project Structure

```
packages/types/   -- Shared TypeScript types
packages/core/    -- template-goblin npm library
packages/ui/      -- template-goblin-ui React app
specs/            -- Feature specifications
journeys/         -- User journey descriptions
```

### Workflow

This project uses a spec-driven development workflow:

1. **Spec** — write or update the feature spec in `specs/`
2. **Implement** — Dev Agent codes from the spec
3. **Review** — Reviewer Agent checks code against spec
4. **Test** — QA Agent writes tests from spec, not code
5. **Done** — all tests pass, feature complete

### Git Conventions

- **Branches**: `feature/<spec-number>-<short-name>`
- **Commits**: conventional commits — `feat:`, `fix:`, `spec:`, `docs:`, `chore:`, `test:`
- **Hooks**: pre-commit (lint), commit-msg (commitlint), pre-push (type-check + test)

## Advanced Features

### Batch PDF Generation

Generate multiple PDFs in parallel using Node.js child processes:

```ts
import { loadTemplate, generateBatchPDF } from 'template-goblin'

const template = await loadTemplate('./template.tgbl')

const students = [
  { texts: { name: 'Alice' }, loops: {}, images: {} },
  { texts: { name: 'Bob' }, loops: {}, images: {} },
  { texts: { name: 'Charlie' }, loops: {}, images: {} },
]

const results = await generateBatchPDF(template, students, {
  concurrency: 4,
  onProgress: (done, total) => console.log(`${done}/${total}`),
})

results.forEach((r) => {
  if (r.success) console.log(`PDF ${r.index}: ${r.pdf!.length} bytes`)
  else console.error(`PDF ${r.index} failed: ${r.error}`)
})
```

### S3 / Cloud Storage

Upload generated PDFs directly to S3 or any compatible storage:

```ts
import { loadTemplate, generateAndStore, S3StorageProvider } from 'template-goblin'

const template = await loadTemplate('./template.tgbl')
const s3 = new S3StorageProvider({
  bucket: 'my-pdfs',
  region: 'us-east-1',
})

const result = await generateAndStore(template, data, s3, {
  key: 'result-12345.pdf',
  prefix: 'pdfs/2024/',
})

console.log(result.url) // https://my-pdfs.s3.us-east-1.amazonaws.com/pdfs/2024/result-12345.pdf
console.log(result.size) // PDF size in bytes
```

You can implement your own `StorageProvider` for GCS, Azure Blob, or any other backend.

### Font Subsetting

When saving `.tgbl` files, enable font subsetting to reduce file size:

```ts
import { saveTemplate } from 'template-goblin'

await saveTemplate(manifest, assets, './output.tgbl', {
  subsetFonts: true, // Keep only glyphs used in template placeholders
})
```

### Image Compression (UI)

The UI includes an advanced image compression dialog when uploading background images. Adjust quality with a slider and see a side-by-side comparison of original vs compressed with file size savings.

## License

MIT
