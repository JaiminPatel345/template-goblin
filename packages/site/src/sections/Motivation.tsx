import { Check } from '../components/Icons'

const POINTS = [
  {
    title: 'Designers can’t code',
    body: 'and shouldn’t have to. They know exactly how the certificate should look — they just need a canvas, not a coordinate system.',
  },
  {
    title: 'Developers don’t want to hand-build PDFs',
    body: 'Positioning every label in raw pdf-lib calls, by pixel, for every template change, is nobody’s idea of a good time.',
  },
  {
    title: 'The business needs to change templates',
    body: 'without filing an engineering ticket. New layout, new logo, new wording — edit the template, re-export, done.',
  },
]

/** The problem statement — why a visual-to-code PDF engine needs to exist. */
export function Motivation() {
  return (
    <section className="section" id="why-exists">
      <div className="container split reverse">
        <div className="split-media">
          <ul className="check-list" style={{ marginTop: 0 }}>
            {POINTS.map((p) => (
              <li key={p.title}>
                <Check size={20} />
                <span>
                  <b>{p.title}</b> — {p.body}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="section-eyebrow">The need</div>
          <h2 className="section-title">
            Generating PDFs at scale is split between two teams that don’t share a tool.
          </h2>
          <div className="prose-lead">
            <p>
              Certificates, invoices, reports, tickets, payslips — every business runs on templated
              PDFs. The design lives in one head and the rendering lives in another, and they meet
              in a pile of brittle layout code.
            </p>
            <p>
              TemplateGoblin gives both sides one artifact — the <code>.tgbl</code> — so the handoff
              is a file, not a meeting.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
