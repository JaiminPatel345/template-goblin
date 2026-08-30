import { CodeBlock } from '../../components/CodeBlock'
import { Callout, DocHeader, DocNext, DocTable } from '../../components/DocParts'
import { PLAYGROUND_URL } from '../../lib/constants'

const INSTALL = `npm install template-goblin
# or: pnpm add template-goblin · yarn add template-goblin · bun add template-goblin`

const GENERATE = `import { writeFile } from 'node:fs/promises'
import { loadTemplate, generatePDF } from 'template-goblin'

// Load the template ONCE — parses the ZIP, fonts, and images into memory
const template = await loadTemplate('./certificate.tgbl')

// Fill it with data — keys must match the field data-keys in your template
const pdf = await generatePDF(template, {
  texts: { name: 'John Doe', course: 'Advanced TypeScript' },
  tables: { modules: [{ title: 'Generics', score: 'A' }] },
  images: {},
})

await writeFile('./out.pdf', pdf)`

const SERVER = `import { Hono } from 'hono'
import { loadTemplate, generatePDF } from 'template-goblin'

const app = new Hono()
const template = await loadTemplate('./invoice.tgbl') // once, at boot

app.post('/pdf', async (c) => {
  const pdf = await generatePDF(template, await c.req.json())
  return c.body(pdf, 200, { 'Content-Type': 'application/pdf' })
})

export default app`

const ERRORS = `import { TemplateGoblinError } from 'template-goblin'

try {
  const pdf = await generatePDF(template, data)
} catch (err) {
  if (err instanceof TemplateGoblinError) {
    if (err.code === 'MISSING_REQUIRED_FIELD') {
      // err.details carries fieldId, jsonKey, and more
    }
  }
}`

const ERROR_ROWS: [string, string][] = [
  ['FILE_NOT_FOUND', '.tgbl path does not exist'],
  ['INVALID_FORMAT', 'File is not a valid ZIP, or an image’s bytes are unreadable'],
  ['MISSING_MANIFEST', 'ZIP is missing manifest.json'],
  ['INVALID_MANIFEST', 'Manifest fails schema validation'],
  ['MISSING_ASSET', 'A referenced font or image is not in the archive'],
  ['MISSING_REQUIRED_FIELD', 'A required field has no value in the input JSON'],
  ['INVALID_DATA_TYPE', 'Wrong type for a field (e.g. string where an array is expected)'],
  ['MAX_PAGES_EXCEEDED', 'A multi-page table needs more pages than maxPages allows'],
  ['FONT_LOAD_FAILED', 'A font file is corrupt or invalid'],
  ['PDF_GENERATION_FAILED', 'PDFKit raised an error while rendering'],
  ['INVALID_ARGUMENT', 'An argument passed to a library function was invalid'],
]

/** Developer-facing quick-start + API reference. */
export function Sdk() {
  return (
    <>
      <DocHeader
        kicker="For developers"
        title="Generate PDFs with the SDK"
        intro="Install the library, load a template once, and render PDFs from JSON. Pure TypeScript — runs in Node, Bun, Deno, and serverless."
      />

      <h2>Install</h2>
      <CodeBlock code={INSTALL} file="shell" lang="bash" />

      <h2>Generate your first PDF</h2>
      <p>
        Get a <code>.tgbl</code> from the{' '}
        <a className="link" href={PLAYGROUND_URL}>
          visual editor
        </a>{' '}
        (or any existing one), drop it next to your script, and:
      </p>
      <CodeBlock code={GENERATE} file="generate.ts" />
      <p>
        Run it with <code>npx tsx generate.ts</code> (TypeScript, no build step) or compile and run
        with Node.
      </p>

      <Callout>
        <strong>The one pattern that matters:</strong> call <code>loadTemplate()</code> once at
        startup — it does all the disk work. Then call <code>generatePDF()</code> as many times as
        you like; it touches no disk and reuses the in-memory template.
      </Callout>

      <h2>Use it in a server</h2>
      <p>
        Load the template at boot, render per request. The same shape works in Express, Bun, Next.js
        route handlers, and Lambda.
      </p>
      <CodeBlock code={SERVER} file="server.ts" />

      <h2>Core functions</h2>
      <DocTable
        head={['Function', 'What it does']}
        rows={[
          [
            <code>loadTemplate(path)</code>,
            'Parse a .tgbl file into an in-memory LoadedTemplate. Call once.',
          ],
          [
            <code>generatePDF(template, data, opts?)</code>,
            'Render one PDF as a Buffer. The hot path — zero disk I/O.',
          ],
          [
            <code>generatePDFFromFile(path, data)</code>,
            'Load + generate in one call. Convenience only — don’t use in a loop.',
          ],
          [
            <code>validateData(template, data)</code>,
            'Check input JSON against the template; returns { valid, errors }.',
          ],
          [
            <code>readManifest(path)</code>,
            'Read only the manifest (no assets) — fast for listing or validation.',
          ],
          [
            <code>saveTemplate(manifest, assets, path)</code>,
            'Write a .tgbl ZIP from a manifest + assets.',
          ],
        ]}
      />

      <h2>generatePDF options</h2>
      <DocTable
        head={['Option', 'Default', 'Purpose']}
        rows={[
          [
            <code>imageFetchTimeoutMs</code>,
            <code>10000</code>,
            'Abort each HTTP image fetch after this many ms.',
          ],
          [
            <code>imageResolveConcurrency</code>,
            <code>6</code>,
            'Max concurrent image resolutions per call.',
          ],
        ]}
      />

      <h2>Errors</h2>
      <p>
        Every failure is a <code>TemplateGoblinError</code> with a stable <code>code</code> and a{' '}
        <code>details</code> object (field id, json key, resolved path…) for programmatic handling.
      </p>
      <CodeBlock code={ERRORS} file="error-handling.ts" />
      <DocTable
        head={['Code', 'When']}
        rows={ERROR_ROWS.map(([code, when]) => [<code>{code}</code>, when])}
      />

      <DocNext
        prev={{ to: '/docs/use-the-ui', label: 'Use the editor' }}
        next={{ to: '/docs/schema', label: 'Template & input schema' }}
      />
    </>
  )
}
