import { CodeBlock } from '../../components/CodeBlock'
import { Callout, DocHeader, DocNext } from '../../components/DocParts'

const BATCH = `import { loadTemplate, generateBatchPDF } from 'template-goblin'

const template = await loadTemplate('./certificate.tgbl')

const students = [
  { texts: { name: 'Alice' }, tables: {}, images: {} },
  { texts: { name: 'Bob'   }, tables: {}, images: {} },
  // …thousands more
]

const results = await generateBatchPDF(template, students, {
  concurrency: 4,
  onProgress: (done, total) => console.log(\`\${done}/\${total}\`),
})

for (const r of results) {
  if (r.success) await save(r.index, r.pdf)
  else console.error(\`#\${r.index} failed: \${r.error}\`)
}`

const PREPARED = `import { loadTemplate, prepareTemplate, generatePreparedPDF } from 'template-goblin'

const template = await loadTemplate('./certificate.tgbl')

// Render the STATIC layer (background, logos, fixed text) once…
const prepared = await prepareTemplate(template)

// …then only the dynamic fields are drawn per call, over a copy of that base
const a = await generatePreparedPDF(prepared, { texts: { name: 'Alice' } })
const b = await generatePreparedPDF(prepared, { texts: { name: 'Bob' } })`

const STORE = `import { loadTemplate, generateAndStore, S3StorageProvider } from 'template-goblin'

const template = await loadTemplate('./invoice.tgbl')
const s3 = new S3StorageProvider({ bucket: 'my-pdfs', region: 'us-east-1' })

const { url, size } = await generateAndStore(template, data, s3, {
  key: 'invoice-12345.pdf',
  prefix: 'pdfs/2026/',
})`

/** Scaling guide: batch pool, the static/dynamic split, and storage. */
export function Batch() {
  return (
    <>
      <DocHeader
        kicker="At scale"
        title="Batch generation & storage"
        intro="Render thousands of PDFs from one template with a worker pool, cache the static layer, and upload straight to cloud storage."
      />

      <h2>Batch with a worker pool</h2>
      <p>
        <code>generateBatchPDF</code> spreads work across a persistent pool of worker processes.
        Each worker deserializes the template once and streams jobs — far faster than spawning a
        process per PDF. A failed row is reported in its result rather than crashing the batch.
      </p>
      <CodeBlock code={BATCH} file="batch.ts" />
      <Callout>
        Tune <code>concurrency</code> to your CPU. <code>onProgress(done, total)</code> fires as
        each PDF finishes — wire it to a progress bar or log line.
      </Callout>

      <h2>Cache the static layer</h2>
      <p>
        When one template is rendered many times, the static parts — background, logos, fixed text —
        are identical on every output. <code>prepareTemplate</code> renders that layer once into an
        in-memory base; <code>generatePreparedPDF</code> then draws only the dynamic fields on top
        of a copy of it.
      </p>
      <CodeBlock code={PREPARED} file="prepared.ts" />
      <Callout>
        It’s safe by construction: the fast path runs only when it’s provably identical to a full
        render, and otherwise falls back to <code>generatePDF</code> automatically. You always get
        the same PDF — just faster when it’s safe.
      </Callout>

      <h2>Generate straight to storage</h2>
      <p>
        <code>generateAndStore</code> renders and uploads in one step. An{' '}
        <code>S3StorageProvider</code> ships in the box; implement the <code>StorageProvider</code>{' '}
        interface for GCS, Azure Blob, or anything else.
      </p>
      <CodeBlock code={STORE} file="store.ts" />

      <DocNext prev={{ to: '/docs/file-format', label: '.tgbl file format' }} />
    </>
  )
}
