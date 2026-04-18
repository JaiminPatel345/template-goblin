import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generatePDF } from '../src/generate.js'
import type {
  FieldDefinition,
  InputJSON,
  PageDefinition,
  TemplateManifest,
} from '@template-goblin/types'
import { dynText, makeManifest } from './helpers/fixtures.js'

const TEST_DIR = join(tmpdir(), 'tg-test-multipage-' + Date.now())

/** 1x1 transparent PNG for image backgrounds */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
)

/** Build a base manifest, merging any overrides */
function createManifest(overrides: Partial<TemplateManifest> = {}): TemplateManifest {
  return makeManifest({
    meta: { ...makeManifest().meta, name: 'Test', maxPages: 10 },
    ...overrides,
  })
}

/** Build a text field assigned to a page */
function textField(
  id: string,
  jsonKey: string,
  pageId: string | null,
  zIndex = 1,
): FieldDefinition {
  return dynText(id, jsonKey, false, {
    pageId,
    x: 50,
    y: 50,
    width: 200,
    height: 30,
    zIndex,
  })
}

/** Write a .tgbl ZIP to disk and return the path */
function writeTgbl(filename: string, zip: AdmZip): string {
  const path = join(TEST_DIR, filename)
  writeFileSync(path, zip.toBuffer())
  return path
}

/** Build a ZIP from a manifest, optionally adding background images for pages */
function buildZip(
  manifest: TemplateManifest,
  pageImages?: Map<string, Buffer>,
  legacyBackground?: Buffer,
): AdmZip {
  const zip = new AdmZip()
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))

  if (legacyBackground) {
    zip.addFile('background.png', legacyBackground)
  }

  if (pageImages) {
    for (const [filename, buf] of pageImages) {
      zip.addFile(filename, buf)
    }
  }

  return zip
}

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterAll(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
})

describe('Multi-page PDF generation', () => {
  it('should generate a single-page PDF when no pages array is present (backward compat)', async () => {
    const manifest = createManifest({
      pages: [],
      fields: [textField('f1', 'title', null)],
    })

    const zip = buildZip(manifest)
    const path = writeTgbl('single-page-compat.tgbl', zip)
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { title: 'Hello' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)

    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should generate a PDF with two pages using image backgrounds', async () => {
    const pages: PageDefinition[] = [
      {
        id: 'page-0',
        index: 0,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/page-0.png',
      },
      {
        id: 'page-1',
        index: 1,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/page-1.png',
      },
    ]

    const manifest = createManifest({
      pages,
      fields: [textField('f1', 'title', 'page-0'), textField('f2', 'subtitle', 'page-1')],
    })

    const pageImages = new Map<string, Buffer>([
      ['backgrounds/page-0.png', TINY_PNG],
      ['backgrounds/page-1.png', TINY_PNG],
    ])

    const zip = buildZip(manifest, pageImages)
    const path = writeTgbl('two-pages-image.tgbl', zip)
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { title: 'Page One', subtitle: 'Page Two' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)

    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should generate a PDF with a solid color background page', async () => {
    const pages: PageDefinition[] = [
      {
        id: 'page-red',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#ff0000',
        backgroundFilename: null,
      },
    ]

    const manifest = createManifest({
      pages,
      fields: [textField('f1', 'heading', 'page-red')],
    })

    const zip = buildZip(manifest)
    const path = writeTgbl('color-background.tgbl', zip)
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { heading: 'Red Page' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)

    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should generate a PDF with an inherit background page', async () => {
    const pages: PageDefinition[] = [
      {
        id: 'page-0',
        index: 0,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/page-0.png',
      },
      {
        id: 'page-1',
        index: 1,
        backgroundType: 'inherit',
        backgroundColor: null,
        backgroundFilename: null,
      },
    ]

    const manifest = createManifest({
      pages,
      fields: [textField('f1', 'title', 'page-0'), textField('f2', 'body', 'page-1')],
    })

    const pageImages = new Map<string, Buffer>([['backgrounds/page-0.png', TINY_PNG]])

    const zip = buildZip(manifest, pageImages)
    const path = writeTgbl('inherit-background.tgbl', zip)
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { title: 'First', body: 'Second (inherited bg)' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)

    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should render fields on their assigned pages via pageId', async () => {
    const pages: PageDefinition[] = [
      {
        id: 'pg-a',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        backgroundFilename: null,
      },
      {
        id: 'pg-b',
        index: 1,
        backgroundType: 'color',
        backgroundColor: '#eeeeee',
        backgroundFilename: null,
      },
    ]

    const manifest = createManifest({
      pages,
      fields: [
        textField('field-a1', 'name', 'pg-a', 1),
        textField('field-a2', 'email', 'pg-a', 2),
        textField('field-b1', 'address', 'pg-b', 1),
      ],
    })

    const zip = buildZip(manifest)
    const path = writeTgbl('fields-on-pages.tgbl', zip)
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { name: 'Alice', email: 'alice@example.com', address: '123 Main St' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)

    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should render fields with null pageId on the first page (index 0)', async () => {
    const pages: PageDefinition[] = [
      {
        id: 'pg-first',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        backgroundFilename: null,
      },
      {
        id: 'pg-second',
        index: 1,
        backgroundType: 'color',
        backgroundColor: '#cccccc',
        backgroundFilename: null,
      },
    ]

    const manifest = createManifest({
      pages,
      fields: [
        // These fields have pageId: null — should render on page 0
        textField('legacy-1', 'greeting', null, 1),
        textField('legacy-2', 'footer', null, 2),
        // This field is explicitly on page 1
        textField('page1-f', 'note', 'pg-second', 1),
      ],
    })

    const zip = buildZip(manifest)
    const path = writeTgbl('null-pageid.tgbl', zip)
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { greeting: 'Welcome', footer: 'Bye', note: 'See page 2' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)

    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })

  it('should render an empty page (no fields) with only its background', async () => {
    const pages: PageDefinition[] = [
      {
        id: 'pg-empty',
        index: 0,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/page-0.png',
      },
    ]

    const manifest = createManifest({
      pages,
      fields: [], // no fields at all
    })

    const pageImages = new Map<string, Buffer>([['backgrounds/page-0.png', TINY_PNG]])

    const zip = buildZip(manifest, pageImages)
    const path = writeTgbl('empty-page.tgbl', zip)
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

  it('should generate a PDF with three pages of mixed background types', async () => {
    const pages: PageDefinition[] = [
      {
        id: 'p0',
        index: 0,
        backgroundType: 'image',
        backgroundColor: null,
        backgroundFilename: 'backgrounds/page-0.png',
      },
      {
        id: 'p1',
        index: 1,
        backgroundType: 'color',
        backgroundColor: '#00ff00',
        backgroundFilename: null,
      },
      {
        id: 'p2',
        index: 2,
        backgroundType: 'inherit',
        backgroundColor: null,
        backgroundFilename: null,
      },
    ]

    const manifest = createManifest({
      pages,
      fields: [
        textField('t0', 'page0', 'p0', 1),
        textField('t1', 'page1', 'p1', 1),
        textField('t2', 'page2', 'p2', 1),
      ],
    })

    const pageImages = new Map<string, Buffer>([['backgrounds/page-0.png', TINY_PNG]])

    const zip = buildZip(manifest, pageImages)
    const path = writeTgbl('three-pages-mixed.tgbl', zip)
    const template = await loadTemplate(path)

    const data: InputJSON = {
      texts: { page0: 'Image BG', page1: 'Color BG', page2: 'Inherited BG' },
      tables: {},
      images: {},
    }

    const pdf = await generatePDF(template, data)

    expect(pdf).toBeInstanceOf(Buffer)
    expect(pdf.length).toBeGreaterThan(0)
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
  })
})
