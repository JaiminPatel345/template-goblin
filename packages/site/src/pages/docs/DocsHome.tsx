import { Link } from 'react-router'
import { DocHeader } from '../../components/DocParts'
import { PLAYGROUND_URL } from '../../lib/constants'

const CARDS = [
  {
    to: '/docs/use-the-ui',
    tag: 'No code',
    title: 'Use the editor',
    body: 'A step-by-step tour of the visual builder — backgrounds, fields, dynamic data, hyperlinks, preview, and export.',
  },
  {
    to: '/docs/sdk',
    tag: 'For developers',
    title: 'SDK & API',
    body: 'Install the library, generate your first PDF, shape the input JSON, and handle every error code.',
  },
  {
    to: '/docs/schema',
    tag: 'Reference',
    title: 'Template & input schema',
    body: 'How fields, styles, bands, and page settings are modelled — and exactly what JSON they expect.',
  },
  {
    to: '/docs/file-format',
    tag: 'Reference',
    title: '.tgbl file format',
    body: 'The anatomy of the ZIP archive: manifest, fonts, images, and why binary beats base64.',
  },
  {
    to: '/docs/batch',
    tag: 'At scale',
    title: 'Batch & storage',
    body: 'Generate thousands of PDFs with the worker pool, prepare static layers once, and upload straight to S3.',
  },
]

/** Documentation landing — orients both personas and links onward. */
export function DocsHome() {
  return (
    <>
      <DocHeader
        kicker="Documentation"
        title="Everything you need, for both sides of the handoff"
        intro="Whether you design templates by hand or generate PDFs from code, start here. Pick the track that matches you."
        meta="TemplateGoblin documentation — visual editor guide, SDK & API reference, template schema, .tgbl file format, and batch generation."
      />

      <h2>New here?</h2>
      <p>
        If you’ve never seen TemplateGoblin, the fastest way to understand it is to{' '}
        <a className="link" href={PLAYGROUND_URL}>
          open the editor
        </a>{' '}
        and drag a few fields onto a page. Then come back and read the track for your role:
      </p>

      <div className="docs-cards">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="docs-card">
            <span className="tag">{c.tag}</span>
            <h3>{c.title}</h3>
            <p>{c.body}</p>
          </Link>
        ))}
      </div>

      <h2>The mental model</h2>
      <p>
        A <strong>template</strong> is a page layout plus its assets (fonts, images), saved as a
        single <code>.tgbl</code> file. Each <strong>field</strong> on the page is either{' '}
        <strong>static</strong> (the same on every PDF) or <strong>dynamic</strong> (filled from the
        input JSON at generate time). You design the template once, then call{' '}
        <code>generatePDF(template, data)</code> for every PDF you need.
      </p>
    </>
  )
}
