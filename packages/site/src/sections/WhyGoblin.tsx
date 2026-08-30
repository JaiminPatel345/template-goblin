import type { JSX } from 'react'
import { Bolt, Code, Database, FileText, Layers, Palette } from '../components/Icons'

const FEATURES: { icon: JSX.Element; title: string; body: string }[] = [
  {
    icon: <Palette />,
    title: 'Designer-first canvas',
    body: 'Drag, drop, align, and style fields on a real page. Live preview with sample data — what you see is what renders.',
  },
  {
    icon: <Code />,
    title: 'Pure-TypeScript runtime',
    body: 'Rendering is PDFKit under the hood — no headless Chrome, no native binaries. Runs in Node, Bun, Lambda, or the browser.',
  },
  {
    icon: <Database />,
    title: 'Dynamic everything',
    body: 'Text, images, multi-row tables, and hyperlinks all bind to your JSON. Mark a field “dynamic” and it fills at generate time.',
  },
  {
    icon: <Layers />,
    title: 'Multi-page & custom fonts',
    body: 'Tables that overflow paginate automatically with repeating headers. Upload TTFs; they’re embedded and subset into the file.',
  },
  {
    icon: <Bolt />,
    title: 'Built for scale',
    body: 'Load a template once and reuse it for millions of renders with zero disk I/O per call, or fan a batch out across worker processes.',
  },
  {
    icon: <FileText />,
    title: 'One portable file',
    body: 'A .tgbl is a ZIP with the layout, fonts, and images inside. Version it, share it, hand it to a developer — no external assets.',
  },
]

/** The headline capabilities, as a card grid. */
export function WhyGoblin() {
  return (
    <section className="section" id="features">
      <div className="container">
        <div className="section-head center">
          <div className="section-eyebrow">Why TemplateGoblin</div>
          <h2 className="section-title">Everything you need to turn a design into a PDF API.</h2>
        </div>
        <div className="grid-3">
          {FEATURES.map((f) => (
            <div className="card" key={f.title}>
              <div className="card-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
