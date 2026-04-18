import type { TemplateManifest } from '@template-goblin/types'
import { extractUsedCodePoints, subsetFont, subsetTemplateFonts } from '../src/utils/fontSubset.js'
import { dynTable, dynText, makeManifest } from './helpers/fixtures.js'

function createManifest(fields: TemplateManifest['fields'] = []): TemplateManifest {
  return makeManifest({ fields })
}

describe('extractUsedCodePoints', () => {
  it('should include ASCII printable range by default', () => {
    const codePoints = extractUsedCodePoints(createManifest())
    // Space (32) through tilde (126)
    for (let i = 32; i <= 126; i++) {
      expect(codePoints.has(i)).toBe(true)
    }
  })

  it('should include characters from field placeholders', () => {
    const manifest = createManifest([
      dynText(
        'f1',
        'name',
        false,
        { x: 0, y: 0, width: 100, height: 30 },
        undefined,
        'Hello World!',
      ),
    ])

    const codePoints = extractUsedCodePoints(manifest)
    expect(codePoints.has('H'.codePointAt(0)!)).toBe(true)
    expect(codePoints.has('W'.codePointAt(0)!)).toBe(true)
  })

  it('should include characters from table column labels', () => {
    const tableField = dynTable('f1', 'marks', false, ['subject', 'grade'], {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    })
    // Customize the labels so they actually contain the characters under test.
    tableField.style.columns[0]!.label = 'Subject Name'
    tableField.style.columns[1]!.label = 'Grade'

    const manifest = createManifest([tableField])

    const codePoints = extractUsedCodePoints(manifest)
    expect(codePoints.has('S'.codePointAt(0)!)).toBe(true)
    expect(codePoints.has('N'.codePointAt(0)!)).toBe(true)
    expect(codePoints.has('G'.codePointAt(0)!)).toBe(true)
  })

  it('should use column key as fallback when label is empty', () => {
    const tableField = dynTable('f1', 'data', false, ['myKey'], {
      x: 0,
      y: 0,
      width: 400,
      height: 200,
    })
    tableField.style.columns[0]!.label = ''

    const manifest = createManifest([tableField])

    const codePoints = extractUsedCodePoints(manifest)
    expect(codePoints.has('m'.codePointAt(0)!)).toBe(true)
    expect(codePoints.has('K'.codePointAt(0)!)).toBe(true)
  })
})

describe('subsetFont', () => {
  it('should return the original buffer for non-TTF data', () => {
    const buf = Buffer.from('not a font file')
    const result = subsetFont(buf, new Set([65, 66]))
    expect(result).toBe(buf)
  })

  it('should return the original buffer for too-small data', () => {
    const buf = Buffer.from([0, 1, 2])
    const result = subsetFont(buf, new Set([65]))
    expect(result).toBe(buf)
  })

  it('should handle an empty code point set without error', () => {
    const buf = Buffer.alloc(20)
    const result = subsetFont(buf, new Set())
    expect(result).toBeInstanceOf(Buffer)
  })
})

describe('subsetTemplateFonts', () => {
  it('should return a new Map with the same keys', () => {
    const manifest = createManifest()
    const fonts = new Map([
      ['font1', Buffer.from('fake-font-1')],
      ['font2', Buffer.from('fake-font-2')],
    ])

    const result = subsetTemplateFonts(manifest, fonts)

    expect(result.size).toBe(2)
    expect(result.has('font1')).toBe(true)
    expect(result.has('font2')).toBe(true)
  })

  it('should not lose any font entries', () => {
    const manifest = createManifest()
    const fonts = new Map([['only', Buffer.from('data')]])

    const result = subsetTemplateFonts(manifest, fonts)
    expect(result.get('only')).toBeInstanceOf(Buffer)
  })
})
