import {
  TemplateGoblinError,
  type CellStyle,
  type FieldDefinition,
  type ImageField,
  type TableField,
  type TableFieldStyle,
  type TemplateManifest,
  type TextField,
  type TextFieldStyle,
} from '@template-goblin/types'
import { validateManifest } from '../src/validateManifest.js'

const stubTextStyle = {} as TextFieldStyle
const stubCellStyle = {} as CellStyle

function stubTableStyle(columnKeys: string[]): TableFieldStyle {
  return {
    maxRows: 10,
    maxColumns: 10,
    multiPage: false,
    showHeader: true,
    headerStyle: stubCellStyle,
    rowStyle: stubCellStyle,
    oddRowStyle: null,
    evenRowStyle: null,
    cellStyle: { overflowMode: 'truncate' },
    columns: columnKeys.map((key) => ({
      key,
      label: key,
      width: 50,
      style: null,
      headerStyle: null,
    })),
  }
}

function makeValidManifest(fields: FieldDefinition[] = []): TemplateManifest {
  return {
    version: '2.0',
    meta: {
      name: 't',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 50,
      createdAt: '2026-04-18T00:00:00Z',
      updatedAt: '2026-04-18T00:00:00Z',
    },
    pages: [
      {
        id: 'p0',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#FFFFFF',
        backgroundFilename: null,
      },
    ],
    fonts: [],
    groups: [],
    fields,
  }
}

function textField(source: TextField['source'], id = 't'): TextField {
  return {
    id,
    type: 'text',
    label: 'L',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    zIndex: 0,
    style: stubTextStyle,
    source,
  }
}

function imageField(source: ImageField['source'], id = 'i'): ImageField {
  return {
    id,
    type: 'image',
    label: 'L',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    zIndex: 0,
    style: { fit: 'contain' },
    source,
  }
}

function tableField(
  source: TableField['source'],
  columnKeys: string[] = ['a'],
  id = 'tb',
): TableField {
  return {
    id,
    type: 'table',
    label: 'L',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 200,
    height: 100,
    zIndex: 0,
    style: stubTableStyle(columnKeys),
    source,
  }
}

function expectCode(fn: () => void, code: string): void {
  try {
    fn()
    throw new Error(`expected throw with code ${code}`)
  } catch (e) {
    expect(e).toBeInstanceOf(TemplateGoblinError)
    expect((e as TemplateGoblinError).code).toBe(code)
  }
}

describe('validateManifest', () => {
  test('valid manifest with no fields passes', () => {
    expect(() => validateManifest(makeValidManifest())).not.toThrow()
  })

  test('valid manifest with mixed static and dynamic fields passes', () => {
    const m = makeValidManifest([
      textField({ mode: 'static', value: 'Title' }, 'a'),
      textField({ mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null }, 'b'),
      imageField({ mode: 'static', value: { filename: 'logo.png' } }, 'c'),
      tableField({ mode: 'static', value: [{ a: '1' }] }, ['a'], 'd'),
    ])
    expect(() => validateManifest(m)).not.toThrow()
  })

  test('INVALID_SOURCE_MODE when source missing', () => {
    const m = makeValidManifest([
      {
        ...textField({ mode: 'static', value: 'x' }),
        source: undefined as unknown as TextField['source'],
      },
    ])
    expectCode(() => validateManifest(m), 'INVALID_SOURCE_MODE')
  })

  test('INVALID_SOURCE_MODE when mode is not static/dynamic', () => {
    const m = makeValidManifest([
      textField({ mode: 'unknown' as 'static', value: 'x' } as unknown as TextField['source']),
    ])
    expectCode(() => validateManifest(m), 'INVALID_SOURCE_MODE')
  })

  test('INVALID_STATIC_VALUE when static text value is not a string', () => {
    const m = makeValidManifest([textField({ mode: 'static', value: 42 as unknown as string })])
    expectCode(() => validateManifest(m), 'INVALID_STATIC_VALUE')
  })

  test('INVALID_DYNAMIC_SOURCE when jsonKey is empty', () => {
    const m = makeValidManifest([
      textField({ mode: 'dynamic', jsonKey: '', required: true, placeholder: null }),
    ])
    expectCode(() => validateManifest(m), 'INVALID_DYNAMIC_SOURCE')
  })

  test('INVALID_DYNAMIC_SOURCE when jsonKey has invalid characters', () => {
    const m = makeValidManifest([
      textField({ mode: 'dynamic', jsonKey: 'has space', required: true, placeholder: null }),
    ])
    expectCode(() => validateManifest(m), 'INVALID_DYNAMIC_SOURCE')
  })

  test('INVALID_DYNAMIC_SOURCE when required is not boolean', () => {
    const m = makeValidManifest([
      textField({
        mode: 'dynamic',
        jsonKey: 'x',
        required: 'yes' as unknown as boolean,
        placeholder: null,
      }),
    ])
    expectCode(() => validateManifest(m), 'INVALID_DYNAMIC_SOURCE')
  })

  test('INVALID_DYNAMIC_SOURCE when text placeholder is not string/null', () => {
    const m = makeValidManifest([
      textField({
        mode: 'dynamic',
        jsonKey: 'x',
        required: false,
        placeholder: 42 as unknown as string,
      }),
    ])
    expectCode(() => validateManifest(m), 'INVALID_DYNAMIC_SOURCE')
  })

  test('DUPLICATE_JSON_KEY across same-type dynamic fields', () => {
    const m = makeValidManifest([
      textField({ mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null }, 'a'),
      textField({ mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null }, 'b'),
    ])
    expectCode(() => validateManifest(m), 'DUPLICATE_JSON_KEY')
  })

  test('same jsonKey across different types is allowed (text.logo vs image.logo)', () => {
    const m = makeValidManifest([
      textField({ mode: 'dynamic', jsonKey: 'logo', required: true, placeholder: null }, 'a'),
      imageField({ mode: 'dynamic', jsonKey: 'logo', required: true, placeholder: null }, 'b'),
    ])
    expect(() => validateManifest(m)).not.toThrow()
  })

  test('INVALID_STATIC_VALUE when static image missing filename', () => {
    const m = makeValidManifest([
      imageField({ mode: 'static', value: {} as unknown as { filename: string } }),
    ])
    expectCode(() => validateManifest(m), 'INVALID_STATIC_VALUE')
  })

  test('INVALID_DYNAMIC_SOURCE when image placeholder not { filename } or null', () => {
    const m = makeValidManifest([
      imageField({
        mode: 'dynamic',
        jsonKey: 'p',
        required: false,
        placeholder: 'oops' as unknown as { filename: string },
      }),
    ])
    expectCode(() => validateManifest(m), 'INVALID_DYNAMIC_SOURCE')
  })

  test('INVALID_STATIC_VALUE when static table value is not an array', () => {
    const m = makeValidManifest([
      tableField({ mode: 'static', value: 'not an array' as unknown as [] }, ['a']),
    ])
    expectCode(() => validateManifest(m), 'INVALID_STATIC_VALUE')
  })

  test('INVALID_TABLE_ROW when static table row has unknown key', () => {
    const m = makeValidManifest([
      tableField({ mode: 'static', value: [{ a: '1', b: 'bad' }] }, ['a']),
    ])
    expectCode(() => validateManifest(m), 'INVALID_TABLE_ROW')
  })

  test('INVALID_TABLE_ROW when static table row value is not a string', () => {
    const m = makeValidManifest([
      tableField({ mode: 'static', value: [{ a: 42 as unknown as string }] }, ['a']),
    ])
    expectCode(() => validateManifest(m), 'INVALID_TABLE_ROW')
  })

  test('INVALID_TABLE_ROW when table placeholder row has unknown key', () => {
    const m = makeValidManifest([
      tableField(
        {
          mode: 'dynamic',
          jsonKey: 'rows',
          required: false,
          placeholder: [{ a: '1', zzz: 'bad' }],
        },
        ['a'],
      ),
    ])
    expectCode(() => validateManifest(m), 'INVALID_TABLE_ROW')
  })
})
