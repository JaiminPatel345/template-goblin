import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { useDocumentMeta } from '../lib/useDocumentMeta'
import { ArrowLeft, ArrowRight, Info } from './Icons'

/** Page header for a doc page; also sets the document title + meta. */
export function DocHeader({
  kicker,
  title,
  intro,
  meta,
}: {
  kicker: string
  title: string
  intro: string
  meta?: string
}) {
  useDocumentMeta(`${title} — TemplateGoblin docs`, meta ?? intro)
  return (
    <header>
      <div className="doc-kicker">{kicker}</div>
      <h1>{title}</h1>
      <p className="doc-intro">{intro}</p>
    </header>
  )
}

/** Highlighted aside — `variant="warn"` for cautions. */
export function Callout({
  children,
  variant = 'info',
}: {
  children: ReactNode
  variant?: 'info' | 'warn'
}) {
  return (
    <div className={`callout${variant === 'warn' ? ' warn' : ''}`}>
      <Info size={18} />
      <p>{children}</p>
    </div>
  )
}

/** Previous / next page links at the bottom of a doc page. */
export function DocNext({
  prev,
  next,
}: {
  prev?: { to: string; label: string }
  next?: { to: string; label: string }
}) {
  return (
    <nav className="doc-next">
      <span>
        {prev && (
          <Link to={prev.to}>
            <ArrowLeft size={15} />
            <span>{prev.label}</span>
          </Link>
        )}
      </span>
      <span>
        {next && (
          <Link to={next.to}>
            <span>{next.label}</span>
            <ArrowRight size={15} />
          </Link>
        )}
      </span>
    </nav>
  )
}

/** A bordered, horizontally-scrollable data table built from rows of cells. */
export function DocTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
