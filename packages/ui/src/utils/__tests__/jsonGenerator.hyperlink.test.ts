/**
 * UI-side coverage for the JSON-Preview generator's hyperlink branch (#87).
 *
 * Dynamic hyperlinks contribute to the new top-level `links` bucket so
 * URLs are visually distinct from rendered text. These tests lock the
 * contract: the bucket is always present, dynamic hyperlinks land
 * there, statics never leak in, duplicate keys collapse, and a field
 * carrying both a source jsonKey and a hyperlink jsonKey populates
 * both buckets without crossing them over.
 */
import { describe, it, expect } from 'vitest'
import { generateExampleJson } from '../jsonGenerator.js'
import type {
  FieldDefinition,
  Hyperlink,
  TextFieldStyle,
  ImageFieldStyle,
} from '@template-goblin/types'

const TEXT_STYLE: TextFieldStyle = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontSizeMin: 8,
  lineHeight: 1.2,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 1,
  overflowMode: 'truncate',
  snapToGrid: false,
}

const IMAGE_STYLE: ImageFieldStyle = { fit: 'contain' }

function dynText(id: string, jsonKey: string, hyperlink?: Hyperlink): FieldDefinition {
  return {
    id,
    type: 'text',
    groupId: null,
    pageId: null,
    label: id,
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    zIndex: 0,
    style: TEXT_STYLE,
    source: { mode: 'dynamic', jsonKey, required: false, placeholder: null },
    ...(hyperlink ? { hyperlink } : {}),
  }
}

function staticText(id: string, value: string, hyperlink?: Hyperlink): FieldDefinition {
  return {
    id,
    type: 'text',
    groupId: null,
    pageId: null,
    label: id,
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    zIndex: 0,
    style: TEXT_STYLE,
    source: { mode: 'static', value },
    ...(hyperlink ? { hyperlink } : {}),
  }
}

function staticImage(id: string, hyperlink?: Hyperlink): FieldDefinition {
  return {
    id,
    type: 'image',
    groupId: null,
    pageId: null,
    label: id,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
    style: IMAGE_STYLE,
    source: { mode: 'static', value: { filename: 'pic.png' } },
    ...(hyperlink ? { hyperlink } : {}),
  }
}

describe('generateExampleJson — hyperlink (#87)', () => {
  it('always emits an empty links bucket, even with no fields', () => {
    const result = generateExampleJson([], 'default', 5)
    expect(result.links).toEqual({})
  })

  it('a static-source field with a dynamic hyperlink puts ONLY the URL key in links', () => {
    const field = staticText('t1', 'Hello', {
      mode: 'dynamic',
      jsonKey: 'profile_url',
    })
    const result = generateExampleJson([field], 'default', 5)
    // Static source = no key in `texts`. Hyperlink = key in `links`.
    expect(result.texts).toEqual({})
    expect(result.links).toEqual({ profile_url: 'https://example.com' })
  })

  it('a dynamic-source field with a dynamic hyperlink populates both buckets independently', () => {
    const field = dynText('t1', 'name', { mode: 'dynamic', jsonKey: 'profile_url' })
    const result = generateExampleJson([field], 'default', 5)
    expect(result.texts).toHaveProperty('name')
    expect(result.links).toEqual({ profile_url: 'https://example.com' })
  })

  it('a STATIC hyperlink contributes nothing to links (URL is baked into the manifest)', () => {
    const field = staticText('t1', 'Hi', { mode: 'static', url: 'https://baked.example.com' })
    const result = generateExampleJson([field], 'default', 5)
    expect(result.links).toEqual({})
  })

  it('multiple fields with the same dynamic hyperlink jsonKey collapse to one entry', () => {
    const fields: FieldDefinition[] = [
      dynText('t1', 'a', { mode: 'dynamic', jsonKey: 'shared' }),
      dynText('t2', 'b', { mode: 'dynamic', jsonKey: 'shared' }),
      staticImage('img', { mode: 'dynamic', jsonKey: 'shared' }),
    ]
    const result = generateExampleJson(fields, 'default', 5)
    expect(Object.keys(result.links)).toEqual(['shared'])
  })

  it('mixed static + dynamic hyperlinks: only the dynamic one shows up in links', () => {
    const fields: FieldDefinition[] = [
      dynText('t1', 'a', { mode: 'static', url: 'https://baked.example.com' }),
      dynText('t2', 'b', { mode: 'dynamic', jsonKey: 'dynamic_url' }),
    ]
    const result = generateExampleJson(fields, 'default', 5)
    expect(result.links).toEqual({ dynamic_url: 'https://example.com' })
  })

  it('a hyperlink with an empty jsonKey is ignored', () => {
    const field = dynText('t1', 'a', { mode: 'dynamic', jsonKey: '' })
    const result = generateExampleJson([field], 'default', 5)
    expect(result.links).toEqual({})
  })

  it('hyperlink jsonKey identical to the source jsonKey: links wins its own bucket; texts is unaffected', () => {
    // Designer writes both `name` (text source) and `name` (hyperlink
    // key). Each lives in its own bucket — no clash.
    const field = dynText('t1', 'name', { mode: 'dynamic', jsonKey: 'name' })
    const result = generateExampleJson([field], 'default', 5)
    expect(result.texts).toHaveProperty('name')
    expect(result.links).toHaveProperty('name')
    // Different default values: text gets the synthetic 'A' / '' /
    // placeholder, link gets the example URL.
    expect(result.links.name).toBe('https://example.com')
  })

  it('max mode: links bucket still emits the example URL (no special max value)', () => {
    const field = dynText('t1', 'a', { mode: 'dynamic', jsonKey: 'profile_url' })
    const result = generateExampleJson([field], 'max', 5)
    expect(result.links).toEqual({ profile_url: 'https://example.com' })
  })

  it('a field with no hyperlink contributes nothing to links', () => {
    const field = dynText('t1', 'a')
    const result = generateExampleJson([field], 'default', 5)
    expect(result.links).toEqual({})
  })

  it('all three field types can carry a dynamic hyperlink', () => {
    const fields: FieldDefinition[] = [
      dynText('t1', 'a', { mode: 'dynamic', jsonKey: 'text_link' }),
      staticImage('img', { mode: 'dynamic', jsonKey: 'image_link' }),
      {
        id: 'tbl',
        type: 'table',
        groupId: null,
        pageId: null,
        label: 'tbl',
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        zIndex: 0,
        style: {
          maxRows: 5,
          maxColumns: 2,
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
            borderWidth: 1,
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
            borderWidth: 1,
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
          columns: [{ key: 'a', label: 'A', width: 100, style: null, headerStyle: null }],
        },
        source: { mode: 'static', value: [{ a: 'x' }] },
        hyperlink: { mode: 'dynamic', jsonKey: 'table_link' },
      },
    ]
    const result = generateExampleJson(fields, 'default', 5)
    expect(result.links).toEqual({
      text_link: 'https://example.com',
      image_link: 'https://example.com',
      table_link: 'https://example.com',
    })
  })
})
