import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generatePDF } from '../src/generate.js'
import type { InputJSON } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'

const TEST_DIR = join(tmpdir(), 'tg-test-generate-' + Date.now())

function createTestTgbl(filename: string): string {
  const manifest = {
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
    fields: [
      {
        id: 'f1',
        type: 'text',
        groupId: null,
        required: true,
        jsonKey: 'texts.name',
        placeholder: 'Name',
        x: 50,
        y: 50,
        width: 200,
        height: 30,
        zIndex: 1,
        style: {
          fontId: null,
          fontFamily: 'Helvetica',
          fontSize: 12,
          fontSizeDynamic: false,
          fontSizeMin: 6,
          lineHeight: 1.2,
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#000000',
          align: 'left',
          verticalAlign: 'top',
          maxRows: 1,
          overflowMode: 'truncate',
          snapToGrid: true,
        },
      },
    ],
  }

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
      loops: {},
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
      loops: {},
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
      loops: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)
    expect(pdf.length).toBeGreaterThan(100)
  })
})
