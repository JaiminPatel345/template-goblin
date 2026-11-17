import { CodeBlock } from '../../components/CodeBlock'
import { Callout, DocHeader, DocNext, DocTable } from '../../components/DocParts'

const TEXT_SAMPLE = `// In manifest.json (or visual editor):
{
  "id": "customer-name",
  "type": "text",
  "label": "Customer Name",
  "x": 40,
  "y": 120,
  "width": 260,
  "height": 32,
  "zIndex": 1,
  "rotation": 0, // degrees clockwise
  "source": { "mode": "dynamic", "jsonKey": "customerName" },
  "style": {
    "fontFamily": "Helvetica",
    "fontSize": 14,
    "fontSizeMin": 9,
    "fontWeight": "bold",
    "fontStyle": "normal",
    "textDecoration": "none",
    "color": "#111827",
    "backgroundColor": null,
    "align": "left",
    "verticalAlign": "middle",
    "lineHeight": 1.2,
    "maxRows": 2,
    "overflowMode": "dynamic_font", // or "truncate"
    "trim": true
  }
}

// In input data:
const data = {
  texts: { customerName: "Acme Industrial Corporation" }
}`

const IMAGE_SAMPLE = `// In manifest.json (or visual editor):
{
  "id": "company-logo",
  "type": "image",
  "label": "Company Logo",
  "x": 40,
  "y": 40,
  "width": 120,
  "height": 60,
  "zIndex": 2,
  "source": {
    "mode": "dynamic",
    "jsonKey": "logoUrl",
    "placeholder": { "filename": "logo_placeholder.png" }
  },
  "style": {
    "fit": "contain" // "contain" | "cover" | "fill"
  }
}

// In input data — supports URLs, base64, file paths, or Buffers:
const data = {
  images: {
    logoUrl: "https://example.com/assets/logo.png",
    // or: fs.readFileSync('./logo.png')
    // or: "data:image/png;base64,iVBORw0KGgo..."
  }
}`

const TABLE_SAMPLE = `// In manifest.json (or visual editor):
{
  "id": "invoice-items",
  "type": "table",
  "label": "Line Items",
  "x": 40,
  "y": 180,
  "width": 515,
  "height": 160,
  "zIndex": 1,
  "source": { "mode": "dynamic", "jsonKey": "items" },
  "style": {
    "heightMode": "multipage", // "multipage" | "single_page_dynamic" | "fixed"
    "showHeader": true,
    "headerHeight": 24, // pt height (null = auto from font size)
    "headerStyle": {
      "fontFamily": "Helvetica",
      "fontSize": 10,
      "fontWeight": "bold",
      "color": "#ffffff",
      "backgroundColor": "#1e293b",
      "paddingTop": 4,
      "paddingBottom": 4,
      "paddingLeft": 8,
      "paddingRight": 8,
      "align": "left",
      "verticalAlign": "middle",
      "borderWidth": 0,
      "borderColor": null
    },
    "rowStyle": {
      "fontFamily": "Helvetica",
      "fontSize": 9,
      "fontWeight": "normal",
      "color": "#334155",
      "backgroundColor": "#ffffff",
      "paddingTop": 4,
      "paddingBottom": 4,
      "paddingLeft": 8,
      "paddingRight": 8,
      "align": "left",
      "verticalAlign": "middle",
      "borderWidth": 0.5,
      "borderColor": "#e2e8f0"
    },
    "oddRowStyle": { "backgroundColor": "#f8fafc" },
    "columns": [
      { "key": "desc",  "label": "Description", "width": 315, "style": null, "headerStyle": null },
      { "key": "qty",   "label": "Qty",         "width": 60,  "style": { "align": "center" }, "headerStyle": null },
      { "key": "price", "label": "Amount",      "width": 140, "style": { "align": "right" },  "headerStyle": { "align": "right" } }
    ],
    "tableBorder": { "color": "#cbd5e1", "width": 1 },
    "fitToContent": true
  }
}

// In input data:
const data = {
  tables: {
    items: [
      { desc: "Web Application Design", qty: "1", price: "$2,400.00" },
      { desc: "API Engine Integration", qty: "2", price: "$3,600.00" }
    ]
  }
}`

/** Detailed reference for TemplateGoblin's three element types: Text, Image, and Table. */
export function ElementTypes() {
  return (
    <>
      <DocHeader
        kicker="Get started"
        title="Element types"
        intro="Every visual document in TemplateGoblin is built with three fundamental elements: Text, Image, and Table. Each element supports precise layout controls, styling properties, and dynamic runtime bindings."
      />

      <p>
        All elements share core bounding box coordinates (<code>x</code>, <code>y</code>,{' '}
        <code>width</code>, <code>height</code> in points), layer order (<code>zIndex</code>),
        target page (<code>pageId</code>), optional <code>rotation</code> (0–360° around element
        center), and optional <code>hyperlink</code> URLs.
      </p>

      <h2>1. Text Elements</h2>
      <p>
        The text engine handles typography with automatic word wrapping, dynamic font auto-fitting,
        truncation, and alignment inside its bounding box (Rule 10: text never overflows its
        container).
      </p>
      <DocTable
        head={['Option', 'Type', 'Description']}
        rows={[
          [
            <code>fontFamily</code>,
            <code>string</code>,
            'Registered font family (e.g. Helvetica, Times-Roman, or custom TTF).',
          ],
          [<code>fontSize</code>, <code>number</code>, 'Base font size in points (e.g. 12).'],
          [
            <code>fontSizeMin</code>,
            <code>number</code>,
            'Floor font size in points when dynamic font shrinking is active.',
          ],
          [
            <code>lineHeight</code>,
            <code>number</code>,
            'Line height multiplier (e.g. 1.2 or 1.4).',
          ],
          [<code>fontWeight</code>, <code>"normal" | "bold"</code>, 'Font weight variant.'],
          [<code>fontStyle</code>, <code>"normal" | "italic"</code>, 'Font slant style.'],
          [
            <code>textDecoration</code>,
            <code>"none" | "underline" | "line-through"</code>,
            'Text decoration decoration line.',
          ],
          [<code>color</code>, <code>string</code>, 'Hex font color (e.g. "#111827").'],
          [
            <code>backgroundColor</code>,
            <code>string | null</code>,
            'Optional background fill behind text box (null = transparent).',
          ],
          [
            <code>align</code>,
            <code>"left" | "center" | "right"</code>,
            'Horizontal text alignment.',
          ],
          [
            <code>verticalAlign</code>,
            <code>"top" | "middle" | "bottom"</code>,
            'Vertical alignment within the field bounding box.',
          ],
          [
            <code>maxRows</code>,
            <code>number</code>,
            'Maximum visible text lines allowed before overflow handling triggers.',
          ],
          [
            <code>overflowMode</code>,
            <code>"dynamic_font" | "truncate"</code>,
            '"dynamic_font" automatically shrinks text down to fontSizeMin before truncating; "truncate" clips strictly at character boundaries.',
          ],
          [
            <code>trim</code>,
            <code>boolean</code>,
            'Whether to strip leading/trailing whitespace before rendering (default: true).',
          ],
        ]}
      />
      <CodeBlock code={TEXT_SAMPLE} file="text-field.json" lang="json" />

      <h2>2. Image Elements</h2>
      <p>
        Image fields render raster graphics (JPEG, PNG) or solid color blocks. Dynamic image fields
        support remote HTTP/HTTPS URLs, local files, data URIs, raw Base64, or Node.js Buffers.
      </p>
      <DocTable
        head={['Option', 'Type', 'Description']}
        rows={[
          [
            <code>fit</code>,
            <code>"contain" | "cover" | "fill"</code>,
            'Aspect ratio scaling mode. "contain" fits image inside rect without clipping (letterboxed); "cover" fills rect preserving aspect ratio (center-cropped); "fill" stretches to exact width & height.',
          ],
          [
            <code>source.mode</code>,
            <code>"static" | "dynamic"</code>,
            '"static" uses a baked asset or color; "dynamic" resolves from data.images[jsonKey] at runtime.',
          ],
          [
            <code>source.value</code>,
            <code>&#123; filename &#125; | &#123; color &#125;</code>,
            'For static images: a filename inside the archive or a hex solid color block (e.g. "#4f46e5").',
          ],
          [
            <code>source.placeholder</code>,
            <code>&#123; filename &#125;</code>,
            'Preview image shown in the visual editor canvas for dynamic image fields.',
          ],
        ]}
      />
      <Callout>
        Remote images are fetched with configurable timeouts (<code>imageFetchTimeoutMs</code>) and
        concurrency pooling (<code>imageResolveConcurrency</code>) in <code>generatePDF</code>.
      </Callout>
      <CodeBlock code={IMAGE_SAMPLE} file="image-field.json" lang="json" />

      <h2>3. Table Elements</h2>
      <p>
        The table element powers invoices, receipts, financial records, and schedules with
        structured columns, cell borders, zebra striping, and dynamic multi-page pagination.
      </p>
      <DocTable
        head={['Option', 'Type', 'Description']}
        rows={[
          [
            <code>heightMode</code>,
            <code>"multipage" | "single_page_dynamic" | "fixed"</code>,
            '"multipage" expands across continuation pages down to footer margin; "single_page_dynamic" expands page height on a single page and shifts lower content down; "fixed" clips rows at canvas height.',
          ],
          [
            <code>showHeader</code>,
            <code>boolean</code>,
            'Whether to display the table column header row.',
          ],
          [
            <code>headerHeight</code>,
            <code>number | null</code>,
            'Explicit header row height in pt, or null for automatic calculation from headerStyle.',
          ],
          [
            <code>headerStyle</code>,
            <code>CellStyle</code>,
            'Style for header row: typography, backgroundColor, borderColor, borderWidth, padding, align, verticalAlign.',
          ],
          [
            <code>rowStyle</code>,
            <code>CellStyle</code>,
            'Base style for data rows: font, color, border, padding, and alignments.',
          ],
          [
            <code>oddRowStyle</code>,
            <code>Partial&lt;CellStyle&gt; | null</code>,
            'Style override for odd rows (1, 3, 5...) for zebra striping.',
          ],
          [
            <code>evenRowStyle</code>,
            <code>Partial&lt;CellStyle&gt; | null</code>,
            'Style override for even rows (0, 2, 4...).',
          ],
          [
            <code>columns</code>,
            <code>TableColumn[]</code>,
            'Array of column definitions: key (JSON property), label (header title), width (pt), and optional per-column style overrides.',
          ],
          [
            <code>tableBorder</code>,
            <code>&#123; color, width &#125;</code>,
            'Outer perimeter border surrounding the entire table.',
          ],
          [
            <code>fitToContent</code>,
            <code>boolean</code>,
            'When true, perimeter border closes at the last rendered row rather than table rect height.',
          ],
        ]}
      />
      <Callout>
        <strong>Multi-page pagination:</strong> Multi-page tables automatically utilize the full
        page height down to <code>pageHeight - footerMargin</code>. To protect against runaway
        loops, generation defaults to a safety ceiling of 500 pages (
        <code>options.maxRenderPages ?? 500</code>), which you can increase or set to{' '}
        <code>Infinity</code>.
      </Callout>
      <CodeBlock code={TABLE_SAMPLE} file="table-field.json" lang="json" />

      <DocNext
        prev={{ to: '/docs/use-the-ui', label: 'Use the editor' }}
        next={{ to: '/docs/sdk', label: 'SDK & API' }}
      />
    </>
  )
}
