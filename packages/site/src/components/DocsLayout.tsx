import { NavLink, Outlet } from 'react-router'

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
  return (
    <div className="container docs">
      <aside className="docs-side" aria-label="Documentation">
        {DOC_SECTIONS.map((section) => (
          <div key={section.title}>
            <h4>{section.title}</h4>
            {section.links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) => `docs-nav-link${isActive ? ' active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
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
