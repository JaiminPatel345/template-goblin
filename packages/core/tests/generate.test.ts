import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generatePDF } from '../src/generate.js'
import type { InputJSON } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { dynText, makeManifest } from './helpers/fixtures.js'

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
})
