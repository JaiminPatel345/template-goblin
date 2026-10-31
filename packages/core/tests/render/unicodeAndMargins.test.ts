import { getDocument } from 'pdfjs-dist/legacy/build/pdf.js'
import { generatePDF } from '../../src/generate.js'
import type { LoadedTemplate } from '@template-goblin/types'

describe('PDF Engine Bug 1: Unicode / Indian Rupee symbol support', () => {
  it('renders Indian Rupee symbol (₹) correctly without WinAnsi corruption to ¹ or \\x00', async () => {
    const template: LoadedTemplate = {
      manifest: {
        version: '1.0',
        meta: {
          name: 'Unicode Test',
          width: 595,
          height: 842,
          pageOrientation: 'portrait',
        },
        fields: [
          {
            id: 'price',
            type: 'text',
            groupId: null,
            pageId: null,
            label: 'Price',
            x: 50,
            y: 50,
            width: 200,
            height: 30,
            zIndex: 1,
            style: {
              fontId: null,
              fontFamily: 'Helvetica',
              fontSize: 12,
              fontSizeMin: 8,
              lineHeight: 1.2,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              color: '#000000',
              backgroundColor: null,
              align: 'left',
              verticalAlign: 'top',
              maxRows: 1,
              overflowMode: 'truncate',
              snapToGrid: false,
            },
            source: {
              mode: 'dynamic',
              jsonKey: 'price',
              required: true,
              placeholder: '₹125',
            },
          },
        ],
        pages: [],
        fonts: [],
        groups: [],
      },
      fonts: new Map(),
      staticImages: new Map(),
      pageBackgrounds: new Map(),
      backgroundImage: null,
    }

    const pdfBuffer = await generatePDF(template, {
      texts: {
        price: '₹125',
      },
    })

    const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise
    const page = await pdf.getPage(1)
    const content = await page.getTextContent()
    const extractedStrings = content.items.map((item) => ('str' in item ? item.str : ''))

    // MUST contain the actual Indian Rupee symbol ₹
    expect(extractedStrings.join('')).toContain('₹125')
    // MUST NOT be corrupted into WinAnsi '¹125' or missing glyph '\x00125'
    expect(extractedStrings.join('')).not.toContain('¹125')
    expect(extractedStrings.join('')).not.toContain('\x00125')
  })
})

describe('PDF Engine Bug 2: Exact alignment and margin parity with canvas', () => {
  it('right-aligned text field right edge matches bounding box x + width exactly without unwanted margin', async () => {
    const template: LoadedTemplate = {
      manifest: {
        version: '1.0',
        meta: {
          name: 'Margin Test',
          width: 595,
          height: 842,
          pageOrientation: 'portrait',
        },
        fields: [
          {
            id: 'val_delivery_charge',
            type: 'text',
            groupId: null,
            pageId: null,
            label: 'Delivery Charge Value',
            x: 460,
            y: 446,
            width: 90,
            height: 16,
            zIndex: 1,
            style: {
              fontId: null,
              fontFamily: 'Helvetica',
              fontSize: 10,
              fontSizeMin: 8,
              lineHeight: 1.2,
              fontWeight: 'normal',
              fontStyle: 'normal',
              textDecoration: 'none',
              color: '#000000',
              backgroundColor: null,
              align: 'right',
              verticalAlign: 'top',
              maxRows: 1,
              overflowMode: 'truncate',
              snapToGrid: false,
            },
            source: {
              mode: 'dynamic',
              jsonKey: 'delivery_charge',
              required: true,
              placeholder: '₹30',
            },
          },
        ],
        pages: [],
        fonts: [],
        groups: [],
      },
      fonts: new Map(),
      staticImages: new Map(),
      pageBackgrounds: new Map(),
      backgroundImage: null,
    }

    const pdfBuffer = await generatePDF(template, {
      texts: {
        delivery_charge: '₹30',
      },
    })

    const pdf = await getDocument({ data: new Uint8Array(pdfBuffer) }).promise
    const page = await pdf.getPage(1)
    const content = await page.getTextContent()

    // Bounding box right edge is 460 + 90 = 550
    const expectedRight = 460 + 90
    const item = content.items.find((i) => 'str' in i && i.str.includes('30'))
    expect(item).toBeDefined()
    if (item && 'transform' in item) {
      const actualRight = item.transform[4] + item.width
      // Must not overshoot past the bounding box with extra margin (e.g. 557+)
      expect(Math.abs(actualRight - expectedRight)).toBeLessThanOrEqual(1.0)
    }
  })
})
