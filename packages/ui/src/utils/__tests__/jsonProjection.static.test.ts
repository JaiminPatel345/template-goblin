/**
 * QA tests for `projectFieldsToJson` — static/dynamic split.
 * Spec 014 §Status: "Design 2026-04-18 §8.5 narrows the JSON preview to
 * dynamic fields only -- static fields never appear in the input contract,
 * so they are filtered out."
 */
import { describe, it, expect } from 'vitest'
import { projectFieldsToJson } from '../jsonProjection.js'
import type {
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
  CellStyle,
  StaticSource,
  DynamicSource,
} from '@template-goblin/types'

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
    id: 'st-txt',
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source,
    x: 0,
    y: 0,
    width: 100,
    height: 30,
    zIndex: 0,
    style: textStyle,
  }
}

function dynamicText(jsonKey: string, required = true): FieldDefinition {
  const source: DynamicSource<string> = { mode: 'dynamic', jsonKey, required, placeholder: null }
  return {
    id: `dyn-${jsonKey}`,
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source,
    x: 0,
    y: 0,
    width: 100,
    height: 30,
    zIndex: 0,
    style: textStyle,
  }
}

function staticImage(filename: string): FieldDefinition {
  const source: StaticSource<{ filename: string }> = { mode: 'static', value: { filename } }
  return {
    id: 'st-img',
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

function dynamicImage(jsonKey: string, required = false): FieldDefinition {
  const source: DynamicSource<{ filename: string }> = {
    mode: 'dynamic',
    jsonKey,
    required,
    placeholder: { filename: 'x.png' },
  }
  return {
    id: `dyn-img-${jsonKey}`,
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

function staticTable(rows: Record<string, string>[]): FieldDefinition {
  const source: StaticSource<Record<string, string>[]> = { mode: 'static', value: rows }
  return {
    id: 'st-tbl',
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

function dynamicTable(jsonKey: string): FieldDefinition {
  const source: DynamicSource<Record<string, string>[]> = {
    mode: 'dynamic',
    jsonKey,
    required: true,
    placeholder: null,
  }
  return {
    id: `dyn-tbl-${jsonKey}`,
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

// ---------------------------------------------------------------------------
// Spec 014 §8.5: static fields filtered out of JSON preview
// ---------------------------------------------------------------------------

describe('projectFieldsToJson — static fields excluded', () => {
  it('template with only static text produces empty texts/images/tables', () => {
    const result = projectFieldsToJson([staticText('Hello')])
    expect(result).toEqual({ texts: {}, images: {}, tables: {}, links: {} })
  })

  it('template with only static image produces empty', () => {
    const result = projectFieldsToJson([staticImage('logo.png')])
    expect(result).toEqual({ texts: {}, images: {}, tables: {}, links: {} })
  })

  it('template with only static table produces empty', () => {
    const result = projectFieldsToJson([staticTable([{ c1: 'v' }])])
    expect(result).toEqual({ texts: {}, images: {}, tables: {}, links: {} })
  })

  it('mixed static + dynamic: only dynamic keys appear', () => {
    const fields = [
      staticText('Header'),
      dynamicText('name', true),
      staticImage('logo.png'),
      dynamicImage('photo', false),
      staticTable([{ c1: 'row1' }]),
      dynamicTable('marks'),
    ]
    const result = projectFieldsToJson(fields)
    expect(Object.keys(result.texts)).toEqual(['name'])
    expect(Object.keys(result.images)).toEqual(['photo'])
    expect(Object.keys(result.tables)).toEqual(['marks'])
  })

  it('static values never leak into the projection output', () => {
    const result = projectFieldsToJson([staticText('baked'), dynamicText('input', true)])
    expect(Object.keys(result.texts)).toEqual(['input'])
    // And the static value is nowhere in the output
    expect(JSON.stringify(result)).not.toContain('baked')
  })
})

describe('projectFieldsToJson — dynamic jsonKey produces a key', () => {
  it('dynamic text field contributes { jsonKey: <example> }', () => {
    const result = projectFieldsToJson([dynamicText('user_name', true)])
    expect(result.texts).toHaveProperty('user_name')
    expect(typeof result.texts.user_name).toBe('string')
  })

  it('dynamic image field with required=false still appears as a key', () => {
    const result = projectFieldsToJson([dynamicImage('photo', false)])
    expect(Object.prototype.hasOwnProperty.call(result.images, 'photo')).toBe(true)
  })

  it('dynamic image with a placeholder filename surfaces it as the mock value (GH #25)', () => {
    // The fixture uses placeholder: { filename: 'x.png' } — we now prefer that
    // over the synthetic <base64-image-data>.
    const result = projectFieldsToJson([dynamicImage('photo', false)])
    expect(result.images.photo).toBe('x.png')
  })

  it('dynamic image without a placeholder + required=false still yields null', () => {
    const noPlaceholder: FieldDefinition = {
      ...dynamicImage('photoB', false),
      source: { mode: 'dynamic', jsonKey: 'photoB', required: false, placeholder: null },
    }
    const result = projectFieldsToJson([noPlaceholder])
    expect(result.images.photoB).toBeNull()
  })
})
