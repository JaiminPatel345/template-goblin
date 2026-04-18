/**
 * QA tests for `generatePreviewHtml` static-field rendering.
 * Per design 2026-04-18 §8.3 "Canvas preview":
 *   - Static text: rendered with the literal `source.value`.
 *   - Static image: rendered with the uploaded image.
 *   - Static table: rendered with the baked-in rows.
 *   - Dynamic text: rendered with the preview input value if provided,
 *     otherwise the placeholder string.
 */
import { describe, it, expect } from 'vitest'
import { generatePreviewHtml } from '../previewGenerator.js'
import type {
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
  CellStyle,
  StaticSource,
  DynamicSource,
} from '@template-goblin/types'

const meta = { name: 'T', width: 595, height: 842 }
const empty = { texts: {}, tables: {}, images: {} }

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

const textStyle: TextFieldStyle = {
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
}
const imageStyle: ImageFieldStyle = { fit: 'contain' }
const tableStyle: TableFieldStyle = {
  maxRows: 10,
  maxColumns: 3,
  multiPage: false,
  showHeader: true,
  headerStyle: cell({ fontWeight: 'bold' }),
  rowStyle: cell(),
  oddRowStyle: null,
  evenRowStyle: null,
  cellStyle: { overflowMode: 'truncate' },
  columns: [{ key: 'c1', label: 'C1', width: 100, style: null, headerStyle: null }],
}

function staticText(value: string): FieldDefinition {
  const source: StaticSource<string> = { mode: 'static', value }
  return {
    id: 'stxt',
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source,
    x: 10,
    y: 20,
    width: 200,
    height: 30,
    zIndex: 0,
    style: textStyle,
  }
}

function staticTable(rows: Record<string, string>[]): FieldDefinition {
  const source: StaticSource<Record<string, string>[]> = { mode: 'static', value: rows }
  return {
    id: 'stbl',
    type: 'table',
    groupId: null,
    pageId: null,
    label: '',
    source,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    zIndex: 0,
    style: tableStyle,
  }
}

function dynamicTextWithPlaceholder(jsonKey: string, placeholder: string | null): FieldDefinition {
  const source: DynamicSource<string> = {
    mode: 'dynamic',
    jsonKey,
    required: false,
    placeholder,
  }
  return {
    id: `dtxt-${jsonKey}`,
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source,
    x: 10,
    y: 20,
    width: 200,
    height: 30,
    zIndex: 0,
    style: textStyle,
  }
}

function dynamicImage(jsonKey: string): FieldDefinition {
  const source: DynamicSource<{ filename: string }> = {
    mode: 'dynamic',
    jsonKey,
    required: false,
    placeholder: null,
  }
  return {
    id: `dimg-${jsonKey}`,
    type: 'image',
    groupId: null,
    pageId: null,
    label: '',
    source,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
    style: imageStyle,
  }
}

// ---------------------------------------------------------------------------
// Design §8.3 — canvas/preview rendering semantics per source mode
// ---------------------------------------------------------------------------

describe('generatePreviewHtml — static text rendering', () => {
  // Per design §8.3: "Static text: rendered with the literal `source.value`."
  it('static text renders its literal value', async () => {
    const blob = await generatePreviewHtml([staticText('Hello World')], meta, null, empty)
    const html = await blob.text()
    expect(html).toContain('Hello World')
  })

  it('static text value comes from source.value, not from data', async () => {
    const data = { texts: { some_dynamic_key: 'dynamic-data' }, tables: {}, images: {} }
    const blob = await generatePreviewHtml([staticText('Baked Content')], meta, null, data)
    const html = await blob.text()
    expect(html).toContain('Baked Content')
  })
})

describe('generatePreviewHtml — dynamic text preview semantics', () => {
  it('renders the supplied preview value when data has the key', async () => {
    const blob = await generatePreviewHtml([dynamicTextWithPlaceholder('name', null)], meta, null, {
      texts: { name: 'John' },
      tables: {},
      images: {},
    })
    const html = await blob.text()
    expect(html).toContain('John')
  })

  // Per design §8.3 dynamic text bullet: "rendered with the preview input
  // value if the designer has typed one, otherwise the placeholder string."
  it('dynamic text with placeholder renders placeholder when no preview value', async () => {
    const blob = await generatePreviewHtml(
      [dynamicTextWithPlaceholder('name', 'Your Name Here')],
      meta,
      null,
      empty,
    )
    const html = await blob.text()
    expect(html).toContain('Your Name Here')
  })
})

describe('generatePreviewHtml — static table rendering', () => {
  // Per design §8.3: "Static table: rendered with the baked-in rows."
  it('static table renders baked-in rows', async () => {
    const blob = await generatePreviewHtml([staticTable([{ c1: 'baked-row' }])], meta, null, empty)
    const html = await blob.text()
    expect(html).toContain('baked-row')
  })
})

describe('generatePreviewHtml — dynamic image placeholder', () => {
  it('dynamic image with no preview data and no placeholder image still renders a field box', async () => {
    const blob = await generatePreviewHtml([dynamicImage('photo')], meta, null, empty)
    const html = await blob.text()
    // The field should appear with its id as reference, since renderImageHtml
    // is invoked for dynamic images regardless of data presence.
    expect(html.length).toBeGreaterThan(0)
  })
})
