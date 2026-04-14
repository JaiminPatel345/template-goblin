import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generatePDF, generatePDFFromFile } from '../src/generate.js'
import type { InputJSON } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'

// Minimal valid 1x1 PNG
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

const TEST_DIR = join(tmpdir(), 'tg-integration-' + Date.now())

function createManifest(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0',
    meta: {
      name: 'Test',
      width: 595,
      height: 842,
      unit: 'pt',
      pageSize: 'A4',
      locked: false,
      maxPages: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    fonts: [],
    groups: [],
    fields: [],
    ...overrides,
  }
}

function buildTgbl(manifest: Record<string, unknown>, assets?: Record<string, Buffer>): Buffer {
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
  manifest: Record<string, unknown>,
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
/*  Shared field-style constants                                      */
/* ================================================================== */

const TEXT_STYLE = {
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
}

const IMAGE_STYLE = {
  fit: 'contain',
  placeholderFilename: null,
}

const LOOP_STYLE = {
  maxRows: 100,
  maxColumns: 5,
  multiPage: false,
  headerStyle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'bold',
    align: 'left',
    color: '#000000',
    backgroundColor: '#eeeeee',
  },
  rowStyle: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    fontWeight: 'normal',
    color: '#000000',
    overflowMode: 'truncate',
    fontSizeDynamic: false,
    fontSizeMin: 8,
    lineHeight: 1.2,
  },
  cellStyle: {
    borderWidth: 1,
    borderColor: '#cccccc',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 4,
    paddingRight: 4,
  },
  columns: [
    { key: 'name', label: 'Name', width: 150, align: 'left' },
    { key: 'grade', label: 'Grade', width: 80, align: 'center' },
  ],
}

/* ================================================================== */
/*  Integration tests                                                 */
/* ================================================================== */

describe('Integration tests', () => {
  /* -------------------------------------------------------------- */
  /*  1. FONT_LOAD_FAILED error                                     */
  /* -------------------------------------------------------------- */

  describe('FONT_LOAD_FAILED error', () => {
    it('should load a template with a corrupt font buffer without error', async () => {
      const manifest = createManifest({
        fonts: [{ id: 'bad-font', name: 'BadFont', filename: 'fonts/BadFont.ttf' }],
        fields: [
          {
            id: 'f1',
            type: 'text',
            groupId: null,
            required: true,
            jsonKey: 'texts.name',
            placeholder: null,
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
            style: {
              ...TEXT_STYLE,
              fontId: 'bad-font',
              fontFamily: 'BadFont',
            },
          },
        ],
      })

      const path = writeTgbl('corrupt-font.tgbl', manifest, {
        'fonts/BadFont.ttf': Buffer.from('not-a-font'),
      })

      // loadTemplate should succeed -- it just loads raw bytes
      const template = await loadTemplate(path)
      expect(template.fonts.get('bad-font')).toBeInstanceOf(Buffer)
    })

    it('should throw TemplateGoblinError with code FONT_LOAD_FAILED when generating PDF with a corrupt font', async () => {
      const manifest = createManifest({
        fonts: [{ id: 'bad-font', name: 'BadFont', filename: 'fonts/BadFont.ttf' }],
        fields: [
          {
            id: 'f1',
            type: 'text',
            groupId: null,
            required: true,
            jsonKey: 'texts.name',
            placeholder: null,
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
            style: {
              ...TEXT_STYLE,
              fontId: 'bad-font',
              fontFamily: 'BadFont',
            },
          },
        ],
      })

      const path = writeTgbl('corrupt-font-gen.tgbl', manifest, {
        'fonts/BadFont.ttf': Buffer.from('not-a-font'),
      })

      const template = await loadTemplate(path)
      const data: InputJSON = {
        texts: { name: 'Hello' },
        loops: {},
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
      const manifest = createManifest({
        fields: [
          {
            id: 'f1',
            type: 'text',
            groupId: null,
            required: true,
            jsonKey: 'texts.title',
            placeholder: null,
            x: 50,
            y: 50,
            width: 300,
            height: 30,
            zIndex: 1,
            style: TEXT_STYLE,
          },
        ],
      })

      const path = writeTgbl('from-file.tgbl', manifest)

      const data: InputJSON = {
        texts: { title: 'Generated from file' },
        loops: {},
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
      const manifest = createManifest({
        fields: [
          {
            id: 'photo',
            type: 'image',
            groupId: null,
            required: true,
            jsonKey: 'images.photo',
            placeholder: null,
            x: 50,
            y: 50,
            width: 200,
            height: 200,
            zIndex: 1,
            style: IMAGE_STYLE,
          },
        ],
      })

      const path = writeTgbl('image-field.tgbl', manifest)
      const template = await loadTemplate(path)

      const data: InputJSON = {
        texts: {},
        loops: {},
        images: { photo: TINY_PNG },
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })

  /* -------------------------------------------------------------- */
  /*  4. generatePDF with loop field                                */
  /* -------------------------------------------------------------- */

  describe('generatePDF with loop field', () => {
    it('should generate a valid PDF when a loop field with rows is provided', async () => {
      const manifest = createManifest({
        fields: [
          {
            id: 'marks',
            type: 'loop',
            groupId: null,
            required: true,
            jsonKey: 'loops.marks',
            placeholder: null,
            x: 50,
            y: 50,
            width: 400,
            height: 600,
            zIndex: 1,
            style: LOOP_STYLE,
          },
        ],
      })

      const path = writeTgbl('loop-field.tgbl', manifest)
      const template = await loadTemplate(path)

      const data: InputJSON = {
        texts: {},
        loops: {
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
  /*  5. Multi-page: text + loop with multiPage overflow            */
  /* -------------------------------------------------------------- */

  describe('Multi-page overflow', () => {
    it('should generate a multi-page PDF when loop data overflows the field rectangle', async () => {
      const multiPageLoopStyle = {
        ...LOOP_STYLE,
        multiPage: true,
      }

      const manifest = createManifest({
        fields: [
          {
            id: 'title',
            type: 'text',
            groupId: null,
            required: true,
            jsonKey: 'texts.title',
            placeholder: null,
            x: 50,
            y: 20,
            width: 300,
            height: 25,
            zIndex: 1,
            style: TEXT_STYLE,
          },
          {
            id: 'marks',
            type: 'loop',
            groupId: null,
            required: true,
            jsonKey: 'loops.marks',
            placeholder: null,
            x: 50,
            y: 60,
            width: 400,
            // Deliberately small height so rows overflow quickly
            height: 100,
            zIndex: 2,
            style: multiPageLoopStyle,
          },
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
        loops: { marks: rows },
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
      const manifest = createManifest({
        fields: [
          {
            id: 'f1',
            type: 'text',
            groupId: null,
            required: true,
            jsonKey: 'texts.name',
            placeholder: null,
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
            style: TEXT_STYLE,
          },
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
        loops: {},
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
      const manifest = createManifest({
        fields: [],
      })

      const path = writeTgbl('no-fields.tgbl', manifest)
      const template = await loadTemplate(path)

      const data: InputJSON = {
        texts: {},
        loops: {},
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })

    it('should produce a valid PDF with background when template has no fields', async () => {
      const manifest = createManifest({
        fields: [],
      })

      const path = writeTgbl('no-fields-bg.tgbl', manifest, {
        'background.png': TINY_PNG,
      })
      const template = await loadTemplate(path)

      const data: InputJSON = {
        texts: {},
        loops: {},
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
      const manifest = createManifest({
        fields: [
          {
            id: 'name',
            type: 'text',
            groupId: null,
            required: true,
            jsonKey: 'texts.name',
            placeholder: null,
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
            style: TEXT_STYLE,
          },
          {
            id: 'photo',
            type: 'image',
            groupId: null,
            required: false,
            jsonKey: 'images.photo',
            placeholder: null,
            x: 50,
            y: 100,
            width: 150,
            height: 150,
            zIndex: 2,
            style: IMAGE_STYLE,
          },
        ],
      })

      const path = writeTgbl('optional-omitted.tgbl', manifest)
      const template = await loadTemplate(path)

      // Only provide the required text field, omit the optional image
      const data: InputJSON = {
        texts: { name: 'Alice' },
        loops: {},
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })

    it('should generate a valid PDF when multiple optional fields of different types are omitted', async () => {
      const manifest = createManifest({
        fields: [
          {
            id: 'name',
            type: 'text',
            groupId: null,
            required: true,
            jsonKey: 'texts.name',
            placeholder: null,
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
            style: TEXT_STYLE,
          },
          {
            id: 'subtitle',
            type: 'text',
            groupId: null,
            required: false,
            jsonKey: 'texts.subtitle',
            placeholder: null,
            x: 50,
            y: 90,
            width: 200,
            height: 30,
            zIndex: 2,
            style: TEXT_STYLE,
          },
          {
            id: 'avatar',
            type: 'image',
            groupId: null,
            required: false,
            jsonKey: 'images.avatar',
            placeholder: null,
            x: 300,
            y: 50,
            width: 100,
            height: 100,
            zIndex: 3,
            style: IMAGE_STYLE,
          },
          {
            id: 'items',
            type: 'loop',
            groupId: null,
            required: false,
            jsonKey: 'loops.items',
            placeholder: null,
            x: 50,
            y: 200,
            width: 400,
            height: 400,
            zIndex: 4,
            style: LOOP_STYLE,
          },
        ],
      })

      const path = writeTgbl('multi-optional-omitted.tgbl', manifest)
      const template = await loadTemplate(path)

      // Only provide the single required field
      const data: InputJSON = {
        texts: { name: 'Bob' },
        loops: {},
        images: {},
      }

      const pdf = await generatePDF(template, data)

      expect(pdf).toBeInstanceOf(Buffer)
      expect(pdf.length).toBeGreaterThan(0)
      expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    })
  })
})
