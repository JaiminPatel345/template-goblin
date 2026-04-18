/**
 * QA coverage — `validateData` additional narrowing scenarios (spec §5.2).
 *
 * Focus: static fields contribute nothing to the input contract, optional
 * dynamic fields tolerate missing values, and image-value type narrowing.
 */

import type {
  FieldDefinition,
  ImageFieldStyle,
  InputJSON,
  LoadedTemplate,
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

function template(fields: FieldDefinition[]): LoadedTemplate {
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

describe('validateData — additional edges', () => {
  it('template with only a static text field is VALID with an empty InputJSON', () => {
    const t = template([
      {
        id: 'title',
        type: 'text',
        label: 'Title',
        groupId: null,
        pageId: null,
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        zIndex: 0,
        style: TEXT_STYLE,
        source: { mode: 'static', value: 'Hello' },
      },
    ])
    const data: InputJSON = { texts: {}, images: {}, tables: {} }
    expect(validateData(t, data)).toEqual({ valid: true, errors: [] })
  })

  it('optional dynamic text field missing from input produces no error', () => {
    const t = template([
      {
        id: 'sub',
        type: 'text',
        label: 'subtitle',
        groupId: null,
        pageId: null,
        x: 0,
        y: 0,
        width: 100,
        height: 20,
        zIndex: 0,
        style: TEXT_STYLE,
        source: { mode: 'dynamic', jsonKey: 'subtitle', required: false, placeholder: null },
      },
    ])
    const data: InputJSON = { texts: {}, images: {}, tables: {} }
    expect(validateData(t, data)).toEqual({ valid: true, errors: [] })
  })

  it('required dynamic image field with a number (non-Buffer, non-string) → INVALID_DATA_TYPE', () => {
    const t = template([
      {
        id: 'pic',
        type: 'image',
        label: 'pic',
        groupId: null,
        pageId: null,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        zIndex: 0,
        style: IMAGE_STYLE,
        source: { mode: 'dynamic', jsonKey: 'pic', required: true, placeholder: null },
      },
    ])
    const data = {
      texts: {},
      images: { pic: 42 },
      tables: {},
    } as unknown as InputJSON
    const result = validateData(t, data)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_DATA_TYPE', field: 'pic' }),
      ]),
    )
  })

  it('required dynamic image field with a boolean → INVALID_DATA_TYPE', () => {
    const t = template([
      {
        id: 'pic',
        type: 'image',
        label: 'pic',
        groupId: null,
        pageId: null,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        zIndex: 0,
        style: IMAGE_STYLE,
        source: { mode: 'dynamic', jsonKey: 'pic', required: true, placeholder: null },
      },
    ])
    const data = {
      texts: {},
      images: { pic: true },
      tables: {},
    } as unknown as InputJSON
    const result = validateData(t, data)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_DATA_TYPE', field: 'pic' }),
      ]),
    )
  })

  it('required dynamic image field with an object (not Buffer) → INVALID_DATA_TYPE', () => {
    const t = template([
      {
        id: 'pic',
        type: 'image',
        label: 'pic',
        groupId: null,
        pageId: null,
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        zIndex: 0,
        style: IMAGE_STYLE,
        source: { mode: 'dynamic', jsonKey: 'pic', required: true, placeholder: null },
      },
    ])
    const data = {
      texts: {},
      images: { pic: { not: 'a-buffer' } },
      tables: {},
    } as unknown as InputJSON
    const result = validateData(t, data)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'INVALID_DATA_TYPE', field: 'pic' }),
      ]),
    )
  })
})
