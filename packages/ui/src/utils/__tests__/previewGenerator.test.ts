import { describe, it, expect } from 'vitest'
import { generatePreviewHtml } from '../previewGenerator.js'
import type { FieldDefinition, TextFieldStyle, LoopFieldStyle } from '@template-goblin/types'

/* ---- helpers ---- */

function textField(jsonKey: string, zIndex = 0): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'text',
    groupId: null,
    pageId: null,
    required: true,
    jsonKey,
    placeholder: null,
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

// imageField helper available for future tests
// function imageField(jsonKey: string, zIndex = 0): FieldDefinition {
//   return { id: `f-${jsonKey}`, type: 'image', groupId: null, required: true, jsonKey, placeholder: null, x: 50, y: 60, width: 100, height: 100, zIndex, style: { fit: 'contain', placeholderFilename: null } satisfies ImageFieldStyle }
// }

function loopField(jsonKey: string, zIndex = 0): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'loop',
    groupId: null,
    pageId: null,
    required: true,
    jsonKey,
    placeholder: null,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    zIndex,
    style: {
      maxRows: 10,
      maxColumns: 3,
      multiPage: false,
      headerStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'bold',
        align: 'left',
        color: '#000',
        backgroundColor: '#eee',
      },
      rowStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'normal',
        color: '#000',
        overflowMode: 'truncate',
        fontSizeDynamic: false,
        fontSizeMin: 6,
        lineHeight: 1.2,
      },
      cellStyle: {
        borderWidth: 1,
        borderColor: '#ccc',
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 4,
        paddingRight: 4,
      },
      columns: [
        { key: 'name', label: 'Name', width: 150, align: 'left' },
        { key: 'grade', label: 'Grade', width: 80, align: 'center' },
      ],
    } satisfies LoopFieldStyle,
  }
}

const defaultMeta = { name: 'Test Template', width: 595, height: 842 }

function emptyData() {
  return { texts: {}, loops: {}, images: {} }
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
      const fields = [textField('texts.name')]
      const data = { texts: { name: 'John Doe' }, loops: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('John Doe')
    })

    it('does not render text field when value is empty', async () => {
      const fields = [textField('texts.name')]
      const data = { texts: { name: '' }, loops: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      // The text div should not appear when value is empty
      expect(html).not.toContain('class="f"')
    })

    it('does not render text field when key is missing from data', async () => {
      const fields = [textField('texts.name')]
      const blob = await generatePreviewHtml(fields, defaultMeta, null, emptyData())
      const html = await blob.text()
      expect(html).not.toContain('class="f"')
    })
  })

  describe('loop fields', () => {
    it('renders table headers in output', async () => {
      const fields = [loopField('loops.marks')]
      const data = {
        texts: {},
        loops: { marks: [{ name: 'Alice', grade: 'A' }] },
        images: {},
      }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('Name')
      expect(html).toContain('Grade')
    })

    it('renders row data in table cells', async () => {
      const fields = [loopField('loops.marks')]
      const data = {
        texts: {},
        loops: { marks: [{ name: 'Alice', grade: 'A+' }] },
        images: {},
      }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('Alice')
      expect(html).toContain('A+')
    })

    it('does not render loop when rows are empty', async () => {
      const fields = [loopField('loops.marks')]
      const data = { texts: {}, loops: { marks: [] }, images: {} }
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
  })

  describe('XSS prevention', () => {
    it('HTML-escapes text values', async () => {
      const fields = [textField('texts.name')]
      const data = {
        texts: { name: '<script>alert("xss")</script>' },
        loops: {},
        images: {},
      }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      // Raw script tag must not appear
      expect(html).not.toContain('<script>alert')
      // Escaped version should be present
      expect(html).toContain('&lt;script&gt;')
    })

    it('escapes ampersands in text values', async () => {
      const fields = [textField('texts.name')]
      const data = { texts: { name: 'Tom & Jerry' }, loops: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('Tom &amp; Jerry')
    })

    it('escapes quotes in text values', async () => {
      const fields = [textField('texts.name')]
      const data = { texts: { name: 'He said "hello"' }, loops: {}, images: {} }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).toContain('&quot;hello&quot;')
    })

    it('escapes single quotes in text values', async () => {
      const fields = [textField('texts.name')]
      const data = { texts: { name: "it's fine" }, loops: {}, images: {} }
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

    it('escapes loop column labels', async () => {
      const field = loopField('loops.marks')
      const style = field.style as LoopFieldStyle
      style.columns[0]!.label = '<img src=x onerror=alert(1)>'
      const data = {
        texts: {},
        loops: { marks: [{ name: 'test', grade: 'A' }] },
        images: {},
      }
      const blob = await generatePreviewHtml([field], defaultMeta, null, data)
      const html = await blob.text()
      expect(html).not.toContain('<img src=x')
      expect(html).toContain('&lt;img src=x')
    })

    it('escapes loop cell values', async () => {
      const fields = [loopField('loops.marks')]
      const data = {
        texts: {},
        loops: { marks: [{ name: '<b>bold</b>', grade: 'A' }] },
        images: {},
      }
      const blob = await generatePreviewHtml(fields, defaultMeta, null, data)
      const html = await blob.text()
      expect(html).not.toContain('<b>bold</b>')
      expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
    })
  })

  describe('field jsonKey handling', () => {
    it('skips fields with no name part in jsonKey', async () => {
      const field = textField('texts.')
      const data = { texts: { '': 'value' }, loops: {}, images: {} }
      const blob = await generatePreviewHtml([field], defaultMeta, null, data)
      const html = await blob.text()
      // Field with empty name after the dot should be skipped
      expect(html).not.toContain('class="f"')
    })
  })
})
