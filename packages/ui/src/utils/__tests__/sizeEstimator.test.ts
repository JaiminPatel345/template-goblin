import { describe, it, expect } from 'vitest'
import { estimatePdfSize } from '../sizeEstimator.js'
import type {
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  TableFieldStyle,
  CellStyle,
  TableColumn,
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

function textField(jsonKey: string): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'text',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey, required: true, placeholder: null },
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

function imageField(jsonKey: string): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'image',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey, required: true, placeholder: null },
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    zIndex: 0,
    style: { fit: 'contain' } satisfies ImageFieldStyle,
  }
}

function tableField(
  jsonKey: string,
  maxRows = 10,
  columns: TableColumn[] = [
    { key: 'name', label: 'Name', width: 150, style: null, headerStyle: null },
    { key: 'grade', label: 'Grade', width: 80, style: null, headerStyle: null },
  ],
): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'table',
    groupId: null,
    pageId: null,
    label: '',
    source: { mode: 'dynamic', jsonKey, required: true, placeholder: null },
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
      columns,
    } satisfies TableFieldStyle,
  }
}

/* ---- tests ---- */

describe('estimatePdfSize', () => {
  describe('return format', () => {
    it('returns a string starting with "~"', () => {
      const result = estimatePdfSize([], false)
      expect(result).toMatch(/^~/)
    })

    it('returns a string with a unit suffix', () => {
      const result = estimatePdfSize([], false)
      expect(result).toMatch(/^~\d+(\.\d+)?\s+(B|KB|MB)$/)
    })
  })

  describe('base estimate', () => {
    it('no fields, no background = small estimate (~5 KB)', () => {
      const result = estimatePdfSize([], false)
      expect(result).toBe('~5 KB')
    })
  })

  describe('text fields', () => {
    it('adds ~500 bytes per text field', () => {
      const oneText = estimatePdfSize([textField('name')], false)
      const twoTexts = estimatePdfSize([textField('name'), textField('school')], false)
      expect(oneText).toBe('~5 KB')
      expect(twoTexts).toBe('~6 KB')
    })

    it('scales linearly with many text fields', () => {
      const fields = Array.from({ length: 20 }, (_, i) => textField(`field${i}`))
      const result = estimatePdfSize(fields, false)
      expect(result).toBe('~15 KB')
    })
  })

  describe('image fields', () => {
    it('adds ~50KB per image field', () => {
      const oneImage = estimatePdfSize([imageField('photo')], false)
      expect(oneImage).toBe('~54 KB')
    })

    it('two images double the image contribution', () => {
      const twoImages = estimatePdfSize([imageField('photo'), imageField('logo')], false)
      expect(twoImages).toBe('~103 KB')
    })
  })

  describe('table fields', () => {
    it('scales with rows * columns', () => {
      const result = estimatePdfSize([tableField('marks', 10)], false)
      expect(result).toBe('~9 KB')
    })

    it('more rows produce a larger estimate', () => {
      const smallLoop = estimatePdfSize([tableField('marks', 5)], false)
      const largeLoop = estimatePdfSize([tableField('marks', 20)], false)
      expect(smallLoop).toBe('~7 KB')
      expect(largeLoop).toBe('~13 KB')
    })

    it('more columns produce a larger estimate', () => {
      const twoCols = estimatePdfSize([tableField('marks', 10)], false)
      const fourCols = estimatePdfSize(
        [
          tableField('marks', 10, [
            { key: 'a', label: 'A', width: 50, style: null, headerStyle: null },
            { key: 'b', label: 'B', width: 50, style: null, headerStyle: null },
            { key: 'c', label: 'C', width: 50, style: null, headerStyle: null },
            { key: 'd', label: 'D', width: 50, style: null, headerStyle: null },
          ]),
        ],
        false,
      )
      expect(twoCols).toBe('~9 KB')
      expect(fourCols).toBe('~13 KB')
    })
  })

  describe('background', () => {
    it('adds default 100KB when background present but no size given', () => {
      const withBg = estimatePdfSize([], true)
      const withoutBg = estimatePdfSize([], false)
      expect(withBg).toBe('~103 KB')
      expect(withoutBg).toBe('~5 KB')
    })

    it('uses provided backgroundSize', () => {
      const result = estimatePdfSize([], true, 500000)
      expect(result).toBe('~493 KB')
    })

    it('does not add background cost when hasBackground is false', () => {
      const result = estimatePdfSize([], false, 500000)
      expect(result).toBe('~5 KB')
    })
  })

  describe('formatting thresholds', () => {
    it('uses B suffix for very small values', () => {
      const result = estimatePdfSize([], false)
      expect(result).toMatch(/KB/)
    })

    it('uses MB suffix for large templates', () => {
      const fields = Array.from({ length: 21 }, (_, i) => imageField(`img${i}`))
      const result = estimatePdfSize(fields, false)
      expect(result).toMatch(/MB/)
    })

    it('uses KB for mid-range sizes', () => {
      const fields = [textField('name'), imageField('photo')]
      const result = estimatePdfSize(fields, false)
      expect(result).toMatch(/KB/)
    })

    it('MB format includes one decimal place', () => {
      const fields = Array.from({ length: 21 }, (_, i) => imageField(`img${i}`))
      const result = estimatePdfSize(fields, false)
      expect(result).toMatch(/^~\d+\.\d\s+MB$/)
    })
  })

  describe('combined fields', () => {
    it('sums contributions from all field types and background', () => {
      const fields = [
        textField('name'),
        textField('school'),
        imageField('photo'),
        tableField('marks', 10),
      ]
      const result = estimatePdfSize(fields, true, 200000)
      expect(result).toBe('~254 KB')
    })
  })
})
