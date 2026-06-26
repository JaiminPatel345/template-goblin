import { Callout, DocHeader, DocNext } from '../../components/DocParts'
import { PLAYGROUND_URL } from '../../lib/constants'

/** Walkthrough for the designer persona — no code required. */
export function UseTheUi() {
  return (
    <>
      <DocHeader
        kicker="For designers · no code"
        title="Use the visual editor"
        intro="Design a PDF template by dragging fields onto a page. No coordinates, no code — just a canvas and a properties panel."
      />

      <h2>1. Open the editor</h2>
      <p>
        Launch the{' '}
        <a className="link" href={PLAYGROUND_URL}>
          playground
        </a>{' '}
        in your browser — nothing to install. Developers on your team can also run it locally with{' '}
        <code>npx template-goblin-ui</code>, which opens it at <code>localhost:4242</code>.
      </p>

      <h2>2. Set up the page</h2>
      <p>
        Choose a page size (A4, Letter, or custom) and, if you’re working from a design, upload a{' '}
        <strong>background image</strong> — your certificate art, invoice frame, or report shell.
        Everything you add sits on top of it.
      </p>
      <Callout>
        Backgrounds can be compressed on upload — drag the quality slider and watch the file-size
        savings before you commit. Smaller backgrounds mean smaller <code>.tgbl</code> files.
      </Callout>

      <h2>3. Add fields</h2>
      <p>Pick a tool from the left rail and draw a box on the page. There are three field types:</p>
      <ul>
        <li>
          <strong>Text</strong> — a heading, a name, a date. Set the font, size, colour, alignment,
          and what happens if the text is too long (shrink, clip, or wrap).
        </li>
        <li>
          <strong>Image</strong> — a logo, a photo, a signature. Choose how it fills its box:{' '}
          <em>contain</em>, <em>cover</em>, or <em>fill</em>.
        </li>
        <li>
          <strong>Table</strong> — a repeating list of rows (line items, subjects, transactions).
          Define the columns once; rows come from data.
        </li>
      </ul>

      <h2>4. Static vs. dynamic — the one idea to grasp</h2>
      <p>
        On a certificate, the logo and the title look the same every time, but the recipient’s name
        changes for each person. TemplateGoblin lets you mark each field as one of those two kinds —
        no code involved, you just label them:
      </p>
      <ul>
        <li>
          <strong>Static</strong> — the same on every PDF (your logo, a heading, fixed wording). You
          type it once, right in the editor, and you’re done.
        </li>
        <li>
          <strong>Dynamic</strong> — changes for each PDF (a person’s name, an invoice’s rows). You
          give it a short name like <code>name</code> or <code>invoice_total</code>; when the PDFs
          are produced, each one gets its own value for that name.
        </li>
      </ul>
      <Callout>
        You never write code for this — you only label which fields change. If a developer on your
        team automates the bulk run, those labels are exactly the values they fill in, and the
        editor lists every one of them automatically.
      </Callout>

      <h2>5. Style and align</h2>
      <p>
        Use the properties panel to set fonts (upload your own <code>.ttf</code> in the Fonts
        dialog), colours, padding, borders, and table styling like header colours and zebra
        striping. Snap-and-align guides help you keep things tidy.
      </p>

      <h2>6. Add a hyperlink (optional)</h2>
      <p>
        Any text field can become a clickable link — a static URL (your website) or a dynamic one (a
        per-recipient verification link). The link is baked into the PDF as a real annotation, so
        it’s clickable in any reader.
      </p>

      <h2>7. Preview with sample data</h2>
      <p>
        Switch to preview to see a real rendered PDF, filled with sample values. Toggle between{' '}
        <strong>Default</strong>, <strong>Max</strong> (longest plausible content), and{' '}
        <strong>Min</strong> (shortest) to make sure nothing overflows its box in any case.
      </p>

      <h2>8. Export your template</h2>
      <p>
        Click <strong>Export → .tgbl</strong> to save your design as a single file holding the
        layout, fonts, and images. You can preview a finished PDF with sample data right here in the
        editor whenever you like — so you can check your work without waiting on anyone.
      </p>
      <p>
        When it’s time to produce real PDFs in bulk — one per customer, student, or order — that{' '}
        <code>.tgbl</code> goes to a developer (or your own backend), where a few lines of code turn
        it into thousands of finished PDFs. Need a design change later? Edit the template,
        re-export, and you’re done — no engineering ticket to redo the layout.
      </p>

      <DocNext
        prev={{ to: '/docs', label: 'Overview' }}
        next={{ to: '/docs/sdk', label: 'Generate PDFs with the SDK' }}
      />
    </>
  )
}
