import { describe, it, expect } from 'vitest'
import {
  projectFieldsToJson,
  IMAGE_PLACEHOLDER_SENTINEL,
  isPlaceholderImageSentinel,
} from '../jsonProjection.js'
import { fieldCanvasLabel } from '../../components/Canvas/fieldLabel.js'
import type {
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
  CellStyle,
} from '@template-goblin/types'

/* ---- helpers ---- */

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

function textField(jsonKey: string, required = true): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey, required, placeholder: null },
    x: 0,
    y: 0,
    width: 200,
    height: 30,
    zIndex: 0,
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

function imageField(
  jsonKey: string,
  required = true,
  placeholderFilename: string | null = null,
): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'image',
    groupId: null,
    pageId: null,
    label: '',
    source: {
      mode: 'dynamic',
      jsonKey,
      required,
      placeholder: placeholderFilename ? { filename: placeholderFilename } : null,
    },
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
    style: { fit: 'contain' } satisfies ImageFieldStyle,
  }
}

function tableField(jsonKey: string, required = true, maxRows = 10): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'table',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey, required, placeholder: null },
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    zIndex: 0,
    style: {
      maxRows,
      maxColumns: 3,
      multiPage: false,
      showHeader: true,
      headerStyle: cell({ fontWeight: 'bold', backgroundColor: '#eee' }),
      rowStyle: cell(),
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

/* ---- tests ---- */

describe('projectFieldsToJson', () => {
  describe('values', () => {
    // #174 — a required text field with no placeholder previews as its own
    // jsonKey so the canvas is self-describing.
    it('returns the jsonKey for required text fields', () => {
      const result = projectFieldsToJson([textField('name')])
      expect(result.texts.name).toBe('name')
    })

    it('returns "" for optional text fields', () => {
      const result = projectFieldsToJson([textField('subtitle', false)])
      expect(result.texts.subtitle).toBe('')
    })

    it('returns one self-describing row for required table fields', () => {
      const result = projectFieldsToJson([tableField('marks')])
      expect(result.tables.marks).toHaveLength(1)
      expect(result.tables.marks![0]).toEqual({ name: 'name', grade: 'grade' })
    })

    it('returns [] for optional table fields', () => {
      const result = projectFieldsToJson([tableField('extra', false)])
      expect(result.tables.extra).toEqual([])
    })

    it('returns base64 placeholder for required image', () => {
      const result = projectFieldsToJson([imageField('photo')])
      expect(result.images.photo).toBe('<base64-image-data>')
    })

    it('returns null for optional image', () => {
      const result = projectFieldsToJson([imageField('logo', false)])
      expect(result.images.logo).toBeNull()
    })

    // GH #90 — the JSON tracks each field's placeholder so the sidebar
    // input ↔ canvas label ↔ JSON value all stay in sync. Falls back to
    // the self-describing jsonKey / '' / column keys only when no
    // placeholder is set.
    it('uses field.source.placeholder for text fields when set', () => {
      const f = textField('name')
      ;(f.source as { mode: 'dynamic'; placeholder: string | null }).placeholder = 'Alice'
      const result = projectFieldsToJson([f])
      expect(result.texts.name).toBe('Alice')
    })

    it('falls back to the jsonKey when placeholder is empty / null (#174)', () => {
      const f = textField('name')
      ;(f.source as { mode: 'dynamic'; placeholder: string | null }).placeholder = ''
      const result = projectFieldsToJson([f])
      expect(result.texts.name).toBe('name')
    })

    it('projects the FULL source.placeholder row array for tables (lossless round-trip)', () => {
      const f = tableField('marks')
      ;(f.source as { mode: 'dynamic'; placeholder: Record<string, string>[] | null }).placeholder =
        [
          { name: 'Alice', grade: 'A+' },
          { name: 'Bob', grade: 'B' },
        ]
      const result = projectFieldsToJson([f])
      expect(result.tables.marks).toHaveLength(2)
      expect(result.tables.marks![0]).toEqual({ name: 'Alice', grade: 'A+' })
      expect(result.tables.marks![1]).toEqual({ name: 'Bob', grade: 'B' })
    })

    it('falls back to the column key for table cells when the placeholder row is missing one', () => {
      const f = tableField('marks')
      ;(f.source as { mode: 'dynamic'; placeholder: Record<string, string>[] | null }).placeholder =
        [{ name: 'Alice' }]
      const result = projectFieldsToJson([f])
      expect(result.tables.marks![0]).toEqual({ name: 'Alice', grade: 'grade' })
    })
  })

  describe('edge cases', () => {
    it('handles empty fields array', () => {
      const result = projectFieldsToJson([])
      expect(result).toEqual({ texts: {}, tables: {}, images: {}, links: {} })
    })

    it('skips fields with empty jsonKey', () => {
      const result = projectFieldsToJson([textField('')])
      expect(Object.keys(result.texts)).toHaveLength(0)
    })

    it('handles a required table with no columns', () => {
      const field = tableField('empty')
      ;(field.style as TableFieldStyle).columns = []
      const result = projectFieldsToJson([field])
      expect(result.tables.empty).toEqual([{}])
    })

    it('handles multiple fields of all types together', () => {
      const fields = [
        textField('name'),
        textField('school', false),
        imageField('photo'),
        tableField('marks', true, 3),
      ]

      const result = projectFieldsToJson(fields)
      expect(result.texts.name).toBe('name')
      expect(result.texts.school).toBe('')
      expect(result.images.photo).toBe('<base64-image-data>')
      expect(result.tables.marks).toHaveLength(1)
    })

    it('projects band fields into the same flat buckets (#61)', () => {
      const result = projectFieldsToJson([textField('body')], {
        header: [textField('title')],
        footer: [textField('footer_note', false)],
      })
      expect(result.texts.body).toBe('body')
      expect(result.texts.title).toBe('title')
      expect(result.texts.footer_note).toBe('')
    })
  })

  // #174 — the canvas renders a dynamic text field from the projected JSON
  // value when non-empty, else from `fieldCanvasLabel`. These tests assert
  // the two sources stay IN SYNC: whichever path the canvas takes, a
  // key-named field with no placeholder always previews as its own jsonKey,
  // and a placeholder always wins on both paths.
  describe('canvas ↔ JSON preview sync (#174)', () => {
    /** Mirrors `labelFor` in buildGroupChildren.ts: JSON value wins, else fieldCanvasLabel. */
    function canvasLabel(field: FieldDefinition, texts: Record<string, string>): string {
      if (field.source?.mode !== 'dynamic') return fieldCanvasLabel(field)
      const value = texts[field.source.jsonKey]
      if (typeof value === 'string' && value.length > 0) return value
      return fieldCanvasLabel(field)
    }

    it('required text without placeholder: JSON value, canvas label, and fallback all equal the jsonKey', () => {
      const f = textField('student_name')
      const json = projectFieldsToJson([f])
      expect(json.texts.student_name).toBe('student_name')
      expect(fieldCanvasLabel(f)).toBe('student_name')
      expect(canvasLabel(f, json.texts)).toBe('student_name')
    })

    it('optional text without placeholder: JSON stays "", canvas still shows the jsonKey via fallback', () => {
      const f = textField('school', false)
      const json = projectFieldsToJson([f])
      expect(json.texts.school).toBe('')
      expect(canvasLabel(f, json.texts)).toBe('school')
    })

    it('placeholder wins over the jsonKey on both paths', () => {
      const f = textField('student_name')
      ;(f.source as { mode: 'dynamic'; placeholder: string | null }).placeholder = 'Alice'
      const json = projectFieldsToJson([f])
      expect(json.texts.student_name).toBe('Alice')
      expect(fieldCanvasLabel(f)).toBe('Alice')
      expect(canvasLabel(f, json.texts)).toBe('Alice')
    })

    it('tables self-describe via their column keys', () => {
      const json = projectFieldsToJson([tableField('marks')])
      expect(json.tables.marks![0]).toEqual({ name: 'name', grade: 'grade' })
    })

    it('does not change the stored field definition (projection is pure)', () => {
      const f = textField('student_name')
      const before = JSON.stringify(f)
      projectFieldsToJson([f])
      expect(JSON.stringify(f)).toBe(before)
    })
  })

  // #165 — dynamic image fields with placeholder bitmaps emit a
  // truncated data URL ending in the placeholder sentinel so the
  // JSON preview reads as 'real' data without flooding the editor
  // with multi-KB base64 strings.
  describe('placeholder image data URLs (#165)', () => {
    const FAKE_DATA_URL =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

    it('emits truncated base64 ending in the sentinel when the placeholder is in the map', () => {
      const field = imageField('photo', true, 'placeholders/photo.png')
      const dataUrls = new Map([['placeholders/photo.png', FAKE_DATA_URL]])
      const result = projectFieldsToJson([field], {}, dataUrls)
      const value = result.images.photo
      expect(typeof value).toBe('string')
      expect(value as string).toContain('data:image/png;base64,')
      expect((value as string).endsWith(IMAGE_PLACEHOLDER_SENTINEL)).toBe(true)
      // Truncated, not the full URL.
      expect((value as string).length).toBeLessThan(FAKE_DATA_URL.length + 1)
    })

    it('falls back to the bare filename when the data-URL map is missing the entry', () => {
      const field = imageField('photo', true, 'placeholders/photo.png')
      const result = projectFieldsToJson([field], {}, new Map())
      expect(result.images.photo).toBe('placeholders/photo.png')
    })

    it('omits the imageDataUrls arg entirely → bare filename (pre-#165 behaviour)', () => {
      const field = imageField('photo', true, 'placeholders/photo.png')
      const result = projectFieldsToJson([field])
      expect(result.images.photo).toBe('placeholders/photo.png')
    })

    it('required image with no placeholder still emits the literal marker', () => {
      const result = projectFieldsToJson([imageField('photo')], {}, new Map())
      expect(result.images.photo).toBe('<base64-image-data>')
    })

    it('non-required image with no placeholder → null', () => {
      const result = projectFieldsToJson([imageField('photo', false)], {}, new Map())
      expect(result.images.photo).toBeNull()
    })
  })

  describe('isPlaceholderImageSentinel', () => {
    it('detects values ending with the sentinel', () => {
      expect(
        isPlaceholderImageSentinel('data:image/png;base64,iVBOR' + IMAGE_PLACEHOLDER_SENTINEL),
      ).toBe(true)
    })
    it('returns false for ordinary data URLs', () => {
      expect(isPlaceholderImageSentinel('data:image/png;base64,iVBORw0KGgo')).toBe(false)
    })
    it('returns false for non-string values', () => {
      expect(isPlaceholderImageSentinel(123)).toBe(false)
      expect(isPlaceholderImageSentinel(null)).toBe(false)
      expect(isPlaceholderImageSentinel(undefined)).toBe(false)
      expect(isPlaceholderImageSentinel({ filename: 'x' })).toBe(false)
    })
  })
})
