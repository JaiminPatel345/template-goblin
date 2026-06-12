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

      <h2>4. Static vs. dynamic</h2>
      <p>
        This is the one concept that makes TemplateGoblin click. Every field is one of two kinds:
      </p>
      <ul>
        <li>
          <strong>Static</strong> — identical on every PDF (a title, a logo, fixed legal text). Type
          the value right in the editor.
        </li>
        <li>
          <strong>Dynamic</strong> — different on every PDF (a customer’s name, their invoice rows).
          Give it a <strong>data key</strong> like <code>name</code> or <code>marks</code>; a
          developer supplies that value as JSON at generate time.
        </li>
      </ul>
      <Callout>
        Tip: name your data keys clearly — <code>student_name</code>, <code>invoice_total</code> —
        because those exact names are what the developer fills in. The editor lists every key for
        them automatically.
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

      <h2>8. Export and share</h2>
      <p>
        Click <strong>Export → .tgbl</strong>. That single file contains your layout, fonts, and
        images. Commit it to a repo or send it to a developer — they load it once and generate PDFs
        from it forever. When the design needs to change, you edit the template and re-export; no
        engineering ticket required.
      </p>

      <DocNext
        prev={{ to: '/docs', label: 'Overview' }}
        next={{ to: '/docs/sdk', label: 'Generate PDFs with the SDK' }}
      />
    </>
  )
}
