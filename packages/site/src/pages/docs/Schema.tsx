import { CodeBlock } from '../../components/CodeBlock'
import { Callout, DocHeader, DocNext, DocTable } from '../../components/DocParts'

const INPUT = `{
  "texts":  { "name": "Aisha Khan", "date": "2026-06-12" },
  "tables": { "marks": [
    { "subject": "Mathematics", "grade": "A"  },
    { "subject": "Science",     "grade": "B+" }
  ] },
  "images": { "photo": "https://cdn.example.com/aisha.png" },
  "links":  { "verify": "https://verify.example.com/abc123" },
  "condition": [
    { "grade": "honors" }
  ]
}`

const IMAGES = `images: {
  // 1 — Buffer
  logo: fs.readFileSync('logo.png'),
  // 2 — base64 (with or without the data: prefix)
  sign: 'data:image/png;base64,iVBORw0KGgo...',
  // 3 — local path (absolute, ./, ../, ~/, or a drive letter)
  seal: './assets/seal.jpg',
  // 4 — HTTP/HTTPS URL (S3 presigned, CDN, …)
  photo: 'https://cdn.example.com/photo.png',
  // 5 — explicit shape (escape hatch when auto-detection guesses wrong)
  raw: { type: 'url', value: 'https://…', headers: { Authorization: 'Bearer …' } },
}`

/** Reference for the input JSON and the template manifest model. */
export function Schema() {
  return (
    <>
      <DocHeader
        kicker="Reference"
        title="Template & input schema"
        intro="What the editor produces and what the SDK expects: the manifest model and the input JSON that fills it."
      />

      <h2>The input JSON</h2>
      <p>
        Every call to <code>generatePDF</code> takes one object with up to four buckets. Keys inside
        each bucket must match the <strong>data keys</strong> you set on dynamic fields in the
        editor.
      </p>
      <CodeBlock code={INPUT} file="data.json" lang="json" />
      <DocTable
        head={['Bucket', 'Type', 'Fills']}
        rows={[
          [<code>texts</code>, <code>Record&lt;string, string&gt;</code>, 'Dynamic text fields'],
          [
            <code>tables</code>,
            <code>Record&lt;string, Row[]&gt;</code>,
            'Table (loop) fields — each row is an object keyed by column',
          ],
          [
            <code>images</code>,
            <code>Record&lt;string, ImageInput&gt;</code>,
            'Dynamic image fields',
          ],
          [<code>links</code>, <code>Record&lt;string, string&gt;</code>, 'Dynamic hyperlink URLs'],
          [
            <code>condition</code>,
            <code>Array&lt;Record&lt;string, string&gt;&gt; | string</code>,
            'Condition-based styling overrides per field (e.g. [{ keyName: conditionName }]) or global condition string',
          ],
        ]}
      />
      <Callout>
        Static fields don’t appear in the input at all — their values live in the template. You only
        send data for fields you marked <strong>dynamic</strong>.
      </Callout>

      <h2>Image inputs</h2>
      <p>
        An image value can be a Buffer, a base64 string, a file path, or a URL — all auto-detected,
        all producing identical output for the same bytes. Resolution happens once, before
        rendering, so a bad path or failed fetch fails fast.
      </p>
      <CodeBlock code={IMAGES} file="images.ts" />

      <h2>The template manifest</h2>
      <p>
        Inside a <code>.tgbl</code>, <code>manifest.json</code> describes the document. You normally
        never write it by hand — the editor does — but it’s plain JSON, fully typed by{' '}
        <code>@template-goblin/types</code>.
      </p>
      <DocTable
        head={['Key', 'Describes']}
        rows={[
          [
            <code>pages</code>,
            'Page size, orientation, and per-page background (colour or image).',
          ],
          [<code>fields</code>, 'The body fields — text, image, and table elements on the page.'],
          [<code>header</code>, 'An optional band repeated at the top of each page.'],
          [<code>footer</code>, 'An optional band at the bottom — often where page numbers live.'],
          [<code>pageNumber</code>, 'Optional automatic page-number stamp configuration.'],
        ]}
      />

      <h2>A field</h2>
      <p>Every field — whatever its type — shares a common shape:</p>
      <DocTable
        head={['Property', 'Meaning']}
        rows={[
          [<code>id</code>, 'Stable unique identifier for the field.'],
          [
            <code>type</code>,
            <span>
              <code>text</code>, <code>image</code>, or <code>table</code>.
            </span>,
          ],
          [
            <code>x, y, width, height</code>,
            'The bounding box, in points. Content never overflows it.',
          ],
          [<code>zIndex</code>, 'Stacking order — higher draws on top.'],
          [
            <code>source</code>,
            <span>
              <code>{`{ mode: 'static', value }`}</code> or{' '}
              <code>{`{ mode: 'dynamic', jsonKey }`}</code>.
            </span>,
          ],
          [
            <code>style</code>,
            'Type-specific styling: font, colour, alignment, fit, table columns…',
          ],
          [<code>hyperlink</code>, 'Optional static or dynamic clickable link.'],
        ]}
      />
      <Callout variant="warn">
        Content is always clipped to the field’s box — text shrinks or truncates, images fit by{' '}
        <code>contain</code>/<code>cover</code>/<code>fill</code>, and tables paginate. A field
        never bleeds outside its rectangle.
      </Callout>

      <DocNext
        prev={{ to: '/docs/sdk', label: 'SDK & API' }}
        next={{ to: '/docs/file-format', label: '.tgbl file format' }}
      />
    </>
  )
}
