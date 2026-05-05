import type { LoadedTemplate } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { sniffImageFormat } from '../src/utils/imageFormat.js'
import { dynImage, makeManifest, staticImage } from './helpers/fixtures.js'

// 1x1 PNG (valid bytes)
const VALID_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f80f00000100015e29c1390000000049454e44ae426082',
  'hex',
)

// 1x1 JPEG (valid bytes)
const VALID_JPEG = Buffer.from(
  'ffd8ffe000104a46494600010100000100010000ffdb0043000302020303020304030304040405060a060605050609090807070b0e0c090b0a0c0d0d0c0e1417100e0d130d0c0c10171c1715181714ffc00011080001000103011100021101031101ffc4001500010100000000000000000000000000000007ffc4001401010000000000000000000000000000000000ffda000c03010002100310000001bf80ffd9',
  'hex',
)

const BAD_BYTES = Buffer.from('this is not a png or jpeg', 'utf-8')
const EMPTY_BYTES = Buffer.alloc(0)

function buildTemplate(
  fields: ReturnType<typeof dynImage | typeof staticImage>[],
  staticImages: Map<string, Buffer> = new Map(),
): LoadedTemplate {
  return {
    manifest: makeManifest({ fields }),
    backgroundImage: null,
    staticImages,
    fonts: new Map(),
    placeholderImages: new Map(),
    pageBackgrounds: new Map(),
  }
}

describe('sniffImageFormat', () => {
  it('detects PNG', () => {
    expect(sniffImageFormat(VALID_PNG)).toBe('png')
  })

  it('detects JPEG', () => {
    expect(sniffImageFormat(VALID_JPEG)).toBe('jpeg')
  })

  it('returns null for unknown bytes', () => {
    expect(sniffImageFormat(BAD_BYTES)).toBeNull()
  })

  it('returns null for empty/short buffers', () => {
    expect(sniffImageFormat(EMPTY_BYTES)).toBeNull()
    expect(sniffImageFormat(Buffer.from([0xff]))).toBeNull()
  })
})

describe('generatePDF — pre-flight image error context', () => {
  it('throws INVALID_FORMAT naming the JSON key when dynamic image bytes are not PNG/JPEG', async () => {
    const template = buildTemplate([dynImage('photo-1', 'student_photo', true)])
    const data = { texts: {}, images: { student_photo: BAD_BYTES }, tables: {} }

    await expect(generatePDF(template, data)).rejects.toMatchObject({
      code: 'INVALID_FORMAT',
      details: expect.objectContaining({
        fieldId: 'photo-1',
        fieldType: 'image',
        jsonKey: 'student_photo',
      }),
    })

    await expect(generatePDF(template, data)).rejects.toThrow(/student_photo/)
    await expect(generatePDF(template, data)).rejects.toThrow(/photo-1/)
    await expect(generatePDF(template, data)).rejects.toThrow(/PNG or JPEG/)
  })

  it('throws INVALID_DATA_TYPE when dynamic image data decodes to zero bytes', async () => {
    const template = buildTemplate([dynImage('photo-1', 'student_photo', true)])
    const data = { texts: {}, images: { student_photo: EMPTY_BYTES }, tables: {} }

    await expect(generatePDF(template, data)).rejects.toMatchObject({
      code: 'INVALID_DATA_TYPE',
      details: expect.objectContaining({ fieldId: 'photo-1', jsonKey: 'student_photo' }),
    })
  })

  it('rewraps PDFKit errors with field+page+jsonKey context (renderField try/catch)', async () => {
    // VALID_PNG passes the magic-bytes sniff but is too small for PDFKit to
    // parse, so PDFKit emits "Incomplete or corrupt PNG file". The per-field
    // try/catch must rewrap that with context — this is the original #68 bug.
    const template = buildTemplate([dynImage('photo-1', 'student_photo', true)])
    const data = { texts: {}, images: { student_photo: VALID_PNG }, tables: {} }

    await expect(generatePDF(template, data)).rejects.toMatchObject({
      code: 'PDF_GENERATION_FAILED',
      details: expect.objectContaining({
        fieldId: 'photo-1',
        fieldType: 'image',
        jsonKey: 'student_photo',
        pageIndex: 0,
      }),
    })

    await expect(generatePDF(template, data)).rejects.toThrow(/photo-1/)
    await expect(generatePDF(template, data)).rejects.toThrow(/student_photo/)
    await expect(generatePDF(template, data)).rejects.toThrow(/page 0/)
  })

  it('throws MISSING_ASSET naming field id and filename when static image is not in archive', async () => {
    const template = buildTemplate([
      staticImage('logo-1', 'missing.png', { x: 0, y: 0, width: 100, height: 100 }),
    ])
    const data = { texts: {}, images: {}, tables: {} }

    await expect(generatePDF(template, data)).rejects.toMatchObject({
      code: 'MISSING_ASSET',
      details: expect.objectContaining({
        fieldId: 'logo-1',
        assetFilename: 'missing.png',
      }),
    })

    await expect(generatePDF(template, data)).rejects.toThrow(/logo-1/)
    await expect(generatePDF(template, data)).rejects.toThrow(/missing\.png/)
  })

  it('throws INVALID_FORMAT when static image asset bytes are not PNG/JPEG', async () => {
    const template = buildTemplate(
      [staticImage('logo-1', 'logo.bin', { x: 0, y: 0, width: 100, height: 100 })],
      new Map([['logo.bin', BAD_BYTES]]),
    )
    const data = { texts: {}, images: {}, tables: {} }

    await expect(generatePDF(template, data)).rejects.toMatchObject({
      code: 'INVALID_FORMAT',
      details: expect.objectContaining({
        fieldId: 'logo-1',
        assetFilename: 'logo.bin',
      }),
    })

    await expect(generatePDF(template, data)).rejects.toThrow(/PNG or JPEG/)
  })

  it('does not throw when an optional dynamic image is missing', async () => {
    const template = buildTemplate([dynImage('photo-1', 'optional_photo', false)])
    const data = { texts: {}, images: {}, tables: {} }

    await expect(generatePDF(template, data)).resolves.toBeInstanceOf(Buffer)
  })

  it('TemplateGoblinError is preserved (not rewrapped) when thrown from preflight', async () => {
    const template = buildTemplate([dynImage('photo-1', 'student_photo', true)])
    const data = { texts: {}, images: { student_photo: BAD_BYTES }, tables: {} }

    let caught: unknown
    try {
      await generatePDF(template, data)
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(TemplateGoblinError)
    expect((caught as TemplateGoblinError).code).toBe('INVALID_FORMAT')
  })
})
