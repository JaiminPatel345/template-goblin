import { describe, it, expect } from 'vitest'
import { generatePreviewHtml } from '../previewGenerator.js'
import type {
  FieldDefinition,
  TextFieldStyle,
  TableFieldStyle,
  CellStyle,
} from '@template-goblin/types'

/* ---- helpers ---- */

function cell(overrides: Partial<CellStyle> = {}): CellStyle {
  return {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    align: 'left',
    verticalAlign: 'top',
    ...overrides,
  }
}

function textField(jsonKey: string, zIndex = 0): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey, required: true, placeholder: null },
    x: 10,
    y: 20,
    width: 200,
    height: 30,
    zIndex,
    style: {
      fontId: null,
      fontFamily: 'Helvetica',
      fontSize: 12,
      fontSizeDynamic: false,
      fontSizeMin: 11,
      lineHeight: 1.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000',
      align: 'left',
      verticalAlign: 'top',
      maxRows: 1,
      overflowMode: 'truncate',
      snapToGrid: true,
    } satisfies TextFieldStyle,
  }
}

function tableField(jsonKey: string, zIndex = 0): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'table',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey, required: true, placeholder: null },
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    zIndex,
    style: {
      maxRows: 10,
      maxColumns: 3,
      multiPage: false,
      showHeader: true,
      headerStyle: cell({ fontWeight: 'bold', backgroundColor: '#eee' }),
      rowStyle: cell(),
      oddRowStyle: null,
      evenRowStyle: null,
      cellStyle: { overflowMode: 'truncate' },
      columns: [
        { key: 'name', label: 'Name', width: 150, style: null, headerStyle: null },
        { key: 'grade', label: 'Grade', width: 80, style: null, headerStyle: null },
      ],
    } satisfies TableFieldStyle,
  }
}

const defaultMeta = { name: 'Test Template', width: 595, height: 842 }

function emptyData() {
  return { texts: {}, tables: {}, images: {} }
}

/* ---- tests ---- */

describe('generatePreviewHtml', () => {
  describe('return type', () => {
    it('returns a Blob with type text/html', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, [], emptyData())
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/html')
    })
  })

  describe('HTML structure', () => {
    it('contains the template name in the title', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, [], emptyData())
      const html = await blob.text()
      expect(html).toContain('<title>Test Template')
    })

    it('contains a named @page rule with correct dimensions', async () => {
      // Per-page sized templates (#46/#47) emit one named @page rule per
      // page (`@page page0 { size: ... }`) so Print → Save as PDF can pick
      // a different sheet size for each section. The first page's rule is
      // always present and uses the page's resolved size.
      const meta = { name: 'Custom', width: 612, height: 792 }
      const blob = await generatePreviewHtml([], meta, [], emptyData())
      const html = await blob.text()
      expect(html).toMatch(/@page page0\s*\{\s*size:\s*612pt 792pt;\s*margin:\s*0;?\s*\}/)
    })

    it('contains print button', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, [], emptyData())
      const html = await blob.text()
      expect(html).toContain('window.print()')
      expect(html).toContain('Print / Save as PDF')
    })
  })

  describe('text fields', () => {
    it('renders text field values in output HTML', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: 'John Doe' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).toContain('John Doe')
    })

    it('does not render text field when value is empty', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: '' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      // The text div should not appear when value is empty
      expect(html).not.toContain('class="f"')
    })

    it('does not render text field when key is missing from data', async () => {
      const fields = [textField('name')]
      const blob = await generatePreviewHtml(fields, defaultMeta, [], emptyData())
      const html = await blob.text()
      expect(html).not.toContain('class="f"')
    })
  })

  describe('table fields', () => {
    it('renders table headers in output', async () => {
      const fields = [tableField('marks')]
      const data = {
        texts: {},
        tables: { marks: [{ name: 'Alice', grade: 'A' }] },
        images: {},
      }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).toContain('Name')
      expect(html).toContain('Grade')
    })

    it('renders row data in table cells', async () => {
      const fields = [tableField('marks')]
      const data = {
        texts: {},
        tables: { marks: [{ name: 'Alice', grade: 'A+' }] },
        images: {},
      }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).toContain('Alice')
      expect(html).toContain('A+')
    })

    // GH #65 — when the table's content overflows the field rect, the
    // wrapper must clip overflow AND draw a perimeter border so the
    // bottom edge always shows. Without these, an over-tall row count
    // spilled past the rect and the last row's per-cell bottom border
    // got visually clipped, leaving an open-bottom table.
    it('clips overflowing rows AND renders a perimeter border on the wrapper (#65)', async () => {
      const f = tableField('marks')
      f.height = 60
      ;(f.style as TableFieldStyle).maxRows = 50
      const rows = Array.from({ length: 50 }, (_, i) => ({
        name: `S${i}`,
        grade: 'A',
      }))
      const blob = await generatePreviewHtml([f], defaultMeta, [], {
        texts: {},
        tables: { marks: rows },
        images: {},
      })
      const html = await blob.text()
      // Wrapper must clip overflow so excess rows don't bleed out of the rect.
      expect(html).toMatch(/overflow:hidden/)
      // Perimeter border must be on the wrapper — not just the per-cell
      // borders — so the bottom edge survives even if a row got clipped.
      // Match a `border:<n>pt solid <hex>` declaration (per-cell borders
      // use the same syntax inside <td>/<th> but the wrapper's <div> sits
      // first in the emitted string before any cell).
      const wrapperBorder = html.match(
        /<div class="f"[^>]*style="[^"]*border:\d+(?:\.\d+)?pt solid [^"]+/,
      )
      expect(wrapperBorder).not.toBeNull()
    })

    it('does not render table when rows are empty', async () => {
      const fields = [tableField('marks')]
      const data = { texts: {}, tables: { marks: [] }, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).not.toContain('<table>')
    })
  })

  describe('empty fields', () => {
    it('produces valid HTML with no fields', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, [], emptyData())
      const html = await blob.text()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('</html>')
      expect(html).toContain('<body>')
      expect(html).toContain('</body>')
    })
  })

  describe('background', () => {
    it('includes background dataUrl as img src on the page section', async () => {
      const bgUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS...'
      const blob = await generatePreviewHtml(
        [],
        defaultMeta,
        [{ id: 'p0', backgroundDataUrl: bgUrl }],
        emptyData(),
      )
      const html = await blob.text()
      expect(html).toContain(`<img class="bg" src="${bgUrl}"`)
    })

    it('does not include img tag when no background', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, [], emptyData())
      const html = await blob.text()
      expect(html).not.toContain('<img class="bg"')
    })

    it('uses per-page solid backgroundColor on the section when no image is present', async () => {
      const blob = await generatePreviewHtml(
        [],
        defaultMeta,
        [{ id: 'p0', backgroundColor: '#ff0000' }],
        emptyData(),
      )
      const html = await blob.text()
      expect(html).toContain('background:#ff0000')
      expect(html).not.toContain('<img class="bg"')
    })

    it('defaults section background to #ffffff when no page bg supplied', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, [], emptyData())
      const html = await blob.text()
      expect(html).toContain('background:#ffffff')
    })
  })

  describe('XSS prevention', () => {
    it('HTML-escapes text values', async () => {
      const fields = [textField('name')]
      const data = {
        texts: { name: '<script>alert("xss")</script>' },
        tables: {},
        images: {},
      }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).not.toContain('<script>alert')
      expect(html).toContain('&lt;script&gt;')
    })

    it('escapes ampersands in text values', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: 'Tom & Jerry' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).toContain('Tom &amp; Jerry')
    })

    it('escapes quotes in text values', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: 'He said "hello"' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).toContain('&quot;hello&quot;')
    })

    it('escapes single quotes in text values', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: "it's fine" }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).toContain('it&#x27;s fine')
    })

    it('escapes template name in title', async () => {
      const meta = { name: '<b>Evil</b>', width: 595, height: 842 }
      const blob = await generatePreviewHtml([], meta, [], emptyData())
      const html = await blob.text()
      expect(html).not.toContain('<b>Evil</b>')
      expect(html).toContain('&lt;b&gt;Evil&lt;/b&gt;')
    })

    it('escapes table column labels', async () => {
      const field = tableField('marks')
      const style = field.style as TableFieldStyle
      style.columns[0]!.label = '<img src=x onerror=alert(1)>'
      const data = {
        texts: {},
        tables: { marks: [{ name: 'test', grade: 'A' }] },
        images: {},
      }
      const blob = await generatePreviewHtml([field], defaultMeta, [], data)
      const html = await blob.text()
      expect(html).not.toContain('<img src=x')
      expect(html).toContain('&lt;img src=x')
    })

    it('escapes table cell values', async () => {
      const fields = [tableField('marks')]
      const data = {
        texts: {},
        tables: { marks: [{ name: '<b>bold</b>', grade: 'A' }] },
        images: {},
      }
      const blob = await generatePreviewHtml(fields, defaultMeta, [], data)
      const html = await blob.text()
      expect(html).not.toContain('<b>bold</b>')
      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
    })
  })

  describe('field jsonKey handling', () => {
    it('skips fields with empty jsonKey', async () => {
      const field = textField('')
      const data = { texts: { '': 'value' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml([field], defaultMeta, [], data)
      const html = await blob.text()
      // Field with empty key should be skipped
      expect(html).not.toContain('class="f"')
    })
  })

  // GH #44 — auto-fit, overflow, table maxRows, real images.
  describe('GH #44 — fit-to-rect and overflow handling', () => {
    it('shrinks fontSize to fit when fontSizeDynamic is true (no overflow)', async () => {
      const f = textField('title')
      const style = f.style as TextFieldStyle
      style.fontSize = 71
      style.fontSizeDynamic = true
      f.width = 100
      f.height = 20
      const data = {
        texts: { title: 'A very long title that wouldnt fit at 71pt' },
        tables: {},
        images: {},
      }
      const blob = await generatePreviewHtml([f], defaultMeta, [], data)
      const html = await blob.text()
      // The emitted font-size must be smaller than the declared 71pt.
      const m = html.match(/font-size:(\d+(?:\.\d+)?)pt/)
      expect(m).not.toBeNull()
      const px = m ? parseFloat(m[1]!) : 71
      expect(px).toBeLessThan(71)
    })

    it('clips table rows to style.maxRows', async () => {
      const f = tableField('marks')
      ;(f.style as TableFieldStyle).maxRows = 3
      const rows = Array.from({ length: 10 }, (_, i) => ({
        name: `Student ${i}`,
        grade: 'A',
      }))
      const blob = await generatePreviewHtml([f], defaultMeta, [], {
        texts: {},
        tables: { marks: rows },
        images: {},
      })
      const html = await blob.text()
      // Only the first 3 rows render — ones beyond maxRows are dropped.
      expect(html).toContain('Student 0')
      expect(html).toContain('Student 2')
      expect(html).not.toContain('Student 3')
      expect(html).not.toContain('Student 9')
    })

    it('renders an <img> when imageDataUrls resolves the filename', async () => {
      const f: FieldDefinition = {
        id: 'img-1',
        type: 'image',
        groupId: null,
        pageId: null,
        label: '',
        source: { mode: 'static', value: { filename: 'logo.png' } },
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        zIndex: 0,
        style: { fit: 'contain' },
      }
      const dataUrl = 'data:image/png;base64,AAAA'
      const blob = await generatePreviewHtml([f], defaultMeta, [], emptyData(), {
        imageDataUrls: new Map([['logo.png', dataUrl]]),
      })
      const html = await blob.text()
      expect(html).toContain(`src="${dataUrl}"`)
      expect(html).toContain('object-fit:contain')
      // Falls back to the placeholder rect ONLY when the resolver misses.
      expect(html).not.toContain('[logo.png]')
    })

    it('falls back to placeholder rect when imageDataUrls has no entry', async () => {
      const f: FieldDefinition = {
        id: 'img-2',
        type: 'image',
        groupId: null,
        pageId: null,
        label: '',
        source: { mode: 'static', value: { filename: 'missing.png' } },
        x: 10,
        y: 10,
        width: 100,
        height: 100,
        zIndex: 0,
        style: { fit: 'contain' },
      }
      const blob = await generatePreviewHtml([f], defaultMeta, [], emptyData())
      const html = await blob.text()
      expect(html).toContain('[missing.png]')
      expect(html).not.toContain('<img src=')
    })

    it('emits f-truncate class when overflowMode is "truncate"', async () => {
      const f = textField('label')
      ;(f.style as TextFieldStyle).overflowMode = 'truncate'
      const blob = await generatePreviewHtml([f], defaultMeta, [], {
        texts: { label: 'hi' },
        tables: {},
        images: {},
      })
      const html = await blob.text()
      expect(html).toContain('class="f f-truncate"')
    })
  })

  // GH #73 — for dynamic text the canvas, sidebar, and preview/PDF must all
  // agree on the rendered fontSize. The HTML preview is the testable proxy
  // for the canvas's rendered size: they share the effective-fontSize logic,
  // and both must emit the user's authored value when the rect accommodates
  // it. The pre-#73 bug grew the placeholder text past the authored size.
  describe('GH #73 — dynamic text WYSIWYG', () => {
    it('dynamic text with fontSizeDynamic=false renders at the authored fontSize', async () => {
      const f = textField('name')
      ;(f.style as TextFieldStyle).fontSize = 12
      ;(f.style as TextFieldStyle).fontSizeDynamic = false
      f.width = 400
      f.height = 200
      const blob = await generatePreviewHtml([f], defaultMeta, [], {
        texts: { name: 'Jane' },
        tables: {},
        images: {},
      })
      const html = await blob.text()
      expect(html).toContain('font-size:12pt')
    })

    it('dynamic text with fontSizeDynamic=true does NOT auto-grow above the authored fontSize', async () => {
      // The PDF generator only ever shrinks (never grows), so the preview
      // must too. Authored size is the ceiling regardless of the flag.
      const f = textField('name')
      ;(f.style as TextFieldStyle).fontSize = 12
      ;(f.style as TextFieldStyle).fontSizeDynamic = true
      f.width = 400
      f.height = 200
      const blob = await generatePreviewHtml([f], defaultMeta, [], {
        texts: { name: 'Jane' },
        tables: {},
        images: {},
      })
      const html = await blob.text()
      const m = html.match(/font-size:(\d+(?:\.\d+)?)pt/)
      expect(m).not.toBeNull()
      const size = m ? parseFloat(m[1]!) : 0
      expect(size).toBeLessThanOrEqual(12)
      expect(size).toBeGreaterThan(0)
    })
  })

  // GH #49 — multi-page preview: one <section> per page, fields routed by pageId.
  describe('GH #49 — multi-page rendering', () => {
    it('emits one <section class="page"> per supplied page', async () => {
      const blob = await generatePreviewHtml(
        [],
        defaultMeta,
        [
          { id: 'p1', backgroundColor: '#ffffff' },
          { id: 'p2', backgroundColor: '#f0f0f0' },
          { id: 'p3', backgroundColor: '#dddddd' },
        ],
        emptyData(),
      )
      const html = await blob.text()
      const sections = html.match(/<section class="page page-\d+"/g) ?? []
      expect(sections.length).toBe(3)
    })

    it('routes fields to their page by pageId', async () => {
      const f1 = textField('on_p1')
      f1.pageId = 'p1'
      const f2 = textField('on_p2')
      f2.pageId = 'p2'
      const blob = await generatePreviewHtml(
        [f1, f2],
        defaultMeta,
        [
          { id: 'p1', backgroundColor: '#fff' },
          { id: 'p2', backgroundColor: '#fff' },
        ],
        { texts: { on_p1: 'first', on_p2: 'second' }, tables: {}, images: {} },
      )
      const html = await blob.text()
      // Each section contains only its own field.
      const m = html.split(/<section class="page page-\d+"/)
      expect(m[1]).toContain('first')
      expect(m[1]).not.toContain('second')
      expect(m[2]).toContain('second')
      expect(m[2]).not.toContain('first')
    })

    it('orphan fields (pageId=null) land on the first page', async () => {
      const orphan = textField('orphan')
      orphan.pageId = null
      const onP2 = textField('on_p2')
      onP2.pageId = 'p2'
      const blob = await generatePreviewHtml(
        [orphan, onP2],
        defaultMeta,
        [
          { id: 'p1', backgroundColor: '#fff' },
          { id: 'p2', backgroundColor: '#fff' },
        ],
        { texts: { orphan: 'orphan!', on_p2: 'p2 only' }, tables: {}, images: {} },
      )
      const html = await blob.text()
      const m = html.split(/<section class="page page-\d+"/)
      expect(m[1]).toContain('orphan!')
      expect(m[1]).not.toContain('p2 only')
      expect(m[2]).toContain('p2 only')
      expect(m[2]).not.toContain('orphan!')
    })

    it('first page also picks up fields explicitly tagged with the first page id alongside orphans', async () => {
      const explicit = textField('on_p1')
      explicit.pageId = 'p1'
      const orphan = textField('orphan')
      orphan.pageId = null
      const blob = await generatePreviewHtml(
        [explicit, orphan],
        defaultMeta,
        [{ id: 'p1', backgroundColor: '#fff' }],
        { texts: { on_p1: 'explicit-1', orphan: 'orphan-1' }, tables: {}, images: {} },
      )
      const html = await blob.text()
      expect(html).toContain('explicit-1')
      expect(html).toContain('orphan-1')
    })

    it('emits page-break CSS so each section prints to its own sheet', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, [], emptyData())
      const html = await blob.text()
      expect(html).toContain('page-break-after: always')
      expect(html).toContain('.page:last-child { page-break-after: auto')
    })

    it('emits a single implicit page when no pages are supplied', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, [], emptyData())
      const html = await blob.text()
      const sections = html.match(/<section class="page page-\d+"/g) ?? []
      expect(sections.length).toBe(1)
    })
  })

  describe('per-page sizing (#46/#47)', () => {
    // Mixed-size templates need every page to print at its own dimensions,
    // not the template-level meta. Three behaviours under test:
    //   1. each page emits a named @page rule with the page's size
    //   2. each <section> carries inline width/height for that size
    //   3. pages without explicit width/height fall back to meta
    it("emits a named @page rule per page using each page's declared size", async () => {
      const blob = await generatePreviewHtml(
        [],
        { name: 'mixed', width: 595, height: 842 },
        [
          { id: 'p1', backgroundColor: '#fff', width: 595, height: 842 },
          { id: 'p2', backgroundColor: '#fff', width: 612, height: 792 },
        ],
        emptyData(),
      )
      const html = await blob.text()
      expect(html).toMatch(/@page page0\s*\{\s*size:\s*595pt 842pt/)
      expect(html).toMatch(/@page page1\s*\{\s*size:\s*612pt 792pt/)
    })

    it("inlines each section's width/height in points", async () => {
      const blob = await generatePreviewHtml(
        [],
        { name: 'mixed', width: 595, height: 842 },
        [
          { id: 'p1', backgroundColor: '#fff', width: 595, height: 842 },
          { id: 'p2', backgroundColor: '#fff', width: 420, height: 595 },
        ],
        emptyData(),
      )
      const html = await blob.text()
      expect(html).toMatch(/<section class="page page-0"[^>]*width:595pt;height:842pt/)
      expect(html).toMatch(/<section class="page page-1"[^>]*width:420pt;height:595pt/)
    })

    it('falls back to meta when a page omits width/height', async () => {
      const blob = await generatePreviewHtml(
        [],
        { name: 'legacy', width: 595, height: 842 },
        [{ id: 'p1', backgroundColor: '#fff' }],
        emptyData(),
      )
      const html = await blob.text()
      expect(html).toMatch(/@page page0\s*\{\s*size:\s*595pt 842pt/)
      expect(html).toMatch(/<section class="page page-0"[^>]*width:595pt;height:842pt/)
    })
  })
})
