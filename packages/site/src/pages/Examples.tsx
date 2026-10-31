import { useDocumentMeta } from '../lib/useDocumentMeta'
import { ArrowRight, Download, FileText, Sparkles } from '../components/Icons'
import { PLAYGROUND_URL } from '../lib/constants'
import { CodeBlock } from '../components/CodeBlock'

const CODE_EXAMPLE = `import { loadTemplate, generatePDF } from 'template-goblin'
import { writeFileSync } from 'node:fs'

// 1. Load the pre-designed Zomato invoice template
const template = await loadTemplate('./zomato-invoice.tgbl')

// 2. Generate PDF with dynamic order details and item rows
const pdfBuffer = await generatePDF(template, {
  texts: {
    orderId: '39536',
    orderTime: '14 June 2024, 09:52 AM',
    restaurantName: 'Sree Anandha Bhavans Restaurant',
    restaurantAddress: 'VHQW+8XF,Chinnakada,Kollam',
    customerName: 'Jithin Baby',
    customerAddress: 'Waterfront by Palmyra,Kadavil Jothi,Uliyakovil,Kollam',
    deliveryCharge: '₹30',
    taxes: '₹30',
    total: '₹660',
  },
  tables: {
    items: [
      { item: 'Poori Set', quantity: '2', unitPrice: '₹125', totalPrice: '₹250' },
      { item: 'Ghee Roast', quantity: '1', unitPrice: '₹100', totalPrice: '₹100' },
      { item: 'Idiappam Set', quantity: '1', unitPrice: '₹125', totalPrice: '₹125' },
      { item: 'Appam Set', quantity: '1', unitPrice: '₹125', totalPrice: '₹125' },
    ],
  },
})

writeFileSync('output.pdf', pdfBuffer)`

/** Page showing pre-built, production-ready template examples with live previews and playground links. */
export function Examples() {
  useDocumentMeta(
    'Template Examples — TemplateGoblin',
    'Explore production-ready PDF template examples. Download .tgbl archives, preview generated PDFs, or open them directly in the visual playground.',
  )

  const tgblDownloadUrl = `${import.meta.env.BASE_URL}examples/zomato-invoice.tgbl`
  const pdfDownloadUrl = `${import.meta.env.BASE_URL}examples/zomato-invoice.pdf`
  const playgroundUrl = `${PLAYGROUND_URL}?example=zomato-invoice.tgbl`

  return (
    <div className="container" style={{ paddingBlock: '40px 80px' }}>
      <header className="examples-hero">
        <span className="pill">
          <Sparkles size={14} /> Production Templates
        </span>
        <h1 className="section-title" style={{ marginTop: '16px' }}>
          Template <span className="grad-text">Examples</span>
        </h1>
        <p className="examples-lead">
          Explore real-world templates built with TemplateGoblin. Download the portable{' '}
          <code>.tgbl</code> file, view the rendered PDF, or load it instantly into the playground
          editor.
        </p>
      </header>

      <section className="example-card">
        <div className="example-header">
          <div className="example-title-row">
            <div>
              <h2 className="example-title">Zomato Food Delivery Invoice</h2>
              <p className="example-desc">
                A clean, modern food delivery receipt featuring order metadata, restaurant &amp;
                customer details, dynamic table line-items, delivery fees, taxes, and Indian Rupee
                (₹) Unicode currency support.
              </p>
            </div>
          </div>

          <div className="example-tags">
            <span className="tag">Invoice &amp; Receipt</span>
            <span className="tag">Dynamic Table</span>
            <span className="tag">Unicode ₹</span>
            <span className="tag">Custom Logo</span>
          </div>

          <div className="example-actions">
            <a
              className="btn btn-primary"
              href={playgroundUrl}
              title="Open and edit in visual playground"
            >
              Open in Playground <ArrowRight size={16} />
            </a>
            <a
              className="btn btn-ghost"
              href={tgblDownloadUrl}
              download="zomato-invoice.tgbl"
              title="Download raw .tgbl archive"
            >
              <Download size={16} /> Download .tgbl
            </a>
            <a
              className="btn btn-ghost"
              href={pdfDownloadUrl}
              download="zomato-invoice.pdf"
              title="Download sample generated PDF"
            >
              <FileText size={16} /> Download PDF
            </a>
          </div>
        </div>

        <div className="example-content-grid">
          <div className="example-pdf-wrapper">
            <iframe
              className="example-pdf-frame"
              src={pdfDownloadUrl}
              title="Zomato Invoice PDF Preview"
            />
          </div>

          <div className="example-code-column">
            <div className="example-info-box">
              <div>
                <strong>How to use this template:</strong>
              </div>
              <div>
                1. Click <strong>Open in Playground</strong> to inspect or customize layout, fonts,
                and bindings in the visual editor.
              </div>
              <div>
                2. Download <code>zomato-invoice.tgbl</code> into your backend project.
              </div>
              <div>
                3. Call <code>generatePDF()</code> with your order data — renders in under 5ms with
                zero headless browser dependencies.
              </div>
            </div>

            <CodeBlock code={CODE_EXAMPLE} file="generate-invoice.ts" />
          </div>
        </div>
      </section>
    </div>
  )
}
