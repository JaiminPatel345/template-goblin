import type {
  LoadedTemplate,
  TableField,
  TemplateManifest,
  TextField,
} from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { dynText, dynTable, makeManifest } from './helpers/fixtures.js'
import { parsePdfGeometry } from './helpers/pdfGeometry.js'

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

describe('Backend PDF Generation for Conditional Styling', () => {
  const textField: TextField = {
    ...dynText('txt_status', 'status_key', false),
    x: 50,
    y: 50,
    width: 300,
    height: 50,
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
    conditionalStyles: {
      enabled: true,
      conditions: [
        {
          id: 'cond_default',
          name: 'default_rule',
          isDefault: true,
          style: { fontSize: 14, color: '#0000ff' },
        },
        {
          id: 'cond_large',
          name: 'large_alert',
          isDefault: false,
          style: { fontSize: 28, color: '#ff0000' },
        },
        {
          id: 'cond_small',
          name: 'small_muted',
          isDefault: false,
          style: { fontSize: 8, color: '#888888' },
        },
      ],
    },
  }

  it('generates PDF reflecting active condition font size and geometry', async () => {
    const manifest = makeManifest({ fields: [textField] })
    const pdf = await generatePDF(loaded(manifest), {
      texts: { status_key: 'OVERDUE NOTICE' },
      images: {},
      tables: {},
      condition: [{ status_key: 'large_alert' }],
    })

    expect(pdf.length).toBeGreaterThan(0)
    const pages = await parsePdfGeometry(pdf)
    expect(pages.length).toBe(1)
    const run = pages[0]?.texts[0]
    expect(run?.str).toBe('OVERDUE NOTICE')
    expect(run?.fontHeight).toBeCloseTo(28, 0)
  })

  it('renders with small font size when small condition is requested', async () => {
    const manifest = makeManifest({ fields: [textField] })
    const pdf = await generatePDF(loaded(manifest), {
      texts: { status_key: 'OVERDUE NOTICE' },
      images: {},
      tables: {},
      condition: [{ status_key: 'small_muted' }],
    })

    const pages = await parsePdfGeometry(pdf)
    const run = pages[0]?.texts[0]
    expect(run?.str).toBe('OVERDUE NOTICE')
    expect(run?.fontHeight).toBeCloseTo(8, 0)
  })

  it('falls back to isDefault rule when condition is not provided or not matching', async () => {
    const manifest = makeManifest({ fields: [textField] })
    const pdf = await generatePDF(loaded(manifest), {
      texts: { status_key: 'OVERDUE NOTICE' },
      images: {},
      tables: {},
      condition: [],
    })

    const pages = await parsePdfGeometry(pdf)
    const run = pages[0]?.texts[0]
    expect(run?.str).toBe('OVERDUE NOTICE')
    expect(run?.fontHeight).toBeCloseTo(14, 0)
  })

  it('honors options.condition when passed via generatePDF options', async () => {
    const manifest = makeManifest({ fields: [textField] })
    const pdf = await generatePDF(
      loaded(manifest),
      {
        texts: { status_key: 'OVERDUE NOTICE' },
        images: {},
        tables: {},
      },
      {
        condition: [{ status_key: 'large_alert' }],
      },
    )

    const pages = await parsePdfGeometry(pdf)
    const run = pages[0]?.texts[0]
    expect(run?.str).toBe('OVERDUE NOTICE')
    expect(run?.fontHeight).toBeCloseTo(28, 0)
  })

  it('generates PDF with table field conditional style overrides', async () => {
    const tableField: TableField = {
      ...dynTable('tbl_items', 'items_key', false, ['desc', 'price']),
      x: 30,
      y: 100,
      width: 400,
      height: 200,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'tbl_cond_compact',
            name: 'compact',
            isDefault: false,
            style: {
              headerStyle: { fontSize: 8 },
              rowStyle: { fontSize: 7, color: '#999999' },
            },
          },
        ],
      },
    }

    const manifest = makeManifest({ fields: [tableField] })
    const pdf = await generatePDF(loaded(manifest), {
      texts: {},
      images: {},
      tables: {
        items_key: [
          { desc: 'Widget A', price: '$10.00' },
          { desc: 'Widget B', price: '$25.00' },
        ],
      },
      condition: [{ items_key: 'compact' }],
    })

    expect(pdf.length).toBeGreaterThan(0)
    const pages = await parsePdfGeometry(pdf)
    expect(pages.length).toBe(1)
    const textStrs = pages[0]?.texts.map((r) => r.str) ?? []
    expect(textStrs).toContain('desc')
    expect(textStrs).toContain('Widget A')
    expect(textStrs).toContain('$10.00')

    // Find row item text and check font size
    const widgetRun = pages[0]?.texts.find((r) => r.str === 'Widget A')
    expect(widgetRun?.fontHeight).toBeCloseTo(7, 0)
  })

  it('simultaneously applies condition overrides across multiple fields in single payload', async () => {
    const tableField: TableField = {
      ...dynTable('tbl_items', 'items_key', false, ['desc', 'price']),
      x: 30,
      y: 120,
      width: 400,
      height: 100,
      conditionalStyles: {
        enabled: true,
        conditions: [
          {
            id: 'tbl_cond_compact',
            name: 'compact',
            isDefault: false,
            style: { rowStyle: { fontSize: 7 } },
          },
        ],
      },
    }

    const manifest = makeManifest({ fields: [textField, tableField] })
    const pdf = await generatePDF(loaded(manifest), {
      texts: { status_key: 'ALERT STATUS' },
      images: {},
      tables: {
        items_key: [{ desc: 'Item 1', price: '$5.00' }],
      },
      condition: [{ status_key: 'large_alert' }, { items_key: 'compact' }],
    })

    const pages = await parsePdfGeometry(pdf)
    const textRun = pages[0]?.texts.find((r) => r.str === 'ALERT STATUS')
    const itemRun = pages[0]?.texts.find((r) => r.str === 'Item 1')

    // Text field got large_alert (28pt)
    expect(textRun?.fontHeight).toBeCloseTo(28, 0)
    // Table field got compact (7pt)
    expect(itemRun?.fontHeight).toBeCloseTo(7, 0)
  })

  it('rejects malformed condition inputs at validation boundary', async () => {
    const manifest = makeManifest({ fields: [textField] })

    await expect(
      generatePDF(loaded(manifest), {
        texts: { status_key: 'Test' },
        images: {},
        tables: {},
        condition: 'not-an-array' as unknown as [],
      }),
    ).rejects.toThrow(/condition must be an array of key-to-condition mappings/i)
  })
})
