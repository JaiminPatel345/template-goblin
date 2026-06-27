import { Link } from 'react-router'

import { Heart, GitHub } from './Icons'
import {
  AUTHOR_URL,
  GITHUB_URL,
  ISSUES_URL,
  NPM_UI_URL,
  NPM_URL,
  PLAYGROUND_URL,
} from '../lib/constants'

/** Site-wide footer with navigation columns + author credit. */
export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <img
                src="/logo-full.png"
                alt="TemplateGoblin"
                height={34}
                style={{ objectFit: 'contain' }}
              />
            </Link>
            <p>
              Design PDF templates visually, generate them at scale from JSON — open source, pure
              TypeScript, no headless browser.
            </p>
          </div>

          <div className="footer-col">
            <h4>Product</h4>
            <a href={PLAYGROUND_URL}>Playground</a>
            <Link to="/docs/use-the-ui">Visual editor</Link>
            <a href={NPM_URL} target="_blank" rel="noreferrer">
              npm: template-goblin
            </a>
            <a href={NPM_UI_URL} target="_blank" rel="noreferrer">
              npm: the UI builder
            </a>
          </div>

          <div className="footer-col">
            <h4>Docs</h4>
            <Link to="/docs/sdk">SDK & API</Link>
            <Link to="/docs/schema">Template schema</Link>
            <Link to="/docs/file-format">.tgbl format</Link>
            <Link to="/docs/batch">Batch & storage</Link>
          </div>

          <div className="footer-col">
            <h4>Project</h4>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={ISSUES_URL} target="_blank" rel="noreferrer">
              Issues & requests
            </a>
            <a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              License
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              style={{ color: 'inherit', display: 'flex' }}
              title="GitHub Repository"
            >
              <GitHub size={17} />
            </a>
            © {new Date().getFullYear()} TemplateGoblin · GPLv3 Licensed
          </span>
          <span>
            Built by{' '}
            <a href={AUTHOR_URL} target="_blank" rel="noreferrer">
              Jaimin Detroja
            </a>{' '}
            <Heart
              size={13}
              style={{ display: 'inline', verticalAlign: '-2px', color: '#7b6cff' }}
            />{' '}
            from 🇮🇳
          </span>
        </div>
      </div>
    </footer>
  )
}
