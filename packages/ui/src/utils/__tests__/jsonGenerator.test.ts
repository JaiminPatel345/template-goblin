import { describe, it, expect } from 'vitest'
import {
  generateExampleJson,
  IMAGE_PLACEHOLDER_SENTINEL,
  isPlaceholderImageSentinel,
} from '../jsonGenerator.js'
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

describe('generateExampleJson', () => {
  describe('default mode', () => {
    // #174 — a required text field with no placeholder previews as its own
    // jsonKey so the canvas is self-describing.
    it('returns the jsonKey for required text fields', () => {
      const result = generateExampleJson([textField('name')], 'default', 5)
      expect(result.texts.name).toBe('name')
    })

    it('returns "" for optional text fields', () => {
      const result = generateExampleJson([textField('subtitle', false)], 'default', 5)
      expect(result.texts.subtitle).toBe('')
    })

    it('returns 1 row for required table fields', () => {
      const result = generateExampleJson([tableField('marks')], 'default', 5)
      expect(result.tables.marks).toHaveLength(1)
      expect(result.tables.marks![0]).toEqual({ name: 'A', grade: 'A' })
    })

    it('returns [] for optional table fields', () => {
      const result = generateExampleJson([tableField('extra', false)], 'default', 5)
      expect(result.tables.extra).toEqual([])
    })

    it('returns base64 placeholder for required image', () => {
      const result = generateExampleJson([imageField('photo')], 'default', 5)
      expect(result.images.photo).toBe('<base64-image-data>')
    })

    it('returns null for optional image', () => {
      const result = generateExampleJson([imageField('logo', false)], 'default', 5)
      expect(result.images.logo).toBeNull()
    })

    // GH #90 — default-mode JSON should track each field's placeholder so the
    // sidebar input ↔ canvas label ↔ JSON value all stay in sync. Falls back
    // to the synthetic 'A' / '' / first-row only when no placeholder is set.
    it('uses field.source.placeholder for text fields when set', () => {
      const f = textField('name')
      ;(f.source as { mode: 'dynamic'; placeholder: string | null }).placeholder = 'Alice'
      const result = generateExampleJson([f], 'default', 5)
      expect(result.texts.name).toBe('Alice')
    })

    it('falls back to the jsonKey when placeholder is empty / null (#174)', () => {
      const f = textField('name')
      ;(f.source as { mode: 'dynamic'; placeholder: string | null }).placeholder = ''
      const result = generateExampleJson([f], 'default', 5)
      expect(result.texts.name).toBe('name')
    })

    it('uses the first row of source.placeholder for tables when supplied', () => {
      const f = tableField('marks')
      ;(f.source as { mode: 'dynamic'; placeholder: Record<string, string>[] | null }).placeholder =
        [
          { name: 'Alice', grade: 'A+' },
          { name: 'Bob', grade: 'B' },
        ]
      const result = generateExampleJson([f], 'default', 5)
      expect(result.tables.marks).toHaveLength(1)
      expect(result.tables.marks![0]).toEqual({ name: 'Alice', grade: 'A+' })
    })

    it('falls back to "A" for table cells when the placeholder row is missing a column key', () => {
      const f = tableField('marks')
      ;(f.source as { mode: 'dynamic'; placeholder: Record<string, string>[] | null }).placeholder =
        [{ name: 'Alice' }]
      const result = generateExampleJson([f], 'default', 5)
      expect(result.tables.marks![0]).toEqual({ name: 'Alice', grade: 'A' })
    })
  })

  describe('max mode', () => {
    it('returns repeated text for text fields', () => {
      const result = generateExampleJson([textField('name')], 'max', 3)
      expect(result.texts.name).toBe(
        'It works in my machine It works in my machine It works in my machine',
      )
      expect(result.texts.name!.length).toBeGreaterThan(20)
    })

    it('returns repeated text even for optional fields', () => {
      const result = generateExampleJson([textField('subtitle', false)], 'max', 2)
      expect(result.texts.subtitle).toContain('It works in my machine')
    })

    it('returns maxRows number of rows for table fields', () => {
      const result = generateExampleJson([tableField('marks', true, 5)], 'max', 2)
      expect(result.tables.marks).toHaveLength(5)
      for (const row of result.tables.marks!) {
        expect(row.name).toContain('It works in my machine')
        expect(row.grade).toContain('It works in my machine')
      }
    })

    it('returns base64 placeholder for all images', () => {
      const result = generateExampleJson([imageField('photo', false)], 'max', 5)
      expect(result.images.photo).toBe('<base64-image-data>')
    })

    it('handles repeatCount=0 by returning empty string', () => {
      const result = generateExampleJson([textField('name')], 'max', 0)
      expect(result.texts.name).toBe('')
    })

    it('handles large repeatCount', () => {
      const result = generateExampleJson([textField('name')], 'max', 50)
      expect(result.texts.name!.length).toBeGreaterThan(500)
    })
  })

  describe('edge cases', () => {
    it('handles empty fields array', () => {
      const result = generateExampleJson([], 'default', 5)
      expect(result).toEqual({ texts: {}, tables: {}, images: {}, links: {} })
    })

    it('handles empty fields array in max mode', () => {
      const result = generateExampleJson([], 'max', 5)
      expect(result).toEqual({ texts: {}, tables: {}, images: {}, links: {} })
    })

    it('skips fields with empty jsonKey', () => {
      const result = generateExampleJson([textField('')], 'max', 5)
      expect(Object.keys(result.texts)).toHaveLength(0)
    })

    it('handles table with no columns in max mode', () => {
      const field = tableField('empty')
      ;(field.style as TableFieldStyle).columns = []
      const result = generateExampleJson([field], 'max', 5)
      // maxRows rows but each row is empty object
      expect(result.tables.empty).toHaveLength(10)
      expect(result.tables.empty![0]).toEqual({})
    })

    it('handles unknown mode by falling back to default behavior', () => {
      // stale persisted value: 'min' removed
      const result = generateExampleJson([textField('name')], 'min' as 'default', 5)
      expect(result.texts.name).toBeDefined()
      expect(typeof result.texts.name).toBe('string')
    })

    it('handles multiple fields of all types together', () => {
      const fields = [
        textField('name'),
        textField('school', false),
        imageField('photo'),
        tableField('marks', true, 3),
      ]

      const defaultResult = generateExampleJson(fields, 'default', 5)
      expect(defaultResult.texts.name).toBe('name')
      expect(defaultResult.texts.school).toBe('')
      expect(defaultResult.images.photo).toBe('<base64-image-data>')
      expect(defaultResult.tables.marks).toHaveLength(1)

      const maxResult = generateExampleJson(fields, 'max', 2)
      expect(maxResult.texts.name).toContain('It works in my machine')
      expect(maxResult.texts.school).toContain('It works in my machine')
      expect(maxResult.images.photo).toBe('<base64-image-data>')
      expect(maxResult.tables.marks).toHaveLength(3)
    })
  })

  // #174 — the canvas renders a dynamic text field from the generated JSON
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
      const json = generateExampleJson([f], 'default', 5)
      expect(json.texts.student_name).toBe('student_name')
      expect(fieldCanvasLabel(f)).toBe('student_name')
      expect(canvasLabel(f, json.texts)).toBe('student_name')
    })

    it('optional text without placeholder: JSON stays "", canvas still shows the jsonKey via fallback', () => {
      const f = textField('school', false)
      const json = generateExampleJson([f], 'default', 5)
      expect(json.texts.school).toBe('')
      expect(canvasLabel(f, json.texts)).toBe('school')
    })

    it('placeholder wins over the jsonKey on both paths', () => {
      const f = textField('student_name')
      ;(f.source as { mode: 'dynamic'; placeholder: string | null }).placeholder = 'Alice'
      const json = generateExampleJson([f], 'default', 5)
      expect(json.texts.student_name).toBe('Alice')
      expect(fieldCanvasLabel(f)).toBe('Alice')
      expect(canvasLabel(f, json.texts)).toBe('Alice')
    })

    it('max mode is untouched — bulk text, not the jsonKey', () => {
      const f = textField('student_name')
      const json = generateExampleJson([f], 'max', 2)
      expect(json.texts.student_name).toContain('It works in my machine')
      expect(json.texts.student_name).not.toBe('student_name')
    })

    it('table cells keep the synthetic "A" row (tables already self-describe via column labels)', () => {
      const json = generateExampleJson([tableField('marks')], 'default', 5)
      expect(json.tables.marks![0]).toEqual({ name: 'A', grade: 'A' })
    })

    it('does not change the stored field definition (canvas-preview only)', () => {
      const f = textField('student_name')
      const before = JSON.stringify(f)
      generateExampleJson([f], 'default', 5)
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
      const result = generateExampleJson([field], 'default', 5, {}, dataUrls)
      const value = result.images.photo
      expect(typeof value).toBe('string')
      expect(value as string).toContain('data:image/png;base64,')
      expect((value as string).endsWith(IMAGE_PLACEHOLDER_SENTINEL)).toBe(true)
      // Truncated, not the full URL.
      expect((value as string).length).toBeLessThan(FAKE_DATA_URL.length + 1)
    })

    it('falls back to the bare filename when the data-URL map is missing the entry', () => {
      const field = imageField('photo', true, 'placeholders/photo.png')
      const result = generateExampleJson([field], 'default', 5, {}, new Map())
      expect(result.images.photo).toBe('placeholders/photo.png')
    })

    it('omits the imageDataUrls arg entirely → bare filename (pre-#165 behaviour)', () => {
      const field = imageField('photo', true, 'placeholders/photo.png')
      const result = generateExampleJson([field], 'default', 5)
      expect(result.images.photo).toBe('placeholders/photo.png')
    })

    it('required image with no placeholder still emits the literal marker', () => {
      const result = generateExampleJson([imageField('photo')], 'default', 5, {}, new Map())
      expect(result.images.photo).toBe('<base64-image-data>')
    })

    it('non-required image with no placeholder → null', () => {
      const result = generateExampleJson([imageField('photo', false)], 'default', 5, {}, new Map())
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
