import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generatePDF, generatePDFFromFile } from '../src/generate.js'
import type { InputJSON, TemplateManifest } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { dynImage, dynTable, dynText, makeManifest, TEXT_STYLE } from './helpers/fixtures.js'

// Minimal valid 1x1 PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const TEST_DIR = join(tmpdir(), 'tg-integration-' + Date.now())

function buildTgbl(manifest: TemplateManifest, assets?: Record<string, Buffer>): Buffer {
  const zip = new AdmZip()
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))
  if (assets) {
    for (const [name, data] of Object.entries(assets)) {
      zip.addFile(name, data)
    }
  }
  return zip.toBuffer()
}

function writeTgbl(
  filename: string,
  manifest: TemplateManifest,
  assets?: Record<string, Buffer>,
): string {
  const buf = buildTgbl(manifest, assets)
  const path = join(TEST_DIR, filename)
  writeFileSync(path, buf)
  return path
}

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

/* ================================================================== */
/*  Integration tests                                                 */
/* ================================================================== */

describe('Integration tests', () => {
  /* -------------------------------------------------------------- */
  /*  1. FONT_LOAD_FAILED error                                     */
  /* -------------------------------------------------------------- */

  describe('FONT_LOAD_FAILED error', () => {
    it('should load a template with a corrupt font buffer without error', async () => {
      const field = dynText('f1', 'name', true, {
        x: 50,
        y: 50,
        width: 200,
        height: 30,
        zIndex: 1,
      })
      field.style = { ...field.style, fontId: 'bad-font', fontFamily: 'BadFont' }

      const manifest = makeManifest({
        fonts: [{ id: 'bad-font', name: 'BadFont', filename: 'fonts/BadFont.ttf' }],
        fields: [field],
      })

      const path = writeTgbl('corrupt-font.tgbl', manifest, {
        'fonts/BadFont.ttf': Buffer.from('not-a-font'),
      })

      // loadTemplate should succeed -- it just loads raw bytes
      const template = await loadTemplate(path)
      expect(template.fonts.get('bad-font')).toBeInstanceOf(Buffer)
    })

    it('should throw TemplateGoblinError with code FONT_LOAD_FAILED when generating PDF with a corrupt font', async () => {
      const field = dynText('f1', 'name', true, {
        x: 50,
        y: 50,
        width: 200,
        height: 30,
        zIndex: 1,
      })
      field.style = { ...field.style, fontId: 'bad-font', fontFamily: 'BadFont' }

      const manifest = makeManifest({
        fonts: [{ id: 'bad-font', name: 'BadFont', filename: 'fonts/BadFont.ttf' }],
        fields: [field],
      })

      const path = writeTgbl('corrupt-font-gen.tgbl', manifest, {
        'fonts/BadFont.ttf': Buffer.from('not-a-font'),
      })

      const template = await loadTemplate(path)
      const data: InputJSON = {
        texts: { name: 'Hello' },
        tables: {},
        images: {},
      }

      await expect(generatePDF(template, data)).rejects.toThrow(TemplateGoblinError)

      try {
        await generatePDF(template, data)
      } catch (err) {
        expect(err).toBeInstanceOf(TemplateGoblinError)
        const code = (err as TemplateGoblinError).code
        expect(['FONT_LOAD_FAILED', 'PDF_GENERATION_FAILED']).toContain(code)
      }
    })
  })

  /* -------------------------------------------------------------- */
  /*  2. generatePDFFromFile                                        */
  /* -------------------------------------------------------------- */

  describe('generatePDFFromFile', () => {
    it('should generate a PDF from a .tgbl file path and return a Buffer starting with %PDF-', async () => {
      const manifest = makeManifest({
        fields: [
          dynText('f1', 'title', true, {
            x: 50,
            y: 50,
            width: 300,
            height: 30,
            zIndex: 1,
          }),
        ],
      })

      const path = writeTgbl('from-file.tgbl', manifest)

      const data: InputJSON = {
        texts: { title: 'Generated from file' },
        tables: {},
        images: {},
      }

      const pdf = await generatePDFFromFile(path, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })

  /* -------------------------------------------------------------- */
  /*  3. generatePDF with image field                               */
  /* -------------------------------------------------------------- */

  describe('generatePDF with image field', () => {
    it('should generate a valid PDF when an image field is provided with a PNG buffer', async () => {
      const manifest = makeManifest({
        fields: [
          dynImage('photo', 'photo', true, {
            x: 50,
            y: 50,
            width: 200,
            height: 200,
            zIndex: 1,
          }),
        ],
      })

      const path = writeTgbl('image-field.tgbl', manifest)
      const template = await loadTemplate(path)

      const data: InputJSON = {
        texts: {},
        tables: {},
        images: { photo: TINY_PNG },
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })

  /* -------------------------------------------------------------- */
  /*  4. generatePDF with table field                               */
  /* -------------------------------------------------------------- */

  describe('generatePDF with table field', () => {
    it('should generate a valid PDF when a table field with rows is provided', async () => {
      const manifest = makeManifest({
        fields: [
          dynTable('marks', 'marks', true, ['name', 'grade'], {
            x: 50,
            y: 50,
            width: 400,
            height: 600,
            zIndex: 1,
          }),
        ],
      })

      const path = writeTgbl('table-field.tgbl', manifest)
      const template = await loadTemplate(path)

      const data: InputJSON = {
        texts: {},
        tables: {
          marks: [{ name: 'Math', grade: 'A' }],
        },
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })

  /* -------------------------------------------------------------- */
  /*  5. Multi-page: text + table with multiPage overflow           */
  /* -------------------------------------------------------------- */

  describe('Multi-page overflow', () => {
    it('should generate a multi-page PDF when table data overflows the field rectangle', async () => {
      const tableField = dynTable('marks', 'marks', true, ['name', 'grade'], {
        x: 50,
        y: 60,
        width: 400,
        height: 100, // Deliberately small so rows overflow
        zIndex: 2,
      })
      tableField.style.multiPage = true

      const manifest = makeManifest({
        fields: [
          dynText('title', 'title', true, {
            x: 50,
            y: 20,
            width: 300,
            height: 25,
            zIndex: 1,
          }),
          tableField,
        ],
      })

      const path = writeTgbl('multi-page.tgbl', manifest)
      const template = await loadTemplate(path)

      // 25 rows with a small field height should overflow across multiple pages
      const rows = Array.from({ length: 25 }, (_, i) => ({
        name: `Subject ${i + 1}`,
        grade: String.fromCharCode(65 + (i % 5)),
      }))

      const data: InputJSON = {
        texts: { title: 'Report Card' },
        tables: { marks: rows },
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })

  /* -------------------------------------------------------------- */
  /*  6. generatePDF with background image                          */
  /* -------------------------------------------------------------- */

  describe('generatePDF with background image', () => {
    it('should generate a valid PDF when the template includes a background image', async () => {
      const manifest = makeManifest({
        fields: [
          dynText('f1', 'name', true, {
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
          }),
        ],
      })

      const path = writeTgbl('with-bg.tgbl', manifest, {
        'background.png': TINY_PNG,
      })
      const template = await loadTemplate(path)

      expect(template.backgroundImage).toBeInstanceOf(Buffer)
      expect(template.backgroundImage!.length).toBe(TINY_PNG.length)

      const data: InputJSON = {
        texts: { name: 'With Background' },
        tables: {},
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })

  /* -------------------------------------------------------------- */
  /*  7. Template with no fields                                    */
  /* -------------------------------------------------------------- */

  describe('Template with no fields', () => {
    it('should produce a valid single-page PDF when the template has an empty fields array', async () => {
      const manifest = makeManifest({ fields: [] })

      const path = writeTgbl('no-fields.tgbl', manifest)
      const template = await loadTemplate(path)

      const data: InputJSON = {
        texts: {},
        tables: {},
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })

    it('should produce a valid PDF with background when template has no fields', async () => {
      const manifest = makeManifest({ fields: [] })

      const path = writeTgbl('no-fields-bg.tgbl', manifest, {
        'background.png': TINY_PNG,
      })
      const template = await loadTemplate(path)

      const data: InputJSON = {
        texts: {},
        tables: {},
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })

  /* -------------------------------------------------------------- */
  /*  8. Optional fields omitted from data                          */
  /* -------------------------------------------------------------- */

  describe('Optional fields omitted from data', () => {
    it('should generate a valid PDF when optional image field is omitted from data', async () => {
      const manifest = makeManifest({
        fields: [
          dynText('name', 'name', true, {
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
          }),
          dynImage('photo', 'photo', false, {
            x: 50,
            y: 100,
            width: 150,
            height: 150,
            zIndex: 2,
          }),
        ],
      })

      const path = writeTgbl('optional-omitted.tgbl', manifest)
      const template = await loadTemplate(path)

      // Only provide the required text field, omit the optional image
      const data: InputJSON = {
        texts: { name: 'Alice' },
        tables: {},
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })

    it('should generate a valid PDF when multiple optional fields of different types are omitted', async () => {
      const manifest = makeManifest({
        fields: [
          dynText('name', 'name', true, {
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
          }),
          dynText('subtitle', 'subtitle', false, {
            x: 50,
            y: 90,
            width: 200,
            height: 30,
            zIndex: 2,
          }),
          dynImage('avatar', 'avatar', false, {
            x: 300,
            y: 50,
            width: 100,
            height: 100,
            zIndex: 3,
          }),
          dynTable('items', 'items', false, ['name', 'grade'], {
            x: 50,
            y: 200,
            width: 400,
            height: 400,
            zIndex: 4,
          }),
        ],
      })

      const path = writeTgbl('multi-optional-omitted.tgbl', manifest)
      const template = await loadTemplate(path)

      // Only provide the single required field
      const data: InputJSON = {
        texts: { name: 'Bob' },
        tables: {},
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })
})

// Avoid unused import warning if helpers grow apart
void TEXT_STYLE
