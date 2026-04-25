/**
 * Pin the matrix from `fieldOptionVisibility.ts` cell-by-cell. Every helper
 * is checked across every (field-type × mode) combination so a future
 * refactor that flips a cell shows up loudly.
 */
import { describe, it, expect } from 'vitest'
import type {
  FieldDefinition,
  TextField,
  ImageField,
  TableField,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
} from '@template-goblin/types'
import {
  showValueInput,
  showDynamicSourceInputs,
  showFontOptions,
  showAutoFitFont,
  showMinFontSize,
  showImageFitMode,
  showModeToggle,
  showOverflowMode,
} from '../fieldOptionVisibility'

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
  color: '#000',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 2,
  overflowMode: 'truncate',
  snapToGrid: false,
}
const IMAGE_STYLE: ImageFieldStyle = { fit: 'contain' }
const TABLE_STYLE: TableFieldStyle = {
  maxRows: 5,
  maxColumns: 3,
  multiPage: false,
  showHeader: true,
  headerStyle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'bold',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    backgroundColor: '#eee',
    borderWidth: 0,
    borderColor: '#ccc',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    align: 'left',
    verticalAlign: 'top',
  },
  rowStyle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    backgroundColor: '#fff',
    borderWidth: 0,
    borderColor: '#ccc',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
    align: 'left',
    verticalAlign: 'top',
  },
  oddRowStyle: null,
  evenRowStyle: null,
  cellStyle: { overflowMode: 'truncate' },
  columns: [],
}

const BASE = {
  id: 'f',
  label: 'f',
  groupId: null,
  pageId: null,
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  zIndex: 0,
}

function textField(mode: 'static' | 'dynamic'): TextField {
  return {
    ...BASE,
    type: 'text',
    source:
      mode === 'static'
        ? { mode, value: 'hi' }
        : { mode, jsonKey: 't', required: false, placeholder: null },
    style: TEXT_STYLE,
  }
}
function imageField(mode: 'static' | 'dynamic'): ImageField {
  return {
    ...BASE,
    type: 'image',
    source:
      mode === 'static'
        ? { mode, value: { filename: 'static-photo.png' } }
        : { mode, jsonKey: 'i', required: false, placeholder: null },
    style: IMAGE_STYLE,
  }
}
function tableField(mode: 'static' | 'dynamic'): TableField {
  return {
    ...BASE,
    type: 'table',
    source:
      mode === 'static'
        ? { mode, value: [] }
        : { mode, jsonKey: 't', required: false, placeholder: null },
    style: TABLE_STYLE,
  }
}

const ALL: Array<[string, FieldDefinition]> = [
  ['static text', textField('static')],
  ['dynamic text', textField('dynamic')],
  ['static image', imageField('static')],
  ['dynamic image', imageField('dynamic')],
  ['static table', tableField('static')],
  ['dynamic table', tableField('dynamic')],
]

describe('fieldOptionVisibility — matrix per case', () => {
  for (const [label, field] of ALL) {
    const isStatic = field.source.mode === 'static'
    const isDynamic = field.source.mode === 'dynamic'
    const isText = field.type === 'text'
    const isImage = field.type === 'image'
    const isTextOrTable = field.type === 'text' || field.type === 'table'

    describe(label, () => {
      it(`showModeToggle = true`, () => {
        expect(showModeToggle(field)).toBe(true)
      })
      it(`showValueInput = ${isStatic}`, () => {
        expect(showValueInput(field)).toBe(isStatic)
      })
      it(`showDynamicSourceInputs = ${isDynamic}`, () => {
        expect(showDynamicSourceInputs(field)).toBe(isDynamic)
      })
      it(`showFontOptions = ${isTextOrTable}`, () => {
        expect(showFontOptions(field)).toBe(isTextOrTable)
      })
      it(`showAutoFitFont = ${isText && isDynamic}`, () => {
        expect(showAutoFitFont(field)).toBe(isText && isDynamic)
      })
      it(`showImageFitMode = ${isImage}`, () => {
        expect(showImageFitMode(field)).toBe(isImage)
      })
      // Overflow Mode: tables always; text only when dynamic; image never.
      const expectedOverflow = field.type === 'table' || (field.type === 'text' && isDynamic)
      it(`showOverflowMode = ${expectedOverflow}`, () => {
        expect(showOverflowMode(field)).toBe(expectedOverflow)
      })
    })
  }

  it('showMinFontSize is gated by both auto-fit and the dynamic flag passed by the caller', () => {
    const dynText = textField('dynamic')
    expect(showMinFontSize(dynText, true)).toBe(true)
    expect(showMinFontSize(dynText, false)).toBe(false)

    const staticText = textField('static')
    expect(showMinFontSize(staticText, true)).toBe(false)

    const dynImage = imageField('dynamic')
    expect(showMinFontSize(dynImage, true)).toBe(false)
  })
})
