import PDFDocument from 'pdfkit'
import type { LoadedTemplate, TemplateManifest } from '@template-goblin/types'
import { TemplateGoblinError } from '@template-goblin/types'
import { registerFonts } from '../src/utils/font.js'

function createDoc(): InstanceType<typeof PDFDocument> {
  return new PDFDocument({ size: [595, 842], margin: 0 })
}

function createManifest(fonts: TemplateManifest['fonts'] = []): TemplateManifest {
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
    fonts,
    groups: [],
    pages: [],
    fields: [],
  }
}

function createLoadedTemplate(
  fonts: TemplateManifest['fonts'],
  fontBuffers: Map<string, Buffer>,
): LoadedTemplate {
  return {
    manifest: createManifest(fonts),
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: fontBuffers,
    placeholders: new Map(),
  }
}

describe('registerFonts', () => {
  it('should return an empty map when there are no fonts', () => {
    const doc = createDoc()
    const template = createLoadedTemplate([], new Map())

    const fontMap = registerFonts(doc, template)

    expect(fontMap).toBeInstanceOf(Map)
    expect(fontMap.size).toBe(0)
  })

  it('should throw FONT_LOAD_FAILED when font buffer is missing', () => {
    const doc = createDoc()
    const template = createLoadedTemplate(
      [{ id: 'font-1', name: 'Missing Font', filename: 'missing.ttf' }],
      new Map(), // no buffers — the font entry exists in manifest but not in the map
    )

    expect(() => registerFonts(doc, template)).toThrow(TemplateGoblinError)
    try {
      registerFonts(doc, template)
    } catch (err) {
      expect(err).toBeInstanceOf(TemplateGoblinError)
      expect((err as TemplateGoblinError).code).toBe('FONT_LOAD_FAILED')
      expect((err as TemplateGoblinError).message).toContain('missing.ttf')
      expect((err as TemplateGoblinError).message).toContain('font-1')
    }
  })

  it('should return a map with font IDs when fonts are registered', () => {
    const doc = createDoc()
    // PDFKit accepts any buffer at registration time (validation is deferred to render).
    // We verify that registerFonts correctly populates the map with fontId entries.
    const fontBuffer = Buffer.from('fake-font-data')
    const template = createLoadedTemplate(
      [
        { id: 'font-1', name: 'Font One', filename: 'font1.ttf' },
        { id: 'font-2', name: 'Font Two', filename: 'font2.ttf' },
      ],
      new Map([
        ['font-1', fontBuffer],
        ['font-2', fontBuffer],
      ]),
    )

    const fontMap = registerFonts(doc, template)

    expect(fontMap).toBeInstanceOf(Map)
    expect(fontMap.size).toBe(2)
    expect(fontMap.get('font-1')).toBe('font-1')
    expect(fontMap.get('font-2')).toBe('font-2')
  })
})
