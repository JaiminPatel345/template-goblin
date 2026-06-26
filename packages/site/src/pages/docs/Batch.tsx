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

const STORE = `import { loadTemplate, generateAndStore, S3StorageProvider } from 'template-goblin'

const template = await loadTemplate('./invoice.tgbl')
const s3 = new S3StorageProvider({ bucket: 'my-pdfs', region: 'us-east-1' })

const { url, size } = await generateAndStore(template, data, s3, {
  key: 'invoice-12345.pdf',
  prefix: 'pdfs/2026/',
})`

/** Scaling guide: parallel batch generation and direct-to-storage upload. */
export function Batch() {
  return (
    <>
      <DocHeader
        kicker="At scale"
        title="Batch generation & storage"
        intro="Render thousands of PDFs from one template in parallel, and upload them straight to cloud storage."
      />

      <h2>The pattern that scales</h2>
      <p>
        The single most important habit: call <code>loadTemplate()</code> <strong>once</strong>,
        then reuse that in-memory template for every PDF. Each <code>generatePDF()</code> call does
        zero disk I/O, so one loaded template can back millions of renders.
      </p>

      <h2>Batch generation</h2>
      <p>
        <code>generateBatchPDF</code> renders an array of inputs across several worker processes in
        parallel and collects the results. A row that fails is reported in its own result rather
        than crashing the whole batch, so you can retry or log just the failures.
      </p>
      <CodeBlock code={BATCH} file="batch.ts" />
      <Callout>
        Tune <code>concurrency</code> to your CPU. <code>onProgress(done, total)</code> fires as
        each PDF finishes — wire it to a progress bar or a log line. Each result carries{' '}
        <code>index</code>, <code>success</code>, and either <code>pdf</code> or <code>error</code>.
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
