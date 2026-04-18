/**
 * QA coverage — spec §5 validation edge cases.
 *
 * Covers the additional validation scenarios called out in the QA plan:
 *   - INVALID_DYNAMIC_SOURCE when an image placeholder object is missing
 *     `filename`.
 *   - INVALID_TABLE_ROW when a dynamic table placeholder includes an unknown
 *     column key (already covered, kept here for completeness).
 *   - Static value edge cases: empty string (VALID), empty array (VALID),
 *     null text value (INVALID).
 *   - Case-sensitive jsonKey uniqueness (`Name` vs `name` must NOT collide
 *     — the regex `^[A-Za-z_][A-Za-z0-9_]*$` treats them as distinct).
 *   - INVALID_SOURCE_MODE when `source` is an array.
 */

import {
  TemplateGoblinError,
  type FieldDefinition,
  type ImageField,
  type TableField,
  type TableFieldStyle,
  type TemplateManifest,
  type TextField,
  type TextFieldStyle,
  type CellStyle,
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

function baseManifest(fields: FieldDefinition[] = []): TemplateManifest {
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

function txt(source: TextField['source'], id = 't'): TextField {
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

function img(source: ImageField['source'], id = 'i'): ImageField {
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

function tbl(source: TableField['source'], columnKeys = ['a'], id = 'tb'): TableField {
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

function assertCode(fn: () => void, code: string): void {
  try {
    fn()
    throw new Error(`expected TemplateGoblinError(${code})`)
  } catch (e) {
    expect(e).toBeInstanceOf(TemplateGoblinError)
    expect((e as TemplateGoblinError).code).toBe(code)
  }
}

describe('validateManifest — spec §5 edge cases', () => {
  /* ---------------- image placeholder without filename ---------------- */
  it('INVALID_DYNAMIC_SOURCE when image placeholder object lacks filename', () => {
    const m = baseManifest([
      img({
        mode: 'dynamic',
        jsonKey: 'pic',
        required: false,
        placeholder: {} as unknown as { filename: string },
      }),
    ])
    assertCode(() => validateManifest(m), 'INVALID_DYNAMIC_SOURCE')
  })

  /* ---------------- table placeholder unknown column key --------------- */
  it('INVALID_TABLE_ROW when table placeholder array has unknown column key', () => {
    const m = baseManifest([
      tbl(
        {
          mode: 'dynamic',
          jsonKey: 'rows',
          required: false,
          placeholder: [{ a: '1', unknown_col: 'bad' }],
        },
        ['a'],
      ),
    ])
    assertCode(() => validateManifest(m), 'INVALID_TABLE_ROW')
  })

  /* ---------------- static value edge cases ---------------------------- */
  it('empty string is a VALID static text value', () => {
    const m = baseManifest([txt({ mode: 'static', value: '' })])
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('empty array is a VALID static table value', () => {
    const m = baseManifest([tbl({ mode: 'static', value: [] }, ['a'])])
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('null is NOT a valid static text value', () => {
    const m = baseManifest([txt({ mode: 'static', value: null as unknown as string })])
    assertCode(() => validateManifest(m), 'INVALID_STATIC_VALUE')
  })

  it('undefined is NOT a valid static text value', () => {
    const m = baseManifest([txt({ mode: 'static', value: undefined as unknown as string })])
    assertCode(() => validateManifest(m), 'INVALID_STATIC_VALUE')
  })

  /* ---------------- casing-sensitive jsonKey uniqueness --------------- */
  it('case-different jsonKeys (Name vs name) do NOT collide', () => {
    // The spec regex ^[A-Za-z_][A-Za-z0-9_]*$ treats these as distinct strings.
    const m = baseManifest([
      txt({ mode: 'dynamic', jsonKey: 'Name', required: true, placeholder: null }, 'a'),
      txt({ mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null }, 'b'),
    ])
    expect(() => validateManifest(m)).not.toThrow()
  })

  it('exact-match jsonKeys DO collide', () => {
    const m = baseManifest([
      txt({ mode: 'dynamic', jsonKey: 'Name', required: true, placeholder: null }, 'a'),
      txt({ mode: 'dynamic', jsonKey: 'Name', required: true, placeholder: null }, 'b'),
    ])
    assertCode(() => validateManifest(m), 'DUPLICATE_JSON_KEY')
  })

  /* ---------------- source is an array ---------------------------------- */
  it('INVALID_SOURCE_MODE when source is an array', () => {
    const m = baseManifest([txt([] as unknown as TextField['source'])])
    assertCode(() => validateManifest(m), 'INVALID_SOURCE_MODE')
  })

  it('INVALID_SOURCE_MODE when source is null', () => {
    const m = baseManifest([txt(null as unknown as TextField['source'])])
    assertCode(() => validateManifest(m), 'INVALID_SOURCE_MODE')
  })

  it('INVALID_SOURCE_MODE when source is a string', () => {
    const m = baseManifest([txt('static' as unknown as TextField['source'])])
    assertCode(() => validateManifest(m), 'INVALID_SOURCE_MODE')
  })
})
