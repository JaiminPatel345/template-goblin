import type {
  ImageField,
  ImageFieldStyle,
  InputJSON,
  TableField,
  TableFieldStyle,
  TextField,
  TextFieldStyle,
} from '@template-goblin/types'
import { resolveValue } from '../src/utils/resolveValue.js'

const stubTextStyle = {} as TextFieldStyle
const stubImageStyle: ImageFieldStyle = { fit: 'contain' }
const stubTableStyle = { columns: [] } as unknown as TableFieldStyle

function textField(source: TextField['source']): TextField {
  return {
    id: 't',
    type: 'text',
    label: 'T',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    zIndex: 0,
    style: stubTextStyle,
    source,
  }
}

function imageField(source: ImageField['source']): ImageField {
  return {
    id: 'i',
    type: 'image',
    label: 'I',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    zIndex: 0,
    style: stubImageStyle,
    source,
  }
}

function tableField(source: TableField['source']): TableField {
  return {
    id: 'tb',
    type: 'table',
    label: 'Tab',
    groupId: null,
    pageId: null,
    x: 0,
    y: 0,
    width: 400,
    height: 200,
    zIndex: 0,
    style: stubTableStyle,
    source,
  }
}

function emptyInput(): InputJSON {
  return { texts: {}, images: {}, tables: {} }
}

describe('resolveValue', () => {
  test('returns static value for static text field', () => {
    expect(resolveValue(textField({ mode: 'static', value: 'Hello' }), emptyInput())).toBe('Hello')
  })

  test('returns dynamic value for dynamic text field when present in input', () => {
    const field = textField({
      mode: 'dynamic',
      jsonKey: 'greeting',
      required: true,
      placeholder: null,
    })
    const input: InputJSON = { texts: { greeting: 'Hi' }, images: {}, tables: {} }
    expect(resolveValue(field, input)).toBe('Hi')
  })

  test('returns undefined for dynamic text field when not in input', () => {
    const field = textField({
      mode: 'dynamic',
      jsonKey: 'missing',
      required: false,
      placeholder: null,
    })
    expect(resolveValue(field, emptyInput())).toBeUndefined()
  })

  test('resolves dynamic image field from images bucket', () => {
    const field = imageField({
      mode: 'dynamic',
      jsonKey: 'photo',
      required: true,
      placeholder: null,
    })
    const buf = Buffer.from([1, 2, 3])
    const input: InputJSON = { texts: {}, images: { photo: buf }, tables: {} }
    expect(resolveValue(field, input)).toBe(buf)
  })

  test('static image returns the filename wrapper', () => {
    const field = imageField({ mode: 'static', value: { filename: 'logo.png' } })
    expect(resolveValue(field, emptyInput())).toEqual({ filename: 'logo.png' })
  })

  test('resolves dynamic table from tables bucket', () => {
    const field = tableField({
      mode: 'dynamic',
      jsonKey: 'rows',
      required: true,
      placeholder: null,
    })
    const rows = [{ a: '1' }, { a: '2' }]
    const input: InputJSON = { texts: {}, images: {}, tables: { rows } }
    expect(resolveValue(field, input)).toBe(rows)
  })

  test('static table returns the baked-in rows', () => {
    const rows = [{ a: 'x' }]
    const field = tableField({ mode: 'static', value: rows })
    expect(resolveValue(field, emptyInput())).toBe(rows)
  })

  test('never consults placeholder, even for optional dynamic fields', () => {
    const field = textField({
      mode: 'dynamic',
      jsonKey: 'name',
      required: false,
      placeholder: 'preview',
    })
    expect(resolveValue(field, emptyInput())).toBeUndefined()
  })
})
