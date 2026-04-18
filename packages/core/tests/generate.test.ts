import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generatePDF } from '../src/generate.js'
import type { InputJSON } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { dynText, makeManifest, staticText } from './helpers/fixtures.js'
import type { LoadedTemplate } from '@template-goblin/types'

const TEST_DIR = join(tmpdir(), 'tg-test-generate-' + Date.now())

function createTestTgbl(filename: string): string {
  const manifest = makeManifest({
    fields: [
      dynText(
        'f1',
        'name',
        true,
        { x: 50, y: 50, width: 200, height: 30, zIndex: 1 },
        undefined,
        'Name',
      ),
    ],
  })

  const zip = new AdmZip()
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))

  const path = join(TEST_DIR, filename)
  writeFileSync(path, zip.toBuffer())
  return path
}

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('generatePDF', () => {
  it('should generate a valid PDF buffer', async () => {
    const path = createTestTgbl('valid.tgbl')
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { name: 'John Doe' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)

    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.length).toBeGreaterThan(0)
    // PDF files start with %PDF
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should throw MISSING_REQUIRED_FIELD for missing required data', async () => {
    const path = createTestTgbl('missing-field.tgbl')
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: {},
      tables: {},
      images: {},
    }

    await expect(generatePDF(template, data)).rejects.toThrow(TemplateGoblinError)
    try {
      await generatePDF(template, data)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('MISSING_REQUIRED_FIELD')
    }
  })

  it('should render fields in zIndex order and produce valid output', async () => {
    const path = createTestTgbl('zindex.tgbl')
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { name: 'Test' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)
    expect(pdf.length).toBeGreaterThan(100)
  })

  it('static text field renders identically regardless of InputJSON contents', async () => {
    // Build a template with a single static text field. The PDF bytes should be
    // independent of anything supplied in the InputJSON buckets.
    const field = staticText('greeting', 'Static hello', {
      x: 20,
      y: 20,
      width: 300,
      height: 30,
      zIndex: 0,
    })
    const manifest = makeManifest({ fields: [field] })

    const buildTemplate = (): LoadedTemplate => ({
      manifest,
      backgroundImage: null,
      pageBackgrounds: new Map(),
      fonts: new Map(),
      placeholders: new Map(),
      staticImages: new Map(),
    })

    // Freeze Date so PDFKit's CreationDate metadata is identical across runs.
    const RealDate = Date
    const frozen = new RealDate('2026-04-18T00:00:00.000Z')
    global.Date = class extends RealDate {
      constructor(...args: ConstructorParameters<typeof Date>) {
        super(...(args.length ? args : [frozen.getTime()]))
      }
      static now(): number {
        return frozen.getTime()
      }
    } as unknown as DateConstructor

    try {
      const pdf1 = await generatePDF(buildTemplate(), { texts: {}, tables: {}, images: {} })
      const pdf2 = await generatePDF(buildTemplate(), {
        texts: { unrelated: 'noise' },
        tables: {},
        images: {},
      })

      expect(pdf1.equals(pdf2)).toBe(true)
    } finally {
      global.Date = RealDate
    }
  })
})
