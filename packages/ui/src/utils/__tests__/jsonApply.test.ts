/**
 * `diffJsonEdit` — the write-back half of the JSON sync contract.
 *
 * The JSON panel's structure is derived from the fields; only values are
 * editable. These tests pin the diff rules: changed values patch the
 * owning field(s), untouched values produce NO patches (so synthetic
 * fallbacks never get stamped into placeholders), unknown / read-only /
 * wrong-shaped keys are reported and ignored.
 */
import { describe, it, expect } from 'vitest'
import type {
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
  CellStyle,
} from '@template-goblin/types'
import { projectFieldsToJson, projectionToText } from '../jsonProjection.js'
import { diffJsonEdit } from '../jsonApply.js'

/* ---- helpers ---- */

const cell: CellStyle = {
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
}

const base = {
  groupId: null,
  pageId: null,
  label: '',
  x: 0,
  y: 0,
  width: 200,
  height: 30,
  zIndex: 0,
}

function textField(
  id: string,
  jsonKey: string,
  placeholder: string | null = null,
  required = true,
): FieldDefinition {
  return {
    ...base,
    id,
    type: 'text',
    source: { mode: 'dynamic', jsonKey, required, placeholder },
    style: {
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
    } satisfies TextFieldStyle,
  }
}

function imageField(id: string, jsonKey: string): FieldDefinition {
  return {
    ...base,
    id,
    type: 'image',
    source: { mode: 'dynamic', jsonKey, required: true, placeholder: null },
    style: { fit: 'contain' } satisfies ImageFieldStyle,
  }
}

function tableField(
  id: string,
  jsonKey: string,
  placeholder: Record<string, string>[] | null = null,
): FieldDefinition {
  return {
    ...base,
    id,
    type: 'table',
    source: { mode: 'dynamic', jsonKey, required: true, placeholder },
    style: {
      maxRows: 10,
      maxColumns: 3,
      multiPage: false,
      showHeader: true,
      headerStyle: cell,
      rowStyle: cell,
      oddRowStyle: null,
      evenRowStyle: null,
      cellStyle: { overflowMode: 'truncate' },
      columns: [
        { key: 'name', label: 'Name', width: 150, style: null, headerStyle: null },
        { key: 'grade', label: 'Grade', width: 80, style: null, headerStyle: null },
      ],
    } satisfies TableFieldStyle,
  }
}

/** The canonical projection text with one bucket value swapped. */
function editedText(
  fields: FieldDefinition[],
  bucket: 'texts' | 'tables' | 'images' | 'links',
  key: string,
  value: unknown,
): string {
  const projected = projectFieldsToJson(fields) as unknown as Record<
    string,
    Record<string, unknown>
  >
  projected[bucket]![key] = value
  return JSON.stringify(projected, null, 2)
}

/* ---- tests ---- */

describe('diffJsonEdit — parsing', () => {
  it('reports invalid JSON without patches', () => {
    const result = diffJsonEdit('{ not json', [textField('f1', 'name')])
    expect(result.ok).toBe(false)
    expect(result.error).toBeTruthy()
    expect(result.patches).toEqual([])
  })

  it('rejects non-object roots (arrays, scalars)', () => {
    for (const text of ['[]', '"hi"', '42', 'null']) {
      const result = diffJsonEdit(text, [textField('f1', 'name')])
      expect(result.ok).toBe(false)
    }
  })
})

describe('diffJsonEdit — the fixed-point invariant', () => {
  it('the unedited projection produces zero patches and zero warnings', () => {
    const fields = [
      textField('f1', 'name', 'Alice'),
      textField('f2', 'subtitle', null, false),
      imageField('f3', 'photo'),
      tableField('f4', 'marks', [{ name: 'Bob', grade: 'B' }]),
    ]
    const result = diffJsonEdit(projectionToText(projectFieldsToJson(fields)), fields)
    expect(result.ok).toBe(true)
    expect(result.patches).toEqual([])
    expect(result.unknownKeys).toEqual([])
    expect(result.readOnlyKeys).toEqual([])
    expect(result.invalidKeys).toEqual([])
  })

  it('synthetic fallbacks (jsonKey / column keys) never produce patches on round-trip', () => {
    const fields = [textField('f1', 'name'), tableField('f4', 'marks')]
    const result = diffJsonEdit(projectionToText(projectFieldsToJson(fields)), fields)
    expect(result.patches).toEqual([])
  })
})

describe('diffJsonEdit — text values', () => {
  it('a changed text value patches the owning field placeholder', () => {
    const fields = [textField('f1', 'name', 'Alice'), textField('f2', 'city', 'Pune')]
    const result = diffJsonEdit(editedText(fields, 'texts', 'name', 'Bob'), fields)
    expect(result.ok).toBe(true)
    expect(result.patches).toEqual([{ fieldId: 'f1', placeholder: 'Bob' }])
  })

  it('a key shared by several fields patches all of them', () => {
    const fields = [textField('f1', 'name', 'Alice'), textField('f2', 'name', 'Alice')]
    const result = diffJsonEdit(editedText(fields, 'texts', 'name', 'Bob'), fields)
    expect(result.patches).toEqual([
      { fieldId: 'f1', placeholder: 'Bob' },
      { fieldId: 'f2', placeholder: 'Bob' },
    ])
  })

  it('clearing a value to "" stores placeholder null (back to self-describing fallback)', () => {
    const fields = [textField('f1', 'name', 'Alice')]
    const result = diffJsonEdit(editedText(fields, 'texts', 'name', ''), fields)
    expect(result.patches).toEqual([{ fieldId: 'f1', placeholder: null }])
  })

  it('an unknown text key is reported, not patched', () => {
    const fields = [textField('f1', 'name')]
    const projected = projectFieldsToJson(fields) as unknown as {
      texts: Record<string, unknown>
    }
    projected.texts.ghost = 'boo'
    const result = diffJsonEdit(JSON.stringify(projected), fields)
    expect(result.unknownKeys).toEqual(['texts.ghost'])
    expect(result.patches).toEqual([])
  })

  it('a non-string text value is reported as invalid', () => {
    const fields = [textField('f1', 'name')]
    const result = diffJsonEdit(editedText(fields, 'texts', 'name', 42), fields)
    expect(result.invalidKeys).toEqual(['texts.name'])
    expect(result.patches).toEqual([])
  })

  it('keys missing from the edited JSON are left untouched', () => {
    const fields = [textField('f1', 'name', 'Alice')]
    const result = diffJsonEdit('{"texts": {}}', fields)
    expect(result.ok).toBe(true)
    expect(result.patches).toEqual([])
  })
})

describe('diffJsonEdit — table values', () => {
  it('edited rows patch the placeholder with the full normalized array', () => {
    const fields = [tableField('f4', 'marks', [{ name: 'Bob', grade: 'B' }])]
    const rows = [
      { name: 'Alice', grade: 'A+' },
      { name: 'Carol', grade: 'C' },
    ]
    const result = diffJsonEdit(editedText(fields, 'tables', 'marks', rows), fields)
    expect(result.patches).toEqual([{ fieldId: 'f4', placeholder: rows }])
  })

  it('numbers and booleans in cells are coerced to strings', () => {
    const fields = [tableField('f4', 'marks', [{ name: 'Bob', grade: 'B' }])]
    const result = diffJsonEdit(
      editedText(fields, 'tables', 'marks', [{ name: 'Alice', grade: 91 }]),
      fields,
    )
    expect(result.patches).toEqual([
      { fieldId: 'f4', placeholder: [{ name: 'Alice', grade: '91' }] },
    ])
  })

  it('an emptied row array stores placeholder null', () => {
    const fields = [tableField('f4', 'marks', [{ name: 'Bob', grade: 'B' }])]
    const result = diffJsonEdit(editedText(fields, 'tables', 'marks', []), fields)
    expect(result.patches).toEqual([{ fieldId: 'f4', placeholder: null }])
  })

  it('a non-array table value is reported as invalid', () => {
    const fields = [tableField('f4', 'marks')]
    const result = diffJsonEdit(editedText(fields, 'tables', 'marks', { name: 'x' }), fields)
    expect(result.invalidKeys).toEqual(['tables.marks'])
    expect(result.patches).toEqual([])
  })
})

describe('diffJsonEdit — read-only buckets', () => {
  it('a changed image value is reported read-only, never patched', () => {
    const fields = [imageField('f3', 'photo')]
    const result = diffJsonEdit(editedText(fields, 'images', 'photo', 'data:image/png;...'), fields)
    expect(result.readOnlyKeys).toEqual(['images.photo'])
    expect(result.patches).toEqual([])
  })

  it('an unchanged image value reports nothing', () => {
    const fields = [imageField('f3', 'photo')]
    const result = diffJsonEdit(projectionToText(projectFieldsToJson(fields)), fields)
    expect(result.readOnlyKeys).toEqual([])
  })

  it('a changed link value is reported read-only', () => {
    const f = textField('f1', 'name')
    f.hyperlink = { mode: 'dynamic', jsonKey: 'profile_url' }
    const result = diffJsonEdit(editedText([f], 'links', 'profile_url', 'https://other.com'), [f])
    expect(result.readOnlyKeys).toEqual(['links.profile_url'])
    expect(result.patches).toEqual([])
  })

  it('unknown image / link keys are reported as unknown', () => {
    const fields = [imageField('f3', 'photo')]
    const projected = projectFieldsToJson(fields) as unknown as {
      images: Record<string, unknown>
      links: Record<string, unknown>
    }
    projected.images.ghost = 'x'
    projected.links.ghost2 = 'https://x.com'
    const result = diffJsonEdit(JSON.stringify(projected), fields)
    expect(result.unknownKeys).toEqual(expect.arrayContaining(['images.ghost', 'links.ghost2']))
  })
})

describe('diffJsonEdit — structure', () => {
  it('unknown top-level buckets are reported', () => {
    const result = diffJsonEdit('{"texts": {}, "extras": {"a": 1}}', [textField('f1', 'name')])
    expect(result.unknownKeys).toEqual(['extras'])
  })

  it('band fields are diffed like body fields (#61)', () => {
    const headerField = textField('h1', 'title', 'Old title')
    const fields: FieldDefinition[] = []
    const bands = { header: [headerField] }
    const projected = projectFieldsToJson(fields, bands) as unknown as {
      texts: Record<string, unknown>
    }
    projected.texts.title = 'New title'
    const result = diffJsonEdit(JSON.stringify(projected), fields, bands)
    expect(result.patches).toEqual([{ fieldId: 'h1', placeholder: 'New title' }])
  })
})

describe('diffJsonEdit — sparse table placeholders are not polluted by fallbacks', () => {
  it('editing one cell does not stamp the projected column-key fallback into untouched cells', () => {
    // Placeholder row has only `name`; the projection fills `grade` with
    // the column-key fallback "grade". Editing just `name` must NOT write
    // that literal fallback into the placeholder.
    const fields = [tableField('f4', 'marks', [{ name: 'Widget' }])]
    const result = diffJsonEdit(editedText(fields, 'tables', 'marks', [
      { name: 'Gadget', grade: 'grade' },
    ]), fields)
    expect(result.patches).toEqual([{ fieldId: 'f4', placeholder: [{ name: 'Gadget' }] }])
  })

  it('an actually-edited fallback cell IS written', () => {
    const fields = [tableField('f4', 'marks', [{ name: 'Widget' }])]
    const result = diffJsonEdit(editedText(fields, 'tables', 'marks', [
      { name: 'Widget', grade: 'A+' },
    ]), fields)
    expect(result.patches).toEqual([
      { fieldId: 'f4', placeholder: [{ name: 'Widget', grade: 'A+' }] },
    ])
  })
})
