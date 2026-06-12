import { Link } from 'react-router'
import { EditorMock } from '../components/EditorMock'
import { ArrowRight, Bolt, Check, Sparkles } from '../components/Icons'
import { PLAYGROUND_URL } from '../lib/constants'

/** Above-the-fold pitch — must make the project clear in one glance. */
export function Hero() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="pill">
            <Sparkles size={14} /> Open source · Pure TypeScript
          </span>
          <h1>
            Design PDF templates <span className="grad-text">visually.</span>
            <br />
            Generate them at <span className="grad-text">scale.</span>
          </h1>
          <p className="hero-lead">
            TemplateGoblin is an open-source PDF template engine. Non-technical users design a
            template by drag-and-drop in the browser; developers feed it JSON and generate millions
            of pixel-identical PDFs — no Photoshop, no headless Chrome.
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary btn-lg" href={PLAYGROUND_URL}>
              Open the editor <ArrowRight />
            </a>
            <Link className="btn btn-ghost btn-lg" to="/docs/sdk">
              Read the docs
            </Link>
          </div>
          <div className="hero-meta">
            <span>
              <Check size={16} /> MIT licensed
            </span>
            <span>
              <Bolt size={16} /> No headless browser
            </span>
            <span>
              <Check size={16} /> <code>npm i template-goblin</code>
            </span>
          </div>
        </div>
        <div className="hero-media">
          <EditorMock />
        </div>
      </div>
    </section>
  )
}
