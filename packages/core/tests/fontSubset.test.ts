import type { TemplateManifest, LoopFieldStyle } from '@template-goblin/types'
import { extractUsedCodePoints, subsetFont, subsetTemplateFonts } from '../src/utils/fontSubset.js'

function createManifest(fields: TemplateManifest['fields'] = []): TemplateManifest {
  return {
    version: '1.0',
    meta: {
      name: 'Test',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    fonts: [],
    groups: [],
    fields,
  }
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
      {
        id: 'f1',
        type: 'text',
        groupId: null,
        required: false,
        jsonKey: 'texts.name',
        placeholder: 'Hello World!',
        x: 0,
        y: 0,
        width: 100,
        height: 30,
        zIndex: 0,
        style: {} as any,
      },
    ])

    const codePoints = extractUsedCodePoints(manifest)
    expect(codePoints.has('H'.codePointAt(0)!)).toBe(true)
    expect(codePoints.has('W'.codePointAt(0)!)).toBe(true)
  })

  it('should include characters from loop column labels', () => {
    const manifest = createManifest([
      {
        id: 'f1',
        type: 'loop',
        groupId: null,
        required: false,
        jsonKey: 'loops.marks',
        placeholder: null,
        x: 0,
        y: 0,
        width: 400,
        height: 200,
        zIndex: 0,
        style: {
          maxRows: 10,
          maxColumns: 2,
          multiPage: false,
          headerStyle: {
            fontFamily: 'Helvetica',
            fontSize: 10,
            fontWeight: 'bold',
            align: 'left',
            color: '#000',
            backgroundColor: '#f0f0f0',
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
            borderColor: '#000',
            paddingTop: 2,
            paddingBottom: 2,
            paddingLeft: 4,
            paddingRight: 4,
          },
          columns: [
            { key: 'subject', label: 'Subject Name', width: 200, align: 'left' },
            { key: 'grade', label: 'Grade', width: 100, align: 'center' },
          ],
        } satisfies LoopFieldStyle,
      },
    ])

    const codePoints = extractUsedCodePoints(manifest)
    expect(codePoints.has('S'.codePointAt(0)!)).toBe(true)
    expect(codePoints.has('N'.codePointAt(0)!)).toBe(true)
    expect(codePoints.has('G'.codePointAt(0)!)).toBe(true)
  })

  it('should use column key as fallback when label is empty', () => {
    const manifest = createManifest([
      {
        id: 'f1',
        type: 'loop',
        groupId: null,
        required: false,
        jsonKey: 'loops.data',
        placeholder: null,
        x: 0,
        y: 0,
        width: 400,
        height: 200,
        zIndex: 0,
        style: {
          maxRows: 10,
          maxColumns: 1,
          multiPage: false,
          headerStyle: {
            fontFamily: 'Helvetica',
            fontSize: 10,
            fontWeight: 'bold',
            align: 'left',
            color: '#000',
            backgroundColor: '#f0f0f0',
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
            borderColor: '#000',
            paddingTop: 2,
            paddingBottom: 2,
            paddingLeft: 4,
            paddingRight: 4,
          },
          columns: [{ key: 'myKey', label: '', width: 200, align: 'left' }],
        } satisfies LoopFieldStyle,
      },
    ])

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
