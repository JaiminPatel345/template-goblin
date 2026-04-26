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
      const blob = await generatePreviewHtml([], defaultMeta, null, emptyData())
      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('text/html')
    })
  })

  describe('HTML structure', () => {
    it('contains the template name in the title', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, null, emptyData())
      const html = await blob.text()
      expect(html).toContain('<title>Test Template')
    })

    it('contains @page rule with correct dimensions', async () => {
      const meta = { name: 'Custom', width: 612, height: 792 }
      const blob = await generatePreviewHtml([], meta, null, emptyData())
      const html = await blob.text()
      expect(html).toContain('@page { size: 612pt 792pt; margin: 0; }')
    })

    it('contains print button', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, null, emptyData())
      const html = await blob.text()
      expect(html).toContain('window.print()')
      expect(html).toContain('Print / Save as PDF')
    })
  })

  describe('text fields', () => {
    it('renders text field values in output HTML', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: 'John Doe' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('John Doe')
    })

    it('does not render text field when value is empty', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: '' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      // The text div should not appear when value is empty
      expect(html).not.toContain('class="f"')
    })

    it('does not render text field when key is missing from data', async () => {
      const fields = [textField('name')]
      const blob = await generatePreviewHtml(fields, defaultMeta, null, emptyData())
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
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
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
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('Alice')
      expect(html).toContain('A+')
    })

    it('does not render table when rows are empty', async () => {
      const fields = [tableField('marks')]
      const data = { texts: {}, tables: { marks: [] }, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).not.toContain('<table>')
    })
  })

  describe('empty fields', () => {
    it('produces valid HTML with no fields', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, null, emptyData())
      const html = await blob.text()
      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('</html>')
      expect(html).toContain('<body>')
      expect(html).toContain('</body>')
    })
  })

  describe('background', () => {
    it('includes background dataUrl as img src', async () => {
      const bgUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS...'
      const blob = await generatePreviewHtml([], defaultMeta, bgUrl, emptyData())
      const html = await blob.text()
      expect(html).toContain(`<img class="bg" src="${bgUrl}"`)
    })

    it('does not include img tag when no background', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, null, emptyData())
      const html = await blob.text()
      expect(html).not.toContain('<img class="bg"')
    })

    it('uses supplied solid backgroundColor on the body when no image is present', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, null, emptyData(), {
        backgroundColor: '#ff0000',
      })
      const html = await blob.text()
      expect(html).toContain('background: #ff0000')
      expect(html).not.toContain('<img class="bg"')
    })

    it('defaults body background to #ffffff when no image and no color supplied', async () => {
      const blob = await generatePreviewHtml([], defaultMeta, null, emptyData())
      const html = await blob.text()
      expect(html).toContain('background: #ffffff')
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
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).not.toContain('<script>alert')
      expect(html).toContain('&lt;script&gt;')
    })

    it('escapes ampersands in text values', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: 'Tom & Jerry' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('Tom &amp; Jerry')
    })

    it('escapes quotes in text values', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: 'He said "hello"' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('&quot;hello&quot;')
    })

    it('escapes single quotes in text values', async () => {
      const fields = [textField('name')]
      const data = { texts: { name: "it's fine" }, tables: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('it&#x27;s fine')
    })

    it('escapes template name in title', async () => {
      const meta = { name: '<b>Evil</b>', width: 595, height: 842 }
      const blob = await generatePreviewHtml([], meta, null, emptyData())
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
      const blob = await generatePreviewHtml([field], defaultMeta, null, data)
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
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).not.toContain('<b>bold</b>')
      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
    })
  })

  describe('field jsonKey handling', () => {
    it('skips fields with empty jsonKey', async () => {
      const field = textField('')
      const data = { texts: { '': 'value' }, tables: {}, images: {} }
      const blob = await generatePreviewHtml([field], defaultMeta, null, data)
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
      const blob = await generatePreviewHtml([f], defaultMeta, null, data)
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
      const blob = await generatePreviewHtml([f], defaultMeta, null, {
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
      const blob = await generatePreviewHtml([f], defaultMeta, null, emptyData(), {
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
      const blob = await generatePreviewHtml([f], defaultMeta, null, emptyData())
      const html = await blob.text()
      expect(html).toContain('[missing.png]')
      expect(html).not.toContain('<img src=')
    })

    it('emits f-truncate class when overflowMode is "truncate"', async () => {
      const f = textField('label')
      ;(f.style as TextFieldStyle).overflowMode = 'truncate'
      const blob = await generatePreviewHtml([f], defaultMeta, null, {
        texts: { label: 'hi' },
        tables: {},
        images: {},
      })
      const html = await blob.text()
      expect(html).toContain('class="f f-truncate"')
    })
  })
})
