import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Bolt, Check, Sparkles, Copy } from '../components/Icons'
import { PLAYGROUND_URL } from '../lib/constants'

function InstallCommand() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText('npm i template-goblin')
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (insecure context / permissions) — no-op.
    }
  }

  return (
    <code>
      npm i template-goblin
      <button onClick={copy} aria-label="Copy command" className="inline-copy" type="button">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </code>
  )
}

/** Above-the-fold pitch — must make the project clear in one glance. */
export function Hero() {
  return (
    <section className="hero">
      <div className="container hero-centered">
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
          template by drag-and-drop in the browser; developers feed it JSON and generate millions of
          pixel-identical PDFs — no Photoshop, no headless Chrome.
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
            <Check size={16} /> Free for non-commercial
          </span>
          <span>
            <Bolt size={16} /> No headless browser
          </span>
          <span>
            <Check size={16} /> <InstallCommand />
          </span>
        </div>
      </div>
    </section>
  )
}
