import { describe, it, expect } from 'vitest'
import { generateExampleJson } from '../jsonGenerator.js'
import type {
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  LoopFieldStyle,
} from '@template-goblin/types'

/* ---- helpers ---- */

function textField(jsonKey: string, required = true): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'text',
    groupId: null,
    required,
    jsonKey,
    placeholder: null,
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
    required,
    jsonKey,
    placeholder: null,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
    style: { fit: 'contain', placeholderFilename: null } satisfies ImageFieldStyle,
  }
}

function loopField(jsonKey: string, required = true, maxRows = 10): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'loop',
    groupId: null,
    required,
    jsonKey,
    placeholder: null,
    x: 0,
    y: 0,
    width: 400,
    height: 300,
    zIndex: 0,
    style: {
      maxRows,
      maxColumns: 3,
      multiPage: false,
      headerStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'bold',
        align: 'left',
        color: '#000',
        backgroundColor: '#eee',
      },
      rowStyle: {
        fontFamily: 'Helvetica',
        fontSize: 10,
        fontWeight: 'normal',
        color: '#000',
        overflowMode: 'truncate',
        fontSizeDynamic: false,
        fontSizeMin: 6,
        lineHeight: 1.2,
      },
      cellStyle: {
        borderWidth: 1,
        borderColor: '#ccc',
        paddingTop: 2,
        paddingBottom: 2,
        paddingLeft: 4,
        paddingRight: 4,
      },
      columns: [
        { key: 'name', label: 'Name', width: 150, align: 'left' },
        { key: 'grade', label: 'Grade', width: 80, align: 'center' },
      ],
    } satisfies LoopFieldStyle,
  }
}

/* ---- tests ---- */

describe('generateExampleJson', () => {
  describe('default mode', () => {
    it('returns "A" for required text fields', () => {
      const result = generateExampleJson([textField('texts.name')], 'default', 5)
      expect(result.texts.name).toBe('A')
    })

    it('returns "" for optional text fields', () => {
      const result = generateExampleJson([textField('texts.subtitle', false)], 'default', 5)
      expect(result.texts.subtitle).toBe('')
    })

    it('returns 1 row for required loop fields', () => {
      const result = generateExampleJson([loopField('loops.marks')], 'default', 5)
      expect(result.loops.marks).toHaveLength(1)
      expect(result.loops.marks[0]).toEqual({ name: 'A', grade: 'A' })
    })

    it('returns [] for optional loop fields', () => {
      const result = generateExampleJson([loopField('loops.extra', false)], 'default', 5)
      expect(result.loops.extra).toEqual([])
    })

    it('returns base64 placeholder for required image', () => {
      const result = generateExampleJson([imageField('images.photo')], 'default', 5)
      expect(result.images.photo).toBe('<base64-image-data>')
    })

    it('returns null for optional image', () => {
      const result = generateExampleJson([imageField('images.logo', false)], 'default', 5)
      expect(result.images.logo).toBeNull()
    })
  })

  describe('max mode', () => {
    it('returns repeated text for text fields', () => {
      const result = generateExampleJson([textField('texts.name')], 'max', 3)
      expect(result.texts.name).toBe(
        'It works in my machine It works in my machine It works in my machine',
      )
      expect(result.texts.name.length).toBeGreaterThan(20)
    })

    it('returns repeated text even for optional fields', () => {
      const result = generateExampleJson([textField('texts.subtitle', false)], 'max', 2)
      expect(result.texts.subtitle).toContain('It works in my machine')
    })

    it('returns maxRows number of rows for loop fields', () => {
      const result = generateExampleJson([loopField('loops.marks', true, 5)], 'max', 2)
      expect(result.loops.marks).toHaveLength(5)
      for (const row of result.loops.marks) {
        expect(row.name).toContain('It works in my machine')
        expect(row.grade).toContain('It works in my machine')
      }
    })

    it('returns base64 placeholder for all images', () => {
      const result = generateExampleJson([imageField('images.photo', false)], 'max', 5)
      expect(result.images.photo).toBe('<base64-image-data>')
    })

    it('handles repeatCount=0 by returning empty string', () => {
      const result = generateExampleJson([textField('texts.name')], 'max', 0)
      expect(result.texts.name).toBe('')
    })

    it('handles large repeatCount', () => {
      const result = generateExampleJson([textField('texts.name')], 'max', 50)
      expect(result.texts.name.length).toBeGreaterThan(500)
    })
  })

  describe('edge cases', () => {
    it('handles empty fields array', () => {
      const result = generateExampleJson([], 'default', 5)
      expect(result).toEqual({ texts: {}, loops: {}, images: {} })
    })

    it('handles empty fields array in max mode', () => {
      const result = generateExampleJson([], 'max', 5)
      expect(result).toEqual({ texts: {}, loops: {}, images: {} })
    })

    it('skips fields with no name part in jsonKey', () => {
      const result = generateExampleJson([textField('texts.')], 'max', 5)
      expect(Object.keys(result.texts)).toHaveLength(0)
    })

    it('skips fields with wrong category prefix', () => {
      // A text field with jsonKey "loops.name" — category mismatch
      const field = textField('loops.name')
      const result = generateExampleJson([field], 'default', 5)
      expect(Object.keys(result.texts)).toHaveLength(0)
    })

    it('handles loop with no columns in max mode', () => {
      const field = loopField('loops.empty')
      ;(field.style as LoopFieldStyle).columns = []
      const result = generateExampleJson([field], 'max', 5)
      // maxRows rows but each row is empty object
      expect(result.loops.empty).toHaveLength(10)
      expect(result.loops.empty[0]).toEqual({})
    })

    it('handles unknown mode by falling back to default behavior', () => {
      // This was the actual bug — 'min' was removed but persisted in localStorage
      const result = generateExampleJson(
        [textField('texts.name')],
        'min' as 'default', // cast to simulate stale persisted value
        5,
      )
      // Should not return undefined — should fall back to default
      expect(result.texts.name).toBeDefined()
      expect(typeof result.texts.name).toBe('string')
    })

    it('handles multiple fields of all types together', () => {
      const fields = [
        textField('texts.name'),
        textField('texts.school', false),
        imageField('images.photo'),
        loopField('loops.marks', true, 3),
      ]

      const defaultResult = generateExampleJson(fields, 'default', 5)
      expect(defaultResult.texts.name).toBe('A')
      expect(defaultResult.texts.school).toBe('')
      expect(defaultResult.images.photo).toBe('<base64-image-data>')
      expect(defaultResult.loops.marks).toHaveLength(1)

      const maxResult = generateExampleJson(fields, 'max', 2)
      expect(maxResult.texts.name).toContain('It works in my machine')
      expect(maxResult.texts.school).toContain('It works in my machine')
      expect(maxResult.images.photo).toBe('<base64-image-data>')
      expect(maxResult.loops.marks).toHaveLength(3)
    })
  })
})
