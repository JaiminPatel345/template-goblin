import type {
  CellStyle,
  FieldDefinition,
  ImageFieldStyle,
  InputJSON,
  LoadedTemplate,
  TableFieldStyle,
  TemplateManifest,
  TextFieldStyle,
} from '@template-goblin/types'
import { validateData } from '../src/validate.js'

const TEXT_STYLE: TextFieldStyle = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontSizeDynamic: false,
  fontSizeMin: 8,
  lineHeight: 1.2,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 1,
  overflowMode: 'truncate',
  snapToGrid: false,
}

const IMAGE_STYLE: ImageFieldStyle = { fit: 'cover' }

const BASE_CELL: CellStyle = {
  fontFamily: 'Helvetica',
  fontSize: 10,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  backgroundColor: '#ffffff',
  borderWidth: 1,
  borderColor: '#cccccc',
  paddingTop: 2,
  paddingBottom: 2,
  paddingLeft: 4,
  paddingRight: 4,
  align: 'left',
  verticalAlign: 'top',
}

function tableStyle(columnKeys: string[]): TableFieldStyle {
  return {
    maxRows: 50,
    maxColumns: 5,
    multiPage: false,
    showHeader: true,
    headerStyle: { ...BASE_CELL, fontWeight: 'bold', backgroundColor: '#eeeeee' },
    rowStyle: BASE_CELL,
    oddRowStyle: null,
    evenRowStyle: null,
    cellStyle: { overflowMode: 'truncate' },
    columns: columnKeys.map((key) => ({
      key,
      label: key,
      width: 100,
      style: null,
      headerStyle: null,
    })),
  }
}

function makeTemplate(fields: FieldDefinition[]): LoadedTemplate {
  const manifest: TemplateManifest = {
    version: '2.0',
    meta: {
      name: 'Test',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 1,
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    },
    fonts: [],
    groups: [],
    pages: [],
    fields,
  }
  return {
    manifest,
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
  }
}

function dynText(id: string, jsonKey: string, required: boolean): FieldDefinition {
  return {
    id,
    type: 'text',
    label: id,
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 200,
    height: 40,
    zIndex: 0,
    style: TEXT_STYLE,
    source: { mode: 'dynamic', jsonKey, required, placeholder: null },
  }
}

function dynImage(id: string, jsonKey: string, required: boolean): FieldDefinition {
  return {
    id,
    type: 'image',
    label: id,
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    zIndex: 0,
    style: IMAGE_STYLE,
    source: { mode: 'dynamic', jsonKey, required, placeholder: null },
  }
}

function dynTable(
  id: string,
  jsonKey: string,
  required: boolean,
  columnKeys = ['item'],
): FieldDefinition {
  return {
    id,
    type: 'table',
    label: id,
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 500,
    height: 200,
    zIndex: 0,
    style: tableStyle(columnKeys),
    source: { mode: 'dynamic', jsonKey, required, placeholder: null },
  }
}

const FIELDS: FieldDefinition[] = [
  dynText('name', 'name', true),
  dynImage('photo', 'photo', true),
  dynTable('items', 'items', true, ['item']),
  dynText('subtitle', 'subtitle', false),
]

const TEMPLATE = makeTemplate(FIELDS)

describe('validateData', () => {
  it('returns valid: true with no errors for complete valid data', () => {
    const data: InputJSON = {
      texts: { name: 'Alice', subtitle: 'Engineer' },
      images: { photo: 'base64encodedstring' },
      tables: { items: [{ item: 'Widget' }] },
    }
    const result = validateData(TEMPLATE, data)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('MISSING_REQUIRED_FIELD when required text field is missing', () => {
    const data: InputJSON = {
      texts: {},
      images: { photo: 'data' },
      tables: { items: [{ item: 'A' }] },
    }
    const result = validateData(TEMPLATE, data)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_REQUIRED_FIELD', field: 'name' }),
      ]),
    )
  })

  it('MISSING_REQUIRED_FIELD when required image field is missing', () => {
    const data: InputJSON = {
      texts: { name: 'Alice' },
      images: {},
      tables: { items: [{ item: 'A' }] },
    }
    const result = validateData(TEMPLATE, data)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_REQUIRED_FIELD', field: 'photo' }),
      ]),
    )
  })

  it('stays valid when optional field is missing', () => {
    const data: InputJSON = {
      texts: { name: 'Alice' },
      images: { photo: 'data' },
      tables: { items: [{ item: 'A' }] },
    }
    expect(validateData(TEMPLATE, data)).toEqual({ valid: true, errors: [] })
  })

  it('INVALID_DATA_TYPE for text field with number value', () => {
    const data = {
      texts: { name: 42 as unknown as string },
      images: { photo: 'data' },
      tables: { items: [{ item: 'A' }] },
    } as unknown as InputJSON
    const result = validateData(TEMPLATE, data)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_DATA_TYPE', field: 'name' }),
      ]),
    )
  })

  it('INVALID_DATA_TYPE for table field with non-array', () => {
    const data = {
      texts: { name: 'Alice' },
      images: { photo: 'data' },
      tables: { items: 'not-an-array' },
    } as unknown as InputJSON
    const result = validateData(TEMPLATE, data)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_DATA_TYPE', field: 'items' }),
      ]),
    )
  })

  it('INVALID_DATA_TYPE for image field with number', () => {
    const data = {
      texts: { name: 'Alice' },
      images: { photo: 12345 },
      tables: { items: [{ item: 'A' }] },
    } as unknown as InputJSON
    const result = validateData(TEMPLATE, data)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_DATA_TYPE', field: 'photo' }),
      ]),
    )
  })

  it('empty string for required field → MISSING_REQUIRED_FIELD', () => {
    const data: InputJSON = {
      texts: { name: '' },
      images: { photo: 'data' },
      tables: { items: [{ item: 'A' }] },
    }
    const result = validateData(TEMPLATE, data)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_REQUIRED_FIELD', field: 'name' }),
      ]),
    )
  })

  it('collects multiple errors at once', () => {
    const data: InputJSON = {
      texts: {},
      images: {},
      tables: { items: [{ item: 'A' }] },
    }
    const result = validateData(TEMPLATE, data)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(2)
    expect(result.errors.map((e) => e.code)).toContain('MISSING_REQUIRED_FIELD')
  })

  it('template with no fields is always valid', () => {
    const emptyTemplate = makeTemplate([])
    const data: InputJSON = { texts: {}, images: {}, tables: {} }
    expect(validateData(emptyTemplate, data)).toEqual({ valid: true, errors: [] })
  })

  it('accepts Buffer as valid image field value', () => {
    const data = {
      texts: { name: 'Alice' },
      images: { photo: Buffer.from('png-data') },
      tables: { items: [{ item: 'A' }] },
    } as unknown as InputJSON
    const result = validateData(TEMPLATE, data)
    expect(result.errors.filter((e) => e.field === 'photo')).toEqual([])
  })

  it('INVALID_DATA_TYPE for table field with plain object instead of array', () => {
    const data = {
      texts: { name: 'Alice' },
      images: { photo: 'data' },
      tables: { items: { item: 'not-array' } },
    } as unknown as InputJSON
    const result = validateData(TEMPLATE, data)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_DATA_TYPE', field: 'items' }),
      ]),
    )
  })

  it('INVALID_TABLE_ROW when dynamic table row has unknown column key', () => {
    const template = makeTemplate([dynTable('t', 'rows', true, ['a'])])
    const data: InputJSON = {
      texts: {},
      images: {},
      tables: { rows: [{ a: '1', b: 'bogus' }] },
    }
    const result = validateData(template, data)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_TABLE_ROW', field: 'rows' }),
      ]),
    )
  })

  it('static fields contribute no input-data requirements', () => {
    const staticOnly = makeTemplate([
      {
        id: 'title',
        type: 'text',
        label: 'Title',
        groupId: null,
        pageId: null,
        x: 0,
        y: 0,
        width: 200,
        height: 40,
        zIndex: 0,
        style: TEXT_STYLE,
        source: { mode: 'static', value: 'Baked-in Title' },
      },
    ])
    const result = validateData(staticOnly, { texts: {}, images: {}, tables: {} })
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('required dynamic field missing reports correct jsonKey', () => {
    const template = makeTemplate([dynText('greet', 'greeting', true)])
    const result = validateData(template, { texts: {}, images: {}, tables: {} })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toMatchObject({
      code: 'MISSING_REQUIRED_FIELD',
      field: 'greeting',
    })
  })
})
