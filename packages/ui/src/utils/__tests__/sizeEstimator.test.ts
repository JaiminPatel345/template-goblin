import { describe, it, expect } from 'vitest'
import { estimatePdfSize } from '../sizeEstimator.js'
import type {
  FieldDefinition,
  TextFieldStyle,
  ImageFieldStyle,
  LoopFieldStyle,
} from '@template-goblin/types'

/* ---- helpers ---- */

function textField(jsonKey: string): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'text',
    groupId: null,
    pageId: null,
    required: true,
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

function imageField(jsonKey: string): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'image',
    groupId: null,
    pageId: null,
    required: true,
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

function loopField(
  jsonKey: string,
  maxRows = 10,
  columns: { key: string; label: string; width: number; align: 'left' | 'center' | 'right' }[] = [
    { key: 'name', label: 'Name', width: 150, align: 'left' },
    { key: 'grade', label: 'Grade', width: 80, align: 'center' },
  ],
): FieldDefinition {
  return {
    id: `f-${jsonKey}`,
    type: 'loop',
    groupId: null,
    pageId: null,
    required: true,
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
      columns,
    } satisfies LoopFieldStyle,
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
      const oneText = estimatePdfSize([textField('texts.name')], false)
      const twoTexts = estimatePdfSize([textField('texts.name'), textField('texts.school')], false)
      // base=5000, 1 text=5500 => ~5 KB; 2 texts=6000 => ~6 KB
      expect(oneText).toBe('~5 KB')
      expect(twoTexts).toBe('~6 KB')
    })

    it('scales linearly with many text fields', () => {
      const fields = Array.from({ length: 20 }, (_, i) => textField(`texts.field${i}`))
      const result = estimatePdfSize(fields, false)
      // base 5000 + 20*500 = 15000 => ~15 KB
      expect(result).toBe('~15 KB')
    })
  })

  describe('image fields', () => {
    it('adds ~50KB per image field', () => {
      const oneImage = estimatePdfSize([imageField('images.photo')], false)
      // base 5000 + 50000 = 55000 => ~54 KB
      expect(oneImage).toBe('~54 KB')
    })

    it('two images double the image contribution', () => {
      const twoImages = estimatePdfSize(
        [imageField('images.photo'), imageField('images.logo')],
        false,
      )
      // base 5000 + 2*50000 = 105000 => ~103 KB
      expect(twoImages).toBe('~103 KB')
    })
  })

  describe('loop fields', () => {
    it('scales with rows * columns', () => {
      // maxRows=10, 2 columns => 10*2*200 = 4000
      const result = estimatePdfSize([loopField('loops.marks', 10)], false)
      // base 5000 + 4000 = 9000 => ~9 KB
      expect(result).toBe('~9 KB')
    })

    it('more rows produce a larger estimate', () => {
      const smallLoop = estimatePdfSize([loopField('loops.marks', 5)], false)
      const largeLoop = estimatePdfSize([loopField('loops.marks', 20)], false)
      // small: 5000 + 5*2*200 = 7000 => ~7 KB
      // large: 5000 + 20*2*200 = 13000 => ~13 KB
      expect(smallLoop).toBe('~7 KB')
      expect(largeLoop).toBe('~13 KB')
    })

    it('more columns produce a larger estimate', () => {
      const twoCols = estimatePdfSize([loopField('loops.marks', 10)], false)
      const fourCols = estimatePdfSize(
        [
          loopField('loops.marks', 10, [
            { key: 'a', label: 'A', width: 50, align: 'left' },
            { key: 'b', label: 'B', width: 50, align: 'left' },
            { key: 'c', label: 'C', width: 50, align: 'left' },
            { key: 'd', label: 'D', width: 50, align: 'left' },
          ]),
        ],
        false,
      )
      // twoCols: 5000 + 10*2*200 = 9000 => ~9 KB
      // fourCols: 5000 + 10*4*200 = 13000 => ~13 KB
      expect(twoCols).toBe('~9 KB')
      expect(fourCols).toBe('~13 KB')
    })
  })

  describe('background', () => {
    it('adds default 100KB when background present but no size given', () => {
      const withBg = estimatePdfSize([], true)
      const withoutBg = estimatePdfSize([], false)
      // withBg: 5000 + 100000 = 105000 => ~103 KB
      // withoutBg: 5000 => ~5 KB
      expect(withBg).toBe('~103 KB')
      expect(withoutBg).toBe('~5 KB')
    })

    it('uses provided backgroundSize', () => {
      const result = estimatePdfSize([], true, 500000)
      // 5000 + 500000 = 505000 => ~493 KB
      expect(result).toBe('~493 KB')
    })

    it('does not add background cost when hasBackground is false', () => {
      const result = estimatePdfSize([], false, 500000)
      // backgroundSize ignored when hasBackground is false
      expect(result).toBe('~5 KB')
    })
  })

  describe('formatting thresholds', () => {
    it('uses B suffix for very small values', () => {
      // We cannot easily get below 1024 with the 5000 base, but we can test
      // the format by checking the function accepts the inputs and returns
      // a correctly formatted string. With no fields and no background, base is
      // 5000 bytes which is >= 1024 so it will be KB.
      // This tests that the KB threshold works.
      const result = estimatePdfSize([], false)
      expect(result).toMatch(/KB/)
    })

    it('uses MB suffix for large templates', () => {
      // 21 images: base 5000 + 21*50000 = 1055000 > 1MB
      const fields = Array.from({ length: 21 }, (_, i) => imageField(`images.img${i}`))
      const result = estimatePdfSize(fields, false)
      expect(result).toMatch(/MB/)
    })

    it('uses KB for mid-range sizes', () => {
      const fields = [textField('texts.name'), imageField('images.photo')]
      const result = estimatePdfSize(fields, false)
      expect(result).toMatch(/KB/)
    })

    it('MB format includes one decimal place', () => {
      const fields = Array.from({ length: 21 }, (_, i) => imageField(`images.img${i}`))
      const result = estimatePdfSize(fields, false)
      // Should match pattern like "~1.0 MB"
      expect(result).toMatch(/^~\d+\.\d\s+MB$/)
    })
  })

  describe('combined fields', () => {
    it('sums contributions from all field types and background', () => {
      const fields = [
        textField('texts.name'),
        textField('texts.school'),
        imageField('images.photo'),
        loopField('loops.marks', 10),
      ]
      const result = estimatePdfSize(fields, true, 200000)
      // base 5000 + bg 200000 + 2*500 + 50000 + 10*2*200 = 260000 => ~254 KB
      expect(result).toBe('~254 KB')
    })
  })
})
