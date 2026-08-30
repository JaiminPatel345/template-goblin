import { useDocumentMeta } from '../lib/useDocumentMeta'
import { Hero } from '../sections/Hero'
import { WhatIs } from '../sections/WhatIs'
import { Motivation } from '../sections/Motivation'
import { Compare } from '../sections/Compare'
import { WhyGoblin } from '../sections/WhyGoblin'
import { HowItWorks } from '../sections/HowItWorks'
import { CtaBand } from '../sections/CtaBand'

const RUNTIMES = ['Node.js', 'Bun', 'Deno', 'Express', 'Hono', 'Next.js']
const UPCOMING = ['Java', 'Go']

/** Marketing landing page. */
export function Home() {
  useDocumentMeta(
    'TemplateGoblin — Design PDF templates visually. Generate at scale.',
    'Open-source PDF template engine. Design templates in a visual editor; generate millions of PDFs from JSON with a pure-TypeScript library — no headless browser.',
  )

  return (
    <>
      <Hero />
      <div className="container">
        <div className="runs-on">
          {RUNTIMES.map((r) => (
            <span className="tag" key={r}>
              {r}
            </span>
          ))}
          {UPCOMING.map((r) => (
            <span className="tag tag-soon" key={r}>
              {r} <em>Soon</em>
            </span>
          ))}
        </div>
      </div>
      <WhatIs />
      <Motivation />
      <Compare />
      <WhyGoblin />
      <HowItWorks />
      <CtaBand />
    </>
  )
}
