import { Check } from '../components/Icons'
import { GoblinMark } from '../components/GoblinMark'

type Cell = { kind: 'yes' | 'no' | 'meh'; label: string }
const yes = (label = 'Yes'): Cell => ({ kind: 'yes', label })
const no = (label = 'No'): Cell => ({ kind: 'no', label })
const meh = (label: string): Cell => ({ kind: 'meh', label })

const ROWS: { feature: string; canva: Cell; pdflib: Cell; us: Cell }[] = [
  { feature: 'Visual drag-and-drop designer', canva: yes(), pdflib: no(), us: yes() },
  { feature: 'Run server-side, at scale', canva: no(), pdflib: yes(), us: yes() },
  {
    feature: 'Dynamic data: text · tables · images · links',
    canva: meh('Limited'),
    pdflib: meh('Manual'),
    us: yes('First-class'),
  },
  {
    feature: 'Multi-page tables, custom fonts',
    canva: meh('Limited'),
    pdflib: meh('Manual'),
    us: yes(),
  },
  { feature: 'Open source', canva: no(), pdflib: yes(), us: yes() },
  {
    feature: 'Cost at 10k PDFs / month',
    canva: meh('$$$'),
    pdflib: meh('Dev time'),
    us: yes('Free'),
  },
]

function CellView({ cell }: { cell: Cell }) {
  if (cell.kind === 'yes') {
    return (
      <span className="yes">
        <Check size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 5 }} />
        {cell.label}
      </span>
    )
  }
  return <span className={cell.kind === 'meh' ? 'meh' : 'no'}>{cell.label}</span>
}

/** Where TemplateGoblin sits between a design tool and a low-level PDF lib. */
export function Compare() {
  return (
    <section className="section" id="compare">
      <div className="container">
        <div className="section-head center">
          <div className="section-eyebrow">How it compares</div>
          <h2 className="section-title">
            The visual ease of a design tool. The scale of a code library.
          </h2>
        </div>
        <div className="compare-wrap">
          <table className="compare">
            <thead>
              <tr>
                <th />
                <th>Canva</th>
                <th>pdf-lib</th>
                <th className="us">
                  <span className="compare-head-us">
                    <GoblinMark size={20} /> TemplateGoblin
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.feature}>
                  <td className="feat">{r.feature}</td>
                  <td>
                    <CellView cell={r.canva} />
                  </td>
                  <td>
                    <CellView cell={r.pdflib} />
                  </td>
                  <td className="us">
                    <CellView cell={r.us} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
