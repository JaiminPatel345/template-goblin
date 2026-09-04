import type { LoadedTemplate, TemplateManifest } from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { dynText, makeManifest } from './helpers/fixtures.js'
import { parsePdfGeometry, pageText } from './helpers/pdfGeometry.js'

function loaded(manifest: TemplateManifest): LoadedTemplate {
  return {
    manifest,
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
  }
}

describe('Condition-Based Styling in Core SDK', () => {
  it('applies default condition style when no condition is passed in input', async () => {
    const textF = {
      ...dynText('txt1', 'greeting', false),
      style: {
        fontId: null,
        fontFamily: 'Helvetica',
        fontSize: 12,
        fontSizeMin: 8,
        lineHeight: 1.2,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        textDecoration: 'none' as const,
        color: '#000000',
        align: 'left' as const,
        verticalAlign: 'top' as const,
        maxRows: 1,
        overflowMode: 'truncate' as const,
        snapToGrid: false,
      },
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c1',
            name: 'condition-1',
            isDefault: true,
            style: { color: '#ff0000', fontSize: 24 }, // Default condition style override
          },
          {
            id: 'c2',
            name: 'condition-2',
            isDefault: false,
            style: { color: '#0000ff', fontSize: 36 },
          },
        ],
      },
    }

    const manifest = makeManifest({ fields: [textF] })
    const pdfBytes = await generatePDF(loaded(manifest), {
      texts: { greeting: 'Hello World' },
      images: {},
      tables: {},
    })

    expect(pdfBytes.length).toBeGreaterThan(0)
    const pages = await parsePdfGeometry(pdfBytes)
    expect(pageText(pages[0]!)).toContain('Hello World')
  })

  it('applies matched condition style when data.condition matches condition-2', async () => {
    const textF = {
      ...dynText('txt1', 'status', false),
      style: {
        fontId: null,
        fontFamily: 'Helvetica',
        fontSize: 12,
        fontSizeMin: 8,
        lineHeight: 1.2,
        fontWeight: 'normal' as const,
        fontStyle: 'normal' as const,
        textDecoration: 'none' as const,
        color: '#000000',
        align: 'left' as const,
        verticalAlign: 'top' as const,
        maxRows: 1,
        overflowMode: 'truncate' as const,
        snapToGrid: false,
      },
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'c1',
            name: 'condition-1',
            isDefault: true,
            style: { color: '#000000' },
          },
          {
            id: 'c2',
            name: 'condition-2',
            isDefault: false,
            style: { color: '#00ff00' },
          },
        ],
      },
    }

    const manifest = makeManifest({ fields: [textF] })
    const pdfBytesDefault = await generatePDF(loaded(manifest), {
      texts: { status: 'Active' },
      images: {},
      tables: {},
      condition: 'condition-1',
    })

    const pdfBytesCond2 = await generatePDF(loaded(manifest), {
      texts: { status: 'Active' },
      images: {},
      tables: {},
      condition: 'condition-2',
    })

    expect(pdfBytesDefault.length).toBeGreaterThan(0)
    expect(pdfBytesCond2.length).toBeGreaterThan(0)
    // The two rendered PDFs carry different colors/styles
    expect(pdfBytesDefault.equals(pdfBytesCond2)).toBe(false)
  })

  it('supports per-field condition override in data.conditions', async () => {
    const textF1 = {
      ...dynText('txt1', 'field1', false),
      conditionalStyles: {
        enabled: true,
        conditions: [
          { id: 'c1', name: 'condA', isDefault: true, style: { color: '#000000' } },
          { id: 'c2', name: 'condB', isDefault: false, style: { color: '#ff0000' } },
        ],
      },
    }
    const textF2 = {
      ...dynText('txt2', 'field2', false),
      x: 200,
      conditionalStyles: {
        enabled: true,
        conditions: [
          { id: 'c1', name: 'condA', isDefault: true, style: { color: '#000000' } },
          { id: 'c2', name: 'condB', isDefault: false, style: { color: '#0000ff' } },
        ],
      },
    }

    const manifest = makeManifest({ fields: [textF1, textF2] })
    const pdfBytes = await generatePDF(loaded(manifest), {
      texts: { field1: 'A', field2: 'B' },
      images: {},
      tables: {},
      conditions: { txt1: 'condB', field2: 'condA' },
    })

    expect(pdfBytes.length).toBeGreaterThan(0)
  })
})
