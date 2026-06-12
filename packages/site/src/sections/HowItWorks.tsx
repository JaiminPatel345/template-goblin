import { Link } from 'react-router'

const STEPS = [
  {
    title: 'Design in the browser',
    body: 'Open the playground, add a background, and place text, image, and table fields. Mark which ones are static and which come from data.',
  },
  {
    title: 'Export a .tgbl',
    body: 'Click export. You get one portable file containing the layout, fonts, and images — ready to commit to your repo or upload anywhere.',
  },
  {
    title: 'Generate from JSON',
    body: 'npm install template-goblin, loadTemplate() once, then generatePDF(template, data) as many times as you need. Ship it to production.',
  },
]

/** Three-step "design → export → generate" flow. */
export function HowItWorks() {
  return (
    <section className="section" id="how">
      <div className="container">
        <div className="section-head center">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-title">From blank page to PDF API in three steps.</h2>
        </div>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.title}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-dim)' }}>
          New here? Start with the{' '}
          <Link to="/docs/use-the-ui" className="grad-text" style={{ fontWeight: 600 }}>
            editor walkthrough
          </Link>{' '}
          or jump to the{' '}
          <Link to="/docs/sdk" className="grad-text" style={{ fontWeight: 600 }}>
            SDK guide
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
