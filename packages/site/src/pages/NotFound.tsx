import { Link } from 'react-router'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { ArrowRight } from '../components/Icons'
import { PLAYGROUND_URL } from '../lib/constants'

/** 404 — also the GitHub Pages SPA fallback target. */
export function NotFound() {
  useDocumentMeta('Page not found — TemplateGoblin', 'The page you are looking for does not exist.')
  return (
    <section className="section" style={{ textAlign: 'center', paddingBlock: 120 }}>
      <div className="container">
        <div className="section-eyebrow" style={{ textAlign: 'center' }}>
          Error 404
        </div>
        <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4rem)' }}>
          This goblin <span className="grad-text">wandered off.</span>
        </h1>
        <p style={{ color: 'var(--text-dim)', margin: '16px auto 30px', maxWidth: 440 }}>
          The page you’re after doesn’t exist. Looking for the editor? It lives at{' '}
          <code>/playground</code>.
        </p>
        <div className="hero-cta" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary btn-lg" to="/">
            Back home
          </Link>
          <a className="btn btn-ghost btn-lg" href={PLAYGROUND_URL}>
            Open the editor <ArrowRight />
          </a>
        </div>
      </div>
    </section>
  )
}
