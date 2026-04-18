import { describe, it, expect } from 'vitest'
import { generateExampleJson } from '../jsonGenerator.js'
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
      fontSizeDynamic: false,
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

function imageField(jsonKey: string, required = true): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'image',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey, required, placeholder: null },
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
    it('returns "A" for required text fields', () => {
      const result = generateExampleJson([textField('name')], 'default', 5)
      expect(result.texts.name).toBe('A')
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
      expect(result).toEqual({ texts: {}, tables: {}, images: {} })
    })

    it('handles empty fields array in max mode', () => {
      const result = generateExampleJson([], 'max', 5)
      expect(result).toEqual({ texts: {}, tables: {}, images: {} })
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
      expect(defaultResult.texts.name).toBe('A')
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
})
