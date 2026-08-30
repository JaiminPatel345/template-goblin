import { NavLink, Outlet, useLocation } from 'react-router'
import { useTocSpy } from '../lib/useTocSpy'

/** Documentation pages, grouped for the sidebar + mobile strip. */
export const DOC_SECTIONS = [
  {
    title: 'Get started',
    links: [
      { to: '/docs', label: 'Overview', end: true },
      { to: '/docs/use-the-ui', label: 'Use the editor' },
      { to: '/docs/sdk', label: 'SDK & API' },
    ],
  },
  {
    title: 'Reference',
    links: [
      { to: '/docs/schema', label: 'Template & input schema' },
      { to: '/docs/file-format', label: '.tgbl file format' },
      { to: '/docs/batch', label: 'Batch & storage' },
    ],
  },
]

const ALL_LINKS = DOC_SECTIONS.flatMap((s) => s.links)

/** Two-column docs shell: sticky sidebar (desktop) / scroll strip (mobile). */
export function DocsLayout() {
  const { pathname } = useLocation()
  const { items: toc, activeId } = useTocSpy(pathname)

  return (
    <div className="container docs">
      <aside className="docs-side" aria-label="Documentation">
        {DOC_SECTIONS.map((section) => (
          <div key={section.title}>
            <h4>{section.title}</h4>
            {section.links.map((l) => {
              // Ensure we accurately match the active route for nesting the TOC
              const isActiveRoute = l.end ? pathname === l.to : pathname.startsWith(l.to)

              return (
                <div key={l.to} className="docs-nav-item">
                  <NavLink
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) => `docs-nav-link${isActive ? ' active' : ''}`}
                  >
                    {l.label}
                  </NavLink>

                  {/* Render TOC as nested sub-options under the active link */}
                  {isActiveRoute && toc.length > 1 && (
                    <div className="docs-toc-nested">
                      {toc.map((h) => (
                        <a
                          key={h.id}
                          href={`#${h.id}`}
                          className={`docs-toc-link${activeId === h.id ? ' active' : ''}`}
                        >
                          {h.text}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </aside>

      <nav className="docs-mobile-nav" aria-label="Documentation">
        {ALL_LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => (isActive ? 'active' : undefined)}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>

      <article className="prose">
        <Outlet />
      </article>
    </div>
  )
}
