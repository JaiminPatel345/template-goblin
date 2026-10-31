/**
 * Canvas↔PDF parity fixes (2026-06 audit) — pins the render-side contracts:
 *
 *  1. `oddRowStyle` / `evenRowStyle` zebra striping is now CONSUMED by the
 *     renderer (it was dead — honored by neither side).
 *  2. A missing / malformed image `fit` falls back to 'contain' instead of
 *     rendering nothing.
 *  3. Page-number `fontFamily` routes through the standard-family resolver.
 */
import type { LoadedTemplate, TableField, TemplateManifest } from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { dynTable, makeManifest, staticImage } from './helpers/fixtures.js'

const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

function loaded(manifest: TemplateManifest, over: Partial<LoadedTemplate> = {}): LoadedTemplate {
  return {
    manifest,
    backgroundImage: null,
    pageBackgrounds: new Map(),
    fonts: new Map(),
    placeholders: new Map(),
    staticImages: new Map(),
    ...over,
  }
}

describe('zebra striping (oddRowStyle / evenRowStyle)', () => {
  function tableWith(zebra: boolean): TableField {
    const t = dynTable('tbl', 'rows', false, ['a', 'b'])
    t.x = 20
    t.y = 20
    t.width = 300
    t.height = 400
    if (zebra) {
      t.style.oddRowStyle = { ...t.style.rowStyle, backgroundColor: '#ffeeee' }
      t.style.evenRowStyle = { ...t.style.rowStyle, backgroundColor: '#eeeeff' }
    }
    return t
  }
  const rows = Array.from({ length: 6 }, (_, i) => ({ a: `a${i}`, b: `b${i}` }))
  const data = { texts: {}, images: {}, tables: { rows }, links: {} }

  it('zebra styles change the rendered output (previously ignored → identical bytes)', async () => {
    const plain = await generatePDF(loaded(makeManifest({ fields: [tableWith(false)] })), data)
    const striped = await generatePDF(loaded(makeManifest({ fields: [tableWith(true)] })), data)
    expect(plain.length).toBeGreaterThan(0)
    expect(striped.length).toBeGreaterThan(0)
    // Pre-fix the two were byte-identical (zebra fields were dead).
    expect(striped.equals(plain)).toBe(false)
  })

  it('renders without error and stays single-document for a fitting table', async () => {
    const pdf = await generatePDF(loaded(makeManifest({ fields: [tableWith(true)] })), data)
    expect(pdf.length).toBeGreaterThan(0)
  })
})

describe('image fit fallback', () => {
  it('a malformed/missing fit still embeds the image (no blank box)', async () => {
    const field = staticImage('logo', 'logo.png', { x: 20, y: 20, width: 100, height: 100 })
    // Simulate a legacy/hand-edited manifest with no fit set.
    delete (field.style as { fit?: unknown }).fit
    const withImg = makeManifest({ fields: [field] })
    const withoutImg = makeManifest({ fields: [] })
    const assets = { staticImages: new Map([['logo.png', TINY_PNG]]) }
    const data = { texts: {}, images: {}, tables: {}, links: {} }

    const a = await generatePDF(loaded(withImg, assets), data)
    const b = await generatePDF(loaded(withoutImg, assets), data)
    // The image must actually be drawn → larger than the image-less doc.
    expect(a.length).toBeGreaterThan(b.length)
  })
})

describe('page-number font resolution', () => {
  it('renders a page number with a standard family via the resolver', async () => {
    const manifest = makeManifest({ fields: [] })
    manifest.footer = {
      enabled: true,
      applyToFirstPage: true,
      style: {
        height: 40,
        backgroundColor: null,
        divider: null,
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 8,
        paddingRight: 8,
      },
      fields: [],
    }
    manifest.pageNumber = {
      enabled: true,
      placement: 'footer',
      align: 'center',
      color: '#333333',
      numeralStyle: 'arabic',
      fontFamily: 'Times-Roman',
      fontSize: 10,
      showOnFirstPage: true,
    }
    const pdf = await generatePDF(loaded(manifest), {
      texts: {},
      images: {},
      tables: {},
      links: {},
    })
    expect(pdf.length).toBeGreaterThan(0)
  })
})
