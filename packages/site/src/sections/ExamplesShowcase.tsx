import { Link } from 'react-router'
import { ArrowRight, Download, Sparkles } from '../components/Icons'
import { PLAYGROUND_URL } from '../lib/constants'

/** Section on the landing page highlighting real-world templates like the Zomato Invoice. */
export function ExamplesShowcase() {
  const playgroundUrl = `${PLAYGROUND_URL}?example=zomato-invoice.tgbl`
  const tgblDownloadUrl = `${import.meta.env.BASE_URL}examples/zomato-invoice.tgbl`

  return (
    <section className="section" id="examples">
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div className="section-eyebrow">
            <Sparkles size={14} /> Production Templates
          </div>
          <h2 className="section-title">
            Built for <span className="grad-text">real business</span> documents.
          </h2>
          <p className="prose-lead" style={{ marginInline: 'auto' }}>
            From food delivery invoices to certificate generation, TemplateGoblin handles complex
            tables, currency symbols, and multi-page layouts with sub-millisecond rendering.
          </p>
        </div>

        <div className="card" style={{ maxWidth: '820px', marginInline: 'auto', padding: '28px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <span className="tag">Featured Example</span>
                <span className="tag">Invoice</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Zomato Food Delivery Invoice</h3>
              <p style={{ margin: '6px 0 0', color: 'var(--text-dim)', fontSize: '0.95rem' }}>
                Order receipt featuring order metadata, itemized dynamic pricing table, delivery
                charges, and ₹ currency support.
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <a className="btn btn-primary" href={playgroundUrl}>
                Open in Playground <ArrowRight size={15} />
              </a>
              <Link className="btn btn-ghost" to="/examples">
                Preview &amp; Details
              </Link>
              <a className="btn btn-ghost" href={tgblDownloadUrl} download="zomato-invoice.tgbl">
                <Download size={15} /> .tgbl
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
