import { CodeBlock } from '../components/CodeBlock'

const SNIPPET = `import { loadTemplate, generatePDF } from 'template-goblin'

// Load the .tgbl your designer exported — once, at startup
const template = await loadTemplate('./certificate.tgbl')

// Fill it with data and render — millions of times, zero disk I/O
const pdf = await generatePDF(template, {
  texts: { name: 'Aisha Khan', course: 'Advanced TypeScript' },
  tables: { modules: [{ title: 'Generics', score: '98' }] },
})`

/** Explains the two-surface model: design visually, generate from code. */
export function WhatIs() {
  return (
    <section className="section" id="what">
      <div className="container split">
        <div>
          <div className="section-eyebrow">What is this</div>
          <h2 className="section-title">One template file. Two kinds of people.</h2>
          <div className="prose-lead">
            <p>
              A <strong>designer</strong> opens the visual builder, drops in a background, places
              text / image / table fields, marks which ones are filled from data, and exports a
              single <code>.tgbl</code> file.
            </p>
            <p>
              A <strong>developer</strong> loads that file once and calls <code>generatePDF()</code>{' '}
              with JSON — on a server, in a queue, in a Lambda. What the designer saw on the canvas
              is exactly what renders.
            </p>
          </div>
        </div>
        <div className="split-media">
          <CodeBlock code={SNIPPET} file="generate.ts" />
        </div>
      </div>
    </section>
  )
}
