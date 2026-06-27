import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'

import { ArrowRight, ChevronDown, GitHub, Menu, Npm } from './Icons'
import { GITHUB_URL, NPM_URL, PLAYGROUND_URL, STARS_BADGE } from '../lib/constants'

const DOC_LINKS = [
  { to: '/docs/use-the-ui', label: 'Use the editor', hint: 'For designers — no code' },
  { to: '/docs/sdk', label: 'SDK & API', hint: 'For developers' },
  { to: '/docs/schema', label: 'Template & input schema', hint: 'Fields, styles, JSON' },
  { to: '/docs/file-format', label: '.tgbl file format', hint: 'What is inside the ZIP' },
  { to: '/docs/batch', label: 'Batch & storage', hint: 'Generate at scale' },
]

/** Sticky top navigation, shared across every page. */
export function Navbar() {
  const [open, setOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const location = useLocation()
  const docsActive = location.pathname.startsWith('/docs')

  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="TemplateGoblin home">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="TemplateGoblin logo"
            height={32}
            style={{ borderRadius: '6px' }}
          />
          Template<span className="grad-text">Goblin</span>
        </Link>

        <nav className="nav-links" aria-label="Primary">
          <div
            className={`dropdown${docsOpen ? ' open' : ''}`}
            onMouseLeave={() => setDocsOpen(false)}
          >
            <button
              className={`nav-link${docsActive ? ' active' : ''}`}
              type="button"
              aria-haspopup="true"
              aria-expanded={docsOpen}
              onClick={() => setDocsOpen((v) => !v)}
              onMouseEnter={() => setDocsOpen(true)}
            >
              Docs <ChevronDown size={14} />
            </button>
            <div className="dropdown-menu" role="menu">
              {DOC_LINKS.map((d) => (
                <Link
                  key={d.to}
                  to={d.to}
                  className="dropdown-item"
                  role="menuitem"
                  onClick={() => setDocsOpen(false)}
                >
                  {d.label}
                  <span>{d.hint}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <span className="nav-spacer" />

        <div className="nav-actions">
          <a
            className="nav-stars"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub stars"
          >
            <img className="nav-stars" src={STARS_BADGE} alt="" height={20} />
          </a>
          <a
            className="nav-icon"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <GitHub size={19} />
          </a>
          <a className="nav-icon" href={NPM_URL} target="_blank" rel="noreferrer" aria-label="npm">
            <Npm size={20} />
          </a>
          <a className="btn btn-primary" href={PLAYGROUND_URL} title="Open Editor">
            Playground <ArrowRight size={16} />
          </a>
          <button
            className="nav-burger"
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <Menu />
          </button>
        </div>
      </div>

      {open && (
        <div className="mobile-panel">
          <div className="container">
            <NavLink to="/" className="nav-link" onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <div className="mobile-sub">Docs</div>
            {DOC_LINKS.map((d) => (
              <NavLink key={d.to} to={d.to} className="nav-link" onClick={() => setOpen(false)}>
                {d.label}
              </NavLink>
            ))}
            <div className="mobile-sub">More</div>
            <a className="nav-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="nav-link" href={NPM_URL} target="_blank" rel="noreferrer">
              npm
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
