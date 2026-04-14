# TemplateGoblin — Full Agent Prompt

You are building **TemplateGoblin**, an open-source PDF template engine using a **spec-driven architecture**. Every feature is specified before coded, reviewed before merged, and tested against specs — not implementation logic.

The project has two deliverables:

1. **`template-goblin`** — a pure TypeScript npm library. Takes a loaded template + JSON data → returns a PDF as a `Buffer`.
2. **`template-goblin-ui`** — a React + Vite visual template builder app. Can be hosted or run locally via `npx template-goblin-ui`. Exports `.tgbl` files.

---

## Agent Roles & Workflow

This project uses three agent roles. Each operates with strict boundaries.

### 🔨 Dev Agent

- **Model**: Claude Sonnet (fast iteration)
- **Reads**: spec files in `specs/`, journey files in `journeys/`, `CLAUDE.md`
- **Writes**: source code, unit tests
- **Rule**: Code must implement what the spec says — no creative deviation. If the spec is ambiguous, ask — don't guess.
- **On completion**: Submits to Reviewer Agent

### 🔍 Reviewer Agent

- **Model**: Claude Opus (max reasoning effort)
- **Reads**: spec files, journey files, the submitted code diff
- **Checks**:
  - Does the code match the spec exactly?
  - Are edge cases from the spec handled?
  - Are there any silent failures, missing error handling, or type holes?
  - Does the code follow the code quality rules in `CLAUDE.md`?
- **Output**: Either ✅ approved (passes to QA) or ❌ feedback (returns to Dev with specific line-level comments)
- **Rule**: Reviewer never fixes code. Reviewer only reviews and comments.

### 🧪 QA Agent

- **Model**: Claude Opus (max reasoning effort)
- **Reads**: spec files, journey files — **never reads implementation code** for test design
- **Writes**: E2E tests (Playwright for UI), integration tests (Jest for core library)
- **Rule**: Tests are written from the spec and user journey descriptions. Tests verify behaviour, not implementation details. QA Agent can read code only to find selectors/function signatures — never to derive test cases.
- **On completion**: Runs tests. If failures → returns to Dev Agent with failing test output.

### Workflow loop

```
Spec written → Dev implements → Reviewer reviews
                                    ↓
                              ❌ feedback → Dev fixes → Reviewer re-reviews
                              ✅ approved → QA writes tests → QA runs tests
                                                                ↓
                                                          ❌ failures → Dev fixes → QA re-runs
                                                          ✅ all pass → Feature complete
```

---

## Spec-Driven File Structure

```
template-goblin/
├── CLAUDE.md                          # Project memory — architecture, rules, constraints
├── turbo.json                         # Turborepo config
├── package.json                       # pnpm workspaces + turborepo
├── pnpm-workspace.yaml
│
├── specs/                             # Feature specifications
│   ├── 001-tgbl-file-format.md
│   ├── 002-template-schema.md
│   ├── 003-text-rendering.md
│   ├── 004-image-rendering.md
│   ├── 005-loop-table-rendering.md
│   ├── 006-multi-page.md
│   ├── 007-load-template.md
│   ├── 008-generate-pdf.md
│   ├── 009-ui-canvas.md
│   ├── 010-ui-text-field.md
│   ├── 011-ui-image-field.md
│   ├── 012-ui-loop-field.md
│   ├── 013-ui-right-panel.md
│   ├── 014-ui-json-preview.md
│   ├── 015-ui-pdf-preview.md
│   ├── 016-ui-save-open.md
│   ├── 017-ui-template-locking.md
│   ├── 018-ui-undo-redo.md
│   ├── 019-ui-custom-fonts.md
│   ├── 020-ui-field-groups.md
│   ├── 021-error-handling.md
│   └── 022-npx-cli.md
│
├── journeys/                          # User journey descriptions
│   ├── J01-designer-creates-result-template.md
│   ├── J02-designer-edits-existing-template.md
│   ├── J03-developer-generates-single-pdf.md
│   ├── J04-designer-previews-edge-cases.md
│   ├── J05-designer-uses-custom-fonts.md
│   ├── J06-developer-handles-errors.md
│   └── J07-designer-creates-multi-page-table.md
│
├── packages/
│   ├── types/                         # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── template.ts            # TemplateSchema, FieldDefinition, etc.
│   │   │   ├── input.ts               # InputJSON, TextInput, LoopInput, ImageInput
│   │   │   ├── loaded.ts              # LoadedTemplate (in-memory representation)
│   │   │   └── errors.ts              # Custom error types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/                          # template-goblin npm library
│   │   ├── src/
│   │   │   ├── index.ts               # Public API exports
│   │   │   ├── load.ts                # loadTemplate() — ZIP extract, parse, memory load
│   │   │   ├── generate.ts            # generatePDF() — takes LoadedTemplate + data → Buffer
│   │   │   ├── validate.ts            # validateData() — check required fields
│   │   │   ├── render/
│   │   │   │   ├── text.ts            # Text rendering with overflow/dynamic font logic
│   │   │   │   ├── image.ts           # Image rendering with fit modes
│   │   │   │   ├── loop.ts            # Table/loop rendering with column styles
│   │   │   │   └── background.ts      # Background image rendering
│   │   │   ├── file/
│   │   │   │   ├── read.ts            # Read and decompress .tgbl ZIP
│   │   │   │   ├── write.ts           # Create and compress .tgbl ZIP
│   │   │   │   └── constants.ts       # Magic bytes, defaults
│   │   │   └── utils/
│   │   │       ├── font.ts            # Font registration with PDFKit
│   │   │       └── measure.ts         # Text measurement utilities
│   │   ├── tests/                     # Jest tests
│   │   │   ├── load.test.ts
│   │   │   ├── generate.test.ts
│   │   │   ├── validate.test.ts
│   │   │   ├── render/
│   │   │   │   ├── text.test.ts
│   │   │   │   ├── image.test.ts
│   │   │   │   └── loop.test.ts
│   │   │   └── file/
│   │   │       ├── read.test.ts
│   │   │       └── write.test.ts
│   │   ├── jest.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── ui/                            # template-goblin-ui
│       ├── src/
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── Canvas/
│       │   │   │   ├── CanvasArea.tsx
│       │   │   │   ├── FieldRenderer.tsx
│       │   │   │   ├── SelectionHandles.tsx
│       │   │   │   ├── GridOverlay.tsx
│       │   │   │   └── ContextMenu.tsx
│       │   │   ├── LeftPanel/
│       │   │   │   ├── FieldList.tsx
│       │   │   │   └── GroupList.tsx
│       │   │   ├── RightPanel/
│       │   │   │   ├── TextFieldProps.tsx
│       │   │   │   ├── ImageFieldProps.tsx
│       │   │   │   ├── LoopFieldProps.tsx
│       │   │   │   ├── JsonPreview.tsx
│       │   │   │   └── PdfSizeEstimate.tsx
│       │   │   ├── Toolbar/
│       │   │   │   ├── Toolbar.tsx
│       │   │   │   ├── FontManager.tsx
│       │   │   │   └── PageSizeDialog.tsx
│       │   │   └── Preview/
│       │   │       └── PdfPreview.tsx
│       │   ├── store/
│       │   │   ├── templateStore.ts   # Zustand — canvas state, fields, undo/redo
│       │   │   └── uiStore.ts         # Zustand — UI state (selected field, panels)
│       │   ├── hooks/
│       │   │   ├── useUndoRedo.ts
│       │   │   ├── useCanvasDrag.ts
│       │   │   └── useKeyboard.ts
│       │   └── utils/
│       │       ├── jsonGenerator.ts   # Auto-generate example JSON (Default/Max/Min)
│       │       └── sizeEstimator.ts
│       ├── e2e/                       # Playwright E2E tests
│       │   ├── playwright.config.ts
│       │   ├── designer-flow.spec.ts
│       │   ├── text-field.spec.ts
│       │   ├── image-field.spec.ts
│       │   ├── loop-field.spec.ts
│       │   ├── save-open.spec.ts
│       │   ├── undo-redo.spec.ts
│       │   ├── template-locking.spec.ts
│       │   └── pdf-preview.spec.ts
│       ├── package.json
│       ├── vite.config.ts
│       └── tsconfig.json
│
├── .claude/
│   └── commands/
│       ├── spec.md                    # /spec — create a new spec file
│       ├── journey.md                 # /journey — create a new user journey
│       ├── implement.md               # /implement — Dev agent implements a spec
│       ├── review.md                  # /review — Reviewer agent reviews code
│       └── test.md                    # /test — QA agent writes and runs tests
│
└── README.md
```

---

## CLAUDE.md (Project Memory)

Create this file at the repo root. Claude Code reads it at every session start.

```markdown
# TemplateGoblin — CLAUDE.md

## What is this?

Open-source PDF template engine. Non-technical users design templates in a visual UI,
developers use the npm library to generate PDFs at scale.

## Architecture

- Monorepo with Turborepo + pnpm workspaces
- `packages/types` — shared TypeScript types (template schema, input JSON, errors)
- `packages/core` — `template-goblin` npm library (pure TS, zero UI deps)
- `packages/ui` — `template-goblin-ui` React + Vite app

## Hard Rules

1. `packages/core` MUST have zero UI dependencies — pure Node.js/TypeScript only
2. `packages/ui` MUST NOT be imported by `packages/core`
3. All shared types live in `packages/types` — never duplicate type definitions
4. No `any` types — strict TypeScript everywhere
5. Every public function has JSDoc comments
6. Every dependency must be justified with a comment in package.json
7. No large icon libraries — use inline SVGs only
8. Code implements specs — not the other way around. If spec is ambiguous, clarify.
9. Tests are written from specs, not from code.
10. All text/images/loops render inside their bounding rectangle — NEVER overflow.

## Tech Stack

| Part             | Choice            |
| ---------------- | ----------------- |
| UI Framework     | React 18 + Vite   |
| Canvas           | react-konva       |
| PDF Engine       | PDFKit            |
| State Management | Zustand           |
| Shared Types     | packages/types    |
| Testing (core)   | Jest              |
| Testing (UI e2e) | Playwright        |
| Monorepo         | Turborepo + pnpm  |
| Linting          | ESLint + Prettier |

## File Format

`.tgbl` = ZIP archive internally (see spec 001)

## Import Rules

- Always import types from `@template-goblin/types`
- Never import from `packages/core/src/...` — use `template-goblin` package name
- Never import from feature subfolders directly — use index.ts barrel exports

## Workflow

Spec → Dev → Reviewer → QA → Done (see agent roles in prompt.md)
```

---

## Part 1 — `.tgbl` File Format (spec 001)

### What is a `.tgbl` file?

A `.tgbl` file is a **ZIP archive** with a custom extension. Internally it contains:

```
template.tgbl (ZIP archive):
├── manifest.json            ← Template schema (fields, styles, meta) — NO binary blobs
├── background.png           ← Background image as actual binary (not base64)
├── fonts/
│   ├── custom-font-1.ttf    ← Actual .ttf binary files
│   └── custom-font-2.ttf
└── placeholders/
    ├── student_photo.png    ← Placeholder images as actual binaries
    └── sign.png
```

### Why ZIP instead of gzip-compressed JSON with base64?

- Fonts and images stored as real binaries — **~33% smaller** than base64 encoding
- ZIP compression handles each file type optimally
- Can extract just `manifest.json` without loading fonts/images (fast validation)
- Standard tooling: `JSZip` in browser, `adm-zip` in Node.js
- Still uses `.tgbl` extension — users don't know it's a ZIP

### File detection

ZIP files start with bytes `PK` (0x50 0x4B). The library should verify this on read.

### File storage path

- Default storage folder on Unix/macOS: `~/.templateGoblin/`
- Default storage folder on Windows: `%APPDATA%\templateGoblin\`
- Template ID = filename without extension (e.g. `result-template-2024.tgbl` → ID is `result-template-2024`)
- When the library is called, user passes either a full file path OR a folder path + template ID
- **Note to agent: discuss the exact storage and resolution strategy before implementing. Consider edge cases: relative paths, symlinks, missing files, OS differences, file permissions.**

---

## Part 2 — Template Schema (spec 002)

This is the `manifest.json` inside the `.tgbl` ZIP.

```json
{
  "version": "1.0",
  "meta": {
    "name": "string",
    "width": 595,
    "height": 842,
    "unit": "pt",
    "pageSize": "custom | A4 | A3 | Letter | Legal",
    "locked": false,
    "maxPages": 1,
    "createdAt": "ISO date string",
    "updatedAt": "ISO date string"
  },
  "fonts": [
    {
      "id": "string",
      "name": "string",
      "filename": "fonts/custom-font-1.ttf"
    }
  ],
  "groups": [
    {
      "id": "string",
      "name": "Student Info"
    }
  ],
  "fields": [
    {
      "id": "string",
      "type": "text | image | loop",
      "groupId": "string or null",
      "required": true,
      "jsonKey": "string (dot notation e.g. texts.name)",
      "placeholder": "string or null",
      "x": 0,
      "y": 0,
      "width": 100,
      "height": 50,
      "zIndex": 1,
      "style": {}
    }
  ]
}
```

### Page size handling

- When user uploads a background image, detect image dimensions
- Show a dialog: "Your image is X×Y pixels. Choose page size:"
  - **Match image** (use image dimensions as-is, convert px to pt at 72 DPI)
  - **A4** (595×842 pt) — scale image to fit
  - **A3** (842×1191 pt) — scale image to fit
  - **US Letter** (612×792 pt) — scale image to fit
  - **US Legal** (612×1008 pt) — scale image to fit
  - **Custom** — user enters width and height in pt
- Store chosen page size in `meta.pageSize` and resolved dimensions in `meta.width`/`meta.height`

### Field types and their style schemas

**Text field style:**

```json
{
  "fontId": "string or null (null = system font)",
  "fontFamily": "string (e.g. Helvetica, Times-Roman)",
  "fontSize": 12,
  "fontSizeDynamic": true,
  "fontSizeMin": 6,
  "lineHeight": 1.2,
  "fontWeight": "normal | bold",
  "fontStyle": "normal | italic",
  "textDecoration": "none | underline",
  "color": "#000000",
  "align": "left | center | right",
  "verticalAlign": "top | middle | bottom",
  "maxRows": 3,
  "overflowMode": "dynamic_font | truncate",
  "snapToGrid": true
}
```

**Line height rule**: Actual line height in pt = `fontSize × lineHeight`. Default `lineHeight` is `1.2`. Text box height = `maxRows × fontSize × lineHeight`. Width is user-defined. When user changes `maxRows` or `fontSize` or `lineHeight`, the bounding rectangle height auto-adjusts. User can only change the width manually — height is computed.

**Image field style:**

```json
{
  "fit": "fill | contain | cover",
  "placeholderFilename": "placeholders/student_photo.png or null"
}
```

**Loop field (table):**

```json
{
  "jsonKey": "loops.marks",
  "x": 0,
  "y": 0,
  "width": 400,
  "height": 200,
  "maxRows": 10,
  "maxColumns": 5,
  "multiPage": true,
  "headerStyle": {
    "fontFamily": "string",
    "fontSize": 11,
    "fontWeight": "bold",
    "align": "center",
    "color": "#000000",
    "backgroundColor": "#f0f0f0"
  },
  "rowStyle": {
    "fontFamily": "string",
    "fontSize": 10,
    "fontWeight": "normal",
    "color": "#000000",
    "overflowMode": "dynamic_font | truncate",
    "fontSizeDynamic": true,
    "fontSizeMin": 6,
    "lineHeight": 1.2
  },
  "cellStyle": {
    "borderWidth": 1,
    "borderColor": "#000000",
    "paddingTop": 4,
    "paddingBottom": 4,
    "paddingLeft": 6,
    "paddingRight": 6
  },
  "columns": [
    {
      "key": "subject_name",
      "label": "Subject",
      "width": 150,
      "align": "left",
      "style": {
        "fontWeight": "bold",
        "fontSize": 10,
        "textDecoration": "none | underline",
        "color": "#000000"
      }
    }
  ]
}
```

---

## Part 3 — Input JSON Format (spec passed to library at generation time)

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
    "student_photo": "<Buffer or base64 string>",
    "sign": "<Buffer or base64 string>"
  }
}
```

- `texts` — all dynamic text values
- `loops` — all array/table data
- `images` — all dynamic images as raw bytes (Buffer) or base64 string. Both must be supported.
- All keys must match the `jsonKey` values defined in the template fields (dot notation: `texts.name` → `data.texts.name`)

---

## Part 4 — `template-goblin` Library API (specs 007, 008)

### Install

```bash
npm install template-goblin
```

### Usage — Production (at scale)

```ts
import { loadTemplate, generatePDF } from 'template-goblin'

// Called ONCE at server startup or lazily on first request.
// Extracts ZIP, parses manifest, loads fonts & images into memory as Buffers.
const template = await loadTemplate('./templates/result-2024.tgbl')

// Called millions of times — zero disk I/O, zero ZIP extraction.
// Everything is already in memory inside the LoadedTemplate object.
const pdf: Buffer = await generatePDF(template, {
  texts: { name: 'John Doe', indexnumber: '12345' },
  loops: { marks: [{ subject_name: 'Math', grade: 'A' }] },
  images: { student_photo: imageBuffer },
})

// Use pdf Buffer in any framework:
// Hono:    c.body(pdf, 200, { 'Content-Type': 'application/pdf' })
// Express: res.type('pdf').send(pdf)
// Bun:     new Response(pdf, { headers: { 'Content-Type': 'application/pdf' } })
```

### Usage — One-off (convenience, not for scale)

```ts
import { generatePDFFromFile } from 'template-goblin'

// Loads template from disk + generates PDF in one call.
// Do NOT use this in a loop — use loadTemplate() + generatePDF() instead.
const pdf = await generatePDFFromFile('./template.tgbl', data)
```

### Core types

```ts
/** Returned by loadTemplate(). Everything in memory, ready for fast generation. */
interface LoadedTemplate {
  manifest: TemplateManifest // Parsed manifest.json
  backgroundImage: Buffer | null // Background image bytes
  fonts: Map<string, Buffer> // fontId → .ttf file bytes
  placeholders: Map<string, Buffer> // filename → image bytes
}
```

### Core functions to implement

- `loadTemplate(path: string): Promise<LoadedTemplate>` — extracts ZIP, parses manifest, loads all assets into memory Buffers. Called once.
- `generatePDF(template: LoadedTemplate, data: InputJSON): Promise<Buffer>` — renders PDF from in-memory template + data. Called at scale. Zero disk I/O.
- `generatePDFFromFile(path: string, data: InputJSON): Promise<Buffer>` — convenience. Calls loadTemplate + generatePDF internally.
- `validateData(template: LoadedTemplate, data: InputJSON): ValidationResult` — checks required fields, returns `{ valid: boolean, errors: string[] }`
- `saveTemplate(template: TemplateManifest, assets: TemplateAssets, outputPath: string): Promise<void>` — creates `.tgbl` ZIP file
- `readManifest(path: string): Promise<TemplateManifest>` — reads ONLY manifest.json from ZIP without loading assets (fast, for validation/listing)

### Internal render functions (not exported)

- `renderBackground(doc, backgroundImage, meta)` — renders background image on current page
- `renderText(doc, field, value, fonts)` — renders a text field with overflow/dynamic font logic
- `renderImage(doc, field, value)` — renders an image field with fit mode
- `renderLoop(doc, field, loopData, fonts, meta)` — renders a table, handles multi-page
- `measureText(text, font, fontSize, maxWidth): { lines: string[], fits: boolean }` — measures text within bounds

### PDF engine

- Use **PDFKit** for PDF generation
- Background image is rendered first on every page
- Then all fields rendered in zIndex order (lowest first)
- Single page by default. Multi-page only triggered by loop/table overflow (see multi-page rules)

### Text rendering rules (spec 003)

- Every text field has a bounding rectangle defined by `{ x, y, width, height }` where `height = maxRows × fontSize × lineHeight`
- Text **NEVER** overflows outside the bounding rectangle under any circumstance
- **`overflowMode: "dynamic_font"`**: Start at `fontSize`. Measure text. If it doesn't fit, reduce fontSize by 1. Repeat until text fits OR `fontSizeMin` is reached. At `fontSizeMin`, if text still doesn't fit, truncate remaining text with "…"
- **`overflowMode: "truncate"`**: Render at fixed `fontSize`. Any text that would exceed the bounding box is cut off. Append "…" to last visible line if truncated.
- `maxRows` controls how many lines of text are allowed. Combined with `fontSize` and `lineHeight`, this determines the box height.
- Vertical alignment (`top | middle | bottom`) positions the text block within the bounding rectangle.
- Text wraps at word boundaries. If a single word is wider than the box, it is broken mid-word.

### Image rendering rules (spec 004)

- Image is rendered inside the bounding rectangle `{ x, y, width, height }`
- **`fit: "fill"`**: Stretch image to fill entire rectangle (may distort)
- **`fit: "contain"`**: Scale image to fit inside rectangle while preserving aspect ratio (may have empty space)
- **`fit: "cover"`**: Scale image to cover entire rectangle while preserving aspect ratio (may crop)
- If image data is base64 string, decode to Buffer before rendering
- If image data is already a Buffer, use directly

### Loop/table rendering rules (spec 005)

- Column names are taken from `columns[].key`
- Column header text = `columns[].label` (defaults to key name if not set)
- Header row always uses `headerStyle` (bold by default, fixed font size)
- Data rows use `rowStyle` unless a specific `columns[].style` overrides for that column
- Column style overrides: `fontSize`, `fontWeight`, `textDecoration`, `color`, `align`
- Row overflow uses same `overflowMode` logic as text fields (applied per cell)
- Cell borders: drawn if `cellStyle.borderWidth > 0`. Uses `cellStyle.borderColor`.
- Cell padding: `cellStyle.paddingTop/Bottom/Left/Right` — inner spacing between border and text
- Table is drawn inside the user-defined rectangle. If rows exceed the rectangle height on current page, see multi-page rules.

### Multi-page rules (spec 006)

- By default, templates are single-page.
- If a loop/table has `multiPage: true` and its data rows exceed the bounding rectangle on the current page:
  1. Render as many rows as fit on the current page
  2. Add a new page
  3. Re-render the same background image on the new page
  4. Continue the table from where it left off on the previous page (re-render header row on each new page)
  5. Repeat until all rows are rendered
- `meta.maxPages` sets the maximum number of pages allowed. If the table would exceed this, generate an error (do not silently truncate).
- Only loop/table fields trigger multi-page. Text and image fields render only on page 1.
- All non-loop fields are rendered only on the first page. Subsequent pages only contain: background image + continued table rows.

### Font support (spec 019)

- If `fontId` is set on a field, load the font Buffer from `LoadedTemplate.fonts` and register with PDFKit via `doc.registerFont(fontId, fontBuffer)`
- If no custom font (`fontId` is null), use `fontFamily` which must be a PDFKit built-in font name (Helvetica, Times-Roman, Courier, etc.)
- Custom fonts are `.ttf` files stored as real binaries in the ZIP, referenced by `fonts[].filename` in manifest
- Font registration happens once per `generatePDF` call (at the start, before rendering fields)

---

## Part 5 — `template-goblin-ui` Builder App (specs 009–022)

### Tech stack

- **React 18 + Vite** (TypeScript)
- **react-konva** for the drag-and-drop canvas
- **Zustand** for state management (canvas state, UI state)
- **PDFKit** (browser build via `pdfkit` npm package bundled with Vite) for in-browser PDF preview
- **JSZip** for reading/writing `.tgbl` files in-browser
- No large icon libraries — use inline SVGs only
- Minimal dependencies — justify every package added with a comment

### Run modes

```bash
# Hosted at your domain
https://goblin.yoursite.dev

# Run locally via npx (Prisma-style — same UI, served via a small static server)
npx template-goblin-ui
# Opens at http://localhost:4242
```

### npx CLI approach

Structure the `packages/ui` such that:

- `vite build` produces a static dist folder
- The package includes a `bin/cli.js` that serves the built static files using a lightweight HTTP server (e.g. `sirv` or Node's built-in `http`)
- `npx template-goblin-ui` runs `bin/cli.js`, which serves the same UI that the hosted website has
- Same pattern as `npx prisma studio` — build is pre-compiled, CLI just serves it
- The `package.json` `bin` field points to `bin/cli.js`

### UI Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Toolbar (top bar)                                           │
│  [Upload BG] [Add Text] [Add Image] [Add Loop] [Preview]    │
│  [Save .tgbl] [Open .tgbl] [Lock Template] [Snap: ON/OFF]   │
│  [Undo] [Redo] [Fonts]                                       │
├────────────┬────────────────────────────┬────────────────────┤
│            │                            │                    │
│  Left      │   Canvas (react-konva)     │  Right Panel       │
│  Panel     │                            │                    │
│            │   Background image         │  - Field props     │
│  - Fields  │   is rendered here.        │  - JSON key        │
│    list    │   User drags, resizes,     │  - Style options   │
│  - Groups  │   draws rectangles         │  - Group assign    │
│  (collaps- │   for each field.          │  - Required toggle │
│   ible)    │                            │  - Placeholder     │
│            │                            │  ──────────────    │
│            │                            │  Example JSON      │
│            │                            │  [Default|Max|Min] │
│            │                            │  (auto-generated   │
│            │                            │   as user builds)  │
│            │                            │  ──────────────    │
│            │                            │  PDF size estimate │
└────────────┴────────────────────────────┴────────────────────┘
```

### Canvas behaviour (spec 009)

- User uploads a background image first. It is displayed on the canvas as the base layer.
- On upload, show **PageSizeDialog**: detect image dimensions, offer page size options (Match image, A4, A3, Letter, Legal, Custom). See Part 2 page size handling.
- Background image is compressed on upload (use `browser-image-compression` or a lightweight canvas-based compressor). Show original vs compressed size.
- Canvas size matches PDF page size (scaled to fit screen with zoom controls).
- **Snap to grid**: when enabled, all element positions and sizes snap to a configurable grid (default 5pt). Show grid lines lightly on canvas.
- **Z-index**: user can move elements forward/backward via right panel or context menu.
- Elements can be selected, moved, resized. Selected element shows resize handles.
- **Right-click context menu** on element: Bring Forward, Send Backward, Bring to Front, Send to Back, Delete, Duplicate.
- **Multi-select**: Shift+click to select multiple elements. Move/delete all selected.

### Undo / Redo (spec 018)

- Track all canvas state changes in a history stack (Zustand middleware or custom implementation)
- `Ctrl+Z` / `Cmd+Z` — undo last action
- `Ctrl+Shift+Z` / `Cmd+Shift+Z` — redo
- Toolbar buttons: [Undo] [Redo] with disabled state when nothing to undo/redo
- Actions tracked: add/remove field, move field, resize field, change any property, change z-index, group changes
- History limit: 50 steps (configurable)

### Adding a text field (spec 010)

1. User clicks "Add Text" in toolbar
2. User draws a rectangle on the canvas (click and drag)
3. Right panel shows text field properties:
   - **JSON key** (e.g. `texts.name`) — auto-prefixed with `texts.`
   - **Group** (dropdown of existing groups or create new)
   - **Required / Optional** toggle
   - **Placeholder text** (shown on canvas when no preview value)
   - **Max rows** (number input — determines box height via `maxRows × fontSize × lineHeight`)
   - **Line height** (number input, default 1.2)
   - **Font family** (system fonts dropdown + uploaded custom fonts)
   - **Font size** (number input, in pt)
   - **Font size mode**: Fixed or Dynamic (if dynamic, show min font size input)
   - **Overflow mode**: Dynamic Font Size / Truncate
   - **Font weight**: Normal / Bold
   - **Font style**: Normal / Italic
   - **Text decoration**: None / Underline
   - **Text color** (color picker)
   - **Alignment**: Left / Center / Right
   - **Vertical alignment**: Top / Middle / Bottom
   - **Preview input**: user types a value to see live preview on canvas

### Adding an image field (spec 011)

1. User clicks "Add Image" in toolbar
2. User draws a rectangle on the canvas
3. Right panel shows:
   - **JSON key** (e.g. `images.student_photo`) — auto-prefixed with `images.`
   - **Group**
   - **Required / Optional** toggle
   - **Placeholder image upload** (optional — shown on canvas and stored in ZIP `placeholders/` folder)
   - **Fit mode**: Fill / Contain / Cover

### Adding a loop (table) field (spec 012)

1. User clicks "Add Loop" in toolbar
2. User draws a rectangle on the canvas
3. Right panel shows:
   - **JSON key** (e.g. `loops.marks`) — auto-prefixed with `loops.`
   - **Max rows** (number input — max rows visible per page)
   - **Max columns** (number input)
   - **Multi-page** toggle (if ON, table can span multiple pages. Shows max pages input.)
   - **Column definitions**:
     - Each column: key, label, width, align
     - Individual column style override: font size, font weight, text decoration, color, align
     - Drag to reorder columns
   - **Header style**: font size, font weight (default bold), color, background color, align
   - **Row style**: font size, overflow mode, dynamic font min size, line height, color
   - **Cell style**: border width, border color, padding (top/bottom/left/right)
   - Add / remove columns

### Right panel — Example JSON section (spec 014)

- Auto-generated as user adds fields to canvas
- Reflects the exact JSON structure the developer needs to pass to `generatePDF()`
- Three mode toggle buttons: **Default** | **Max** | **Min**
  - **Default mode**: all values are empty strings `""` / `null` / empty arrays `[]`. Just shows the structure.
  - **Max mode**:
    - Text strings filled with `"It works in my machine "` repeated N times (user can adjust N via a slider, default 5)
    - Image fields show a built-in placeholder image (embed a small goblin-themed SVG/PNG in the app as a fun default)
    - Loop arrays filled with `maxRows` number of rows, each cell also filled with max-length string
    - **Purpose**: user can see how the template handles edge cases — overflow, dynamic font, z-index overlap
  - **Min mode**:
    - Required fields have a short sample value (e.g. `"A"` for text, 1 row for loops)
    - Optional fields are `""` / `null` / `[]`
- JSON is **syntax-highlighted** and **copyable** (one-click copy button)
- Shows **approximate PDF file size estimate** below the JSON

### PDF Preview (spec 015)

- "Preview" button in toolbar
- Uses current JSON mode (Default/Max/Min) data to generate an actual PDF using the core library's rendering logic (shared `packages/core` code, bundled for browser via Vite)
- PDF rendered inline in a **resizable side panel** (can minimize, maximize, or **open in new browser tab**)
- Preview updates live when JSON mode changes
- Show a loading spinner while generating

### Template locking (spec 017)

- Toggle "Lock Template" in toolbar
- When locked: canvas is read-only — no elements can be moved, resized, added, or edited
- Locked state is saved in `.tgbl` `meta.locked`
- UI shows a clear locked indicator (lock icon in toolbar, slight semi-transparent overlay tint on canvas)
- User must explicitly click "Unlock" to edit again
- Preview and JSON modes still work when locked

### Field groups (spec 020)

- Designer can create named groups (e.g. "Student Info", "Marks Table")
- Each field can be assigned to exactly one group (or no group)
- Left panel shows fields organised by group, with an "Ungrouped" section
- Groups are collapsible/expandable in left panel
- Group name is reflected in auto-generated JSON comments for clarity
- Groups are purely organisational — they don't affect the JSON key structure

### Save / Open (spec 016)

- **"Save .tgbl"** — collects manifest + all assets (background, fonts, placeholders), creates ZIP using JSZip, triggers browser download with `.tgbl` extension
- **"Open .tgbl"** — file picker, reads ZIP using JSZip, loads manifest, restores all assets, populates canvas
- Validate on open: check ZIP structure, verify manifest schema, report clear errors if invalid

### Custom font upload (spec 019)

- "Fonts" button in toolbar opens a fonts management panel/dialog
- User uploads `.ttf` files
- Font is stored in the `.tgbl` ZIP under `fonts/` folder
- Font metadata (id, name, filename) stored in manifest `fonts[]` array
- Uploaded fonts appear in the font family dropdown for all text fields and loop columns
- Preview text in the font manager shows how the font looks
- User can remove a font (warn if any field uses it)

---

## Part 6 — Error Handling (spec 021)

Error handling is critical for both the library and the UI. Implement robust error handling everywhere.

### Library errors (packages/core)

All errors should extend a base `TemplateGoblinError` class:

```ts
class TemplateGoblinError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'TemplateGoblinError'
    this.code = code
  }
}
```

**Error codes and when they occur:**

| Code                     | When                                                     | Message example                                                                          |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `FILE_NOT_FOUND`         | `.tgbl` path doesn't exist                               | `Template file not found: /path/to/template.tgbl`                                        |
| `INVALID_FORMAT`         | File is not a valid ZIP or missing `PK` header           | `Invalid .tgbl file: not a valid ZIP archive`                                            |
| `MISSING_MANIFEST`       | ZIP doesn't contain `manifest.json`                      | `Invalid .tgbl file: missing manifest.json`                                              |
| `INVALID_MANIFEST`       | manifest.json fails schema validation                    | `Invalid manifest: field "fields[2].style.fontSize" must be a number`                    |
| `MISSING_ASSET`          | Manifest references a font/image file not in ZIP         | `Missing asset: fonts/custom-font-1.ttf referenced in manifest but not found in archive` |
| `MISSING_REQUIRED_FIELD` | Required field key missing from input JSON               | `Missing required field: texts.name`                                                     |
| `INVALID_DATA_TYPE`      | Loop data is not an array, image is not Buffer/string    | `Invalid data for field "loops.marks": expected array, got string`                       |
| `MAX_PAGES_EXCEEDED`     | Table data would require more pages than `meta.maxPages` | `Table "loops.marks" requires 5 pages but maxPages is 3`                                 |
| `FONT_LOAD_FAILED`       | .ttf file is corrupt or not a valid font                 | `Failed to load font: fonts/custom-font-1.ttf`                                           |
| `PDF_GENERATION_FAILED`  | PDFKit throws during rendering                           | `PDF generation failed: [underlying PDFKit error]`                                       |

**Validation function returns structured errors:**

```ts
interface ValidationResult {
  valid: boolean
  errors: Array<{
    code: string
    field: string
    message: string
  }>
}
```

### UI errors (packages/ui)

- **On file open**: If `.tgbl` is invalid, show a toast/banner with the specific error. Never crash.
- **On save**: If save fails (e.g. browser download API error), show error toast with retry option.
- **Duplicate JSON keys**: When user adds a field, if the `jsonKey` already exists on another field, show a red warning inline on the right panel. Block save until resolved.
- **Missing background**: If user tries to add fields before uploading a background image, show a prompt: "Upload a background image first."
- **Font removal warning**: If user tries to remove a font that's used by fields, show a confirmation dialog listing which fields use it.
- **Preview errors**: If PDF preview generation fails, show the error message in the preview panel instead of crashing.
- **All errors must be user-friendly** — no raw stack traces. Always explain what happened and what the user can do about it.

---

## Part 7 — Testing Strategy

### Core library tests (Jest)

QA agent writes tests from specs, not from implementation.

**File: `packages/core/tests/`**

Tests to write:

- **File read/write**: Create a `.tgbl` with known content → read it back → verify manifest and assets match
- **Invalid file handling**: Pass a non-ZIP file → expect `INVALID_FORMAT` error. Pass ZIP without manifest → expect `MISSING_MANIFEST`
- **loadTemplate**: Load a valid `.tgbl` → verify `LoadedTemplate` has all buffers populated. Load with missing font file → expect `MISSING_ASSET`
- **validateData**: Template with required `texts.name` → pass data without it → expect `MISSING_REQUIRED_FIELD`. Pass complete data → expect `valid: true`
- **Text rendering**: Text that fits → renders at original fontSize. Text that overflows with dynamic mode → renders at smaller fontSize. Text that overflows at fontSizeMin → truncates with "…"
- **Image rendering**: Buffer input works. Base64 string input works. Invalid image data → error.
- **Loop rendering**: 3 rows of data, 3 columns → renders table with correct cell positions. More rows than rectangle height → multi-page triggered. More pages than maxPages → `MAX_PAGES_EXCEEDED` error.
- **Multi-page**: Verify background re-renders on each page. Verify header re-renders on each page. Verify row continuation is correct.
- **Font support**: Custom font registered → text renders with it. Missing fontId → falls back to fontFamily.

### UI E2E tests (Playwright)

QA agent writes tests from user journeys, not from component code.

**File: `packages/ui/e2e/`**

Tests to write:

- **Designer creates template**: Upload background → add text field → set JSON key → add image field → save .tgbl → verify download
- **Open existing template**: Open a pre-built .tgbl → verify all fields appear on canvas with correct positions
- **Text field editing**: Add text field → change font size → change color → verify canvas preview updates
- **Loop field**: Add loop → add 3 columns → set keys → verify column headers appear on canvas
- **Undo/Redo**: Add field → undo → field disappears → redo → field reappears
- **Template locking**: Lock template → try to drag a field → verify it doesn't move → unlock → drag works
- **JSON preview modes**: Add fields → switch to Max mode → verify JSON has repeated strings → switch to Min → verify optional fields are empty
- **PDF preview**: Add fields → click Preview → verify PDF panel opens with content
- **Save/Open roundtrip**: Create template → save → open the saved file → verify everything matches
- **Error cases**: Try to open a `.txt` file as `.tgbl` → verify error message. Add duplicate JSON key → verify warning.

---

## Part 8 — Spec File Template

Every spec file in `specs/` follows this format:

```markdown
# Spec [NUMBER] — [TITLE]

## Status

Draft | In Progress | Review | Complete

## Summary

One paragraph describing what this spec covers.

## Requirements

- [ ] REQ-001: [Requirement description]
- [ ] REQ-002: [Requirement description]
      ...

## Behaviour

Detailed description of how the feature works. Include:

- Happy path
- Edge cases
- Error conditions

## Input / Output

What goes in, what comes out. Include type signatures where relevant.

## Acceptance Criteria

- [ ] AC-001: [Testable criterion]
- [ ] AC-002: [Testable criterion]
      ...

## Dependencies

Which other specs this depends on.

## Notes

Any open questions or decisions deferred.
```

---

## Part 9 — Journey File Template

Every journey file in `journeys/` follows this format:

```markdown
# Journey [NUMBER] — [TITLE]

## Actor

Who is performing this journey (Designer / Developer)

## Goal

What they want to achieve.

## Preconditions

What must be true before starting.

## Steps

1. [Action the user takes]
   - Expected result: [What should happen]
2. [Next action]
   - Expected result: [What should happen]
     ...

## Edge Cases

- [What if X happens?] → [Expected behaviour]

## Success Criteria

What makes this journey "done" from the user's perspective.
```

---

## Part 10 — Claude Code Custom Commands

### `/spec` command (`.claude/commands/spec.md`)

```markdown
Create a new spec file in the `specs/` directory.

Input: feature name and number
Output: a new spec file following the template in Part 8 of prompt.md

Steps:

1. Determine the next spec number from existing files
2. Create the spec file with all sections filled based on the feature description
3. Cross-reference with existing specs for dependencies
4. Mark status as "Draft"
```

### `/journey` command (`.claude/commands/journey.md`)

```markdown
Create a new user journey file in the `journeys/` directory.

Input: journey description
Output: a new journey file following the template in Part 9 of prompt.md

Steps:

1. Determine the next journey number from existing files
2. Write the journey from the user's perspective (Designer or Developer)
3. Include edge cases and error scenarios
4. Cross-reference with relevant specs
```

### `/implement` command (`.claude/commands/implement.md`)

```markdown
You are the DEV AGENT. Implement a feature from its spec.

Input: spec file path (e.g. specs/003-text-rendering.md)
Output: implementation code that satisfies every requirement and acceptance criterion

Steps:

1. Read the spec file completely
2. Read all dependency specs referenced
3. Read CLAUDE.md for project rules
4. Read relevant journey files for context
5. Implement the feature — code must match spec exactly
6. Write inline comments referencing spec requirement IDs (e.g. // REQ-003)
7. Run `pnpm type-check` and fix any type errors
8. Submit for review (describe what was implemented and which spec it covers)

Rules:

- Never deviate from the spec
- If the spec is ambiguous, STOP and ask — don't guess
- Use types from @template-goblin/types
- Follow all CLAUDE.md hard rules
```

### `/review` command (`.claude/commands/review.md`)

```markdown
You are the REVIEWER AGENT. Use maximum reasoning effort.

Input: code diff or file paths to review + the spec file it implements
Output: either ✅ APPROVED or ❌ FEEDBACK with specific comments

Steps:

1. Read the spec file completely
2. Read all relevant journey files
3. Read CLAUDE.md for project rules
4. Review every line of the submitted code against the spec:
   - Does each REQ have a corresponding implementation?
   - Are all AC (acceptance criteria) satisfiable by this code?
   - Are edge cases from the spec handled?
   - Are there silent failures or swallowed errors?
   - Are there any type holes (implicit any, type assertions without checks)?
   - Does the code follow CLAUDE.md hard rules?
5. If issues found: return ❌ FEEDBACK with:
   - File path and line number
   - What's wrong (reference spec requirement)
   - What should change
6. If everything is correct: return ✅ APPROVED

Rules:

- Never fix code yourself — only review and comment
- Be thorough — check every function, every branch, every error path
- Reference spec requirement IDs in feedback (e.g. "REQ-003 not satisfied because...")
- Check that error codes from spec 021 are used correctly
```

### `/test` command (`.claude/commands/test.md`)

```markdown
You are the QA AGENT. Write tests for a completed feature.

Input: spec file path + journey file paths
Output: test files (Jest for core, Playwright for UI)

Steps:

1. Read the spec file completely — especially Requirements and Acceptance Criteria
2. Read relevant journey files for user-facing scenarios
3. Do NOT read implementation code to design test cases (you may read code only to find function signatures, selectors, or API shapes)
4. For each AC, write at least one test that verifies it
5. For each edge case in the spec, write a test
6. For each error condition in spec 021, write a test that verifies the correct error is thrown
7. Run all tests: `pnpm test` for Jest, `pnpm test:e2e` for Playwright
8. If failures: return failing test output to Dev Agent

Rules:

- Tests verify BEHAVIOUR described in specs, not implementation details
- Never test internal function calls or mock internals — test inputs and outputs
- Use descriptive test names: "should truncate text with ellipsis when overflowMode is truncate and text exceeds box"
- Group tests by spec requirement ID
```

---

## Part 11 — turbo.json Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "type-check": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "test:e2e": {
      "dependsOn": ["build"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

Build order enforced by Turborepo: `types` → `core` → `ui`

---

## Part 12 — Advanced Features (implement AFTER all core features are complete and tested)

These must NOT be started until all core specs (001–022) are complete and all tests pass.

1. **Batch PDF generation** — accept array of JSON objects, return array of Buffers. Use Node.js `child_process.fork()` to spawn child processes for parallel generation. Each child gets a serialized `LoadedTemplate` and generates one PDF.
2. **S3 / cloud storage** — option to save generated PDFs to S3 or compatible storage instead of returning Buffer.
3. **Image compression advanced mode** — in UI, show side-by-side comparison of original vs compressed background image with file size diff. User can adjust compression quality.
4. **Font subsetting** — when saving `.tgbl`, subset the .ttf font to include only the glyphs used in the template placeholders + common characters. Reduces file size significantly.

---

## Part 13 — README.md Structure

The README must include:

1. **What TemplateGoblin is** — one paragraph, explain the problem it solves
2. **Quick start for library usage** — show Hono, Express, and Bun examples with `loadTemplate` + `generatePDF`
3. **How to run the UI locally** — `npx template-goblin-ui` instructions
4. **How to use the hosted UI** — link to hosted version
5. **`.tgbl` file format explanation** — what it is, how it's structured (ZIP with manifest + assets)
6. **Full input JSON format** with a complete example
7. **All `generatePDF` options** documented with types
8. **Error codes table** — all `TemplateGoblinError` codes and what they mean
9. **Custom fonts** — how to use custom fonts in templates
10. **Multi-page tables** — how to configure and use
11. **Contributing guide** — how to set up the dev environment, run tests, submit PRs
12. **License**: MIT

---

## Important Notes for the Agent

- **Read CLAUDE.md at the start of every session.** It is your project memory.
- **Specs first, code second.** Before implementing any feature, ensure its spec file exists and is complete. If not, create it using `/spec`.
- **Discuss `.tgbl` storage and path resolution strategy before implementing** — consider: absolute path, relative path, folder + ID pattern, OS differences, missing file errors, symlinks.
- **Keep the library bundle size minimal** — it must be fast enough to generate PDFs for millions of users. `loadTemplate` is called once; `generatePDF` is called millions of times — optimise the hot path.
- **The UI and library share types via `@template-goblin/types`** — never duplicate type definitions.
- **When in doubt about a feature scope**, implement the simplest working version first and note what can be extended later.
- **Do not add any dependency without a clear reason.** Comment why each dependency is used in the relevant `package.json`.
- **The canvas in the UI is a WYSIWYG representation of the final PDF** — what the designer sees must match what `generatePDF` produces. Any visual discrepancy is a bug.
- **Error messages must be user-friendly** in the UI and developer-friendly in the library (include field names, paths, expected vs actual types).
