import { CodeBlock } from '../../components/CodeBlock'
import { Callout, DocHeader, DocNext } from '../../components/DocParts'

const TREE = `certificate.tgbl   (a ZIP archive with a custom extension)
├── manifest.json          layout, fields, styles, page settings
├── background.png         the page background (real binary, not base64)
├── fonts/
│   └── brand-bold.ttf      embedded custom fonts
└── placeholders/
    └── seal.png            images referenced by static fields`

/** Explains the .tgbl container format. */
export function FileFormat() {
  return (
    <>
      <DocHeader
        kicker="Reference"
        title="The .tgbl file format"
        intro="A .tgbl is just a ZIP with a custom extension — the layout plus every asset it needs, in one portable file."
      />

      <h2>What’s inside</h2>
      <p>
        Everything required to render the template travels together, so a <code>.tgbl</code> is
        fully self-contained — no external image URLs, no missing-font surprises on another machine.
      </p>
      <CodeBlock code={TREE} file="certificate.tgbl" lang="text" />

      <h2>Why a ZIP of real binaries?</h2>
      <ul>
        <li>
          <strong>~33% smaller</strong> than embedding images and fonts as base64 inside JSON —
          binary stays binary.
        </li>
        <li>
          <strong>Portable</strong> — commit it to a repo, attach it to an issue, upload it to
          storage. It opens the same everywhere.
        </li>
        <li>
          <strong>Inspectable</strong> — rename it to <code>.zip</code> and any archive tool can
          peek inside. The library verifies the ZIP <code>PK</code> header on read.
        </li>
      </ul>

      <Callout>
        You rarely touch this format directly. The visual editor writes <code>.tgbl</code> files on
        export, and <code>loadTemplate()</code> reads them back. It’s documented here so you know
        exactly what you’re version-controlling.
      </Callout>

      <h2>Reading just the manifest</h2>
      <p>
        Need a template’s metadata or field list without paying to load fonts and images? Use{' '}
        <code>readManifest(path)</code> — it unzips only <code>manifest.json</code>. Handy for
        listing available templates or validating one in CI.
      </p>

      <h2>Custom fonts</h2>
      <p>
        Fonts you upload in the editor are stored under <code>fonts/</code> and registered with the
        renderer at generate time. When saving programmatically you can enable{' '}
        <strong>font subsetting</strong> to keep only the glyphs the template uses, shrinking the
        file further.
      </p>

      <DocNext
        prev={{ to: '/docs/schema', label: 'Template & input schema' }}
        next={{ to: '/docs/batch', label: 'Batch & storage' }}
      />
    </>
  )
}
