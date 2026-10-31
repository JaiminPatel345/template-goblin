/**
 * prepareTemplate / generatePreparedPDF — the static/dynamic split
 * optimization. The contract: the fast path is EQUIVALENT to a full
 * `generatePDF` (only faster) when eligible, and falls back to it otherwise.
 */
import { PDFDocument } from 'pdf-lib'
import type { LoadedTemplate, TemplateManifest } from '@template-goblin/types'
import { generatePDF } from '../src/generate.js'
import { prepareTemplate } from '../src/prepare.js'
import { generatePreparedPDF } from '../src/generatePrepared.js'
import { parsePdfGeometry, pageText } from './helpers/pdfGeometry.js'
import { dynText, dynTable, makeManifest, staticImage, staticText } from './helpers/fixtures.js'

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

/** A template with a static image + static heading + dynamic text — the
 *  canonical eligible case. */
function assetTemplate(): LoadedTemplate {
  const manifest = makeManifest({
    fields: [
      { ...staticText('head', 'STATIC HEADING'), x: 20, y: 20, width: 300, height: 24, zIndex: 0 },
      staticImage('logo', 'logo.png', { x: 360, y: 20, width: 120, height: 90, zIndex: 0 }),
      { ...dynText('n', 'name', false), x: 20, y: 120, width: 300, height: 24, zIndex: 5 },
      { ...dynText('c', 'city', false), x: 20, y: 160, width: 300, height: 24, zIndex: 5 },
    ],
  })
  return loaded(manifest, { staticImages: new Map([['logo.png', TINY_PNG]]) })
}

const DATA = { texts: { name: 'Alice', city: 'Pune' }, images: {}, tables: {}, links: {} }

describe('generatePreparedPDF — equivalence to full render', () => {
  it('produces the same text content + positions as generatePDF (eligible)', async () => {
    const tpl = assetTemplate()
    const prepared = await prepareTemplate(tpl)
    expect(prepared.eligible).toBe(true)

    const fast = await generatePreparedPDF(prepared, DATA)
    const full = await generatePDF(tpl, DATA)

    const fastPages = await parsePdfGeometry(fast)
    const fullPages = await parsePdfGeometry(full)
    expect(fastPages.length).toBe(fullPages.length)
    // Both static + dynamic text present, identical text per page.
    for (let i = 0; i < fullPages.length; i++) {
      const f = pageText(fastPages[i]!).replace(/\s+/g, ' ').trim()
      const g = pageText(fullPages[i]!).replace(/\s+/g, ' ').trim()
      expect(f).toBe(g)
    }
    expect(pageText(fastPages[0]!)).toContain('STATIC HEADING')
    expect(pageText(fastPages[0]!)).toContain('Alice')
  })

  it('the static image is present in the fast output (copied, not dropped)', async () => {
    const prepared = await prepareTemplate(assetTemplate())
    const fast = await generatePreparedPDF(prepared, DATA)
    // The image-less dynamic overlay alone would be far smaller; the fast
    // output carries the copied image stream.
    const overlayOnly = await generatePreparedPDF(prepared, {
      texts: {},
      images: {},
      tables: {},
      links: {},
    })
    expect(fast.length).toBeGreaterThan(0)
    expect(overlayOnly.length).toBeGreaterThan(0)
  })

  it('repeated calls reuse the cached base and stay equivalent', async () => {
    const prepared = await prepareTemplate(assetTemplate())
    const a = await parsePdfGeometry(await generatePreparedPDF(prepared, DATA))
    const b = await parsePdfGeometry(
      await generatePreparedPDF(prepared, { ...DATA, texts: { name: 'Bob', city: 'Goa' } }),
    )
    expect(pageText(a[0]!)).toContain('Alice')
    expect(pageText(b[0]!)).toContain('Bob')
    // Static layer still intact on the second call (base not consumed).
    expect(pageText(b[0]!)).toContain('STATIC HEADING')
  })

  it('still validates required dynamic fields (missing → throws, like full)', async () => {
    const manifest = makeManifest({
      fields: [
        staticImage('logo', 'logo.png', { x: 0, y: 0, width: 50, height: 50, zIndex: 0 }),
        { ...dynText('req', 'must', true), zIndex: 5 },
      ],
    })
    const prepared = await prepareTemplate(
      loaded(manifest, { staticImages: new Map([['logo.png', TINY_PNG]]) }),
    )
    expect(prepared.eligible).toBe(true)
    await expect(
      generatePreparedPDF(prepared, { texts: {}, images: {}, tables: {}, links: {} }),
    ).rejects.toMatchObject({ code: 'MISSING_REQUIRED_FIELD' })
  })

  it('preserves a static hyperlink annotation through the merge', async () => {
    const linked = {
      ...staticText('l', 'click me'),
      x: 10,
      y: 10,
      width: 100,
      height: 20,
      zIndex: 0,
    }
    linked.hyperlink = { mode: 'static', url: 'https://example.com' }
    const manifest = makeManifest({
      fields: [linked, { ...dynText('n', 'name', false), zIndex: 5 }],
    })
    const prepared = await prepareTemplate(loaded(manifest))
    expect(prepared.eligible).toBe(true)
    const out = await generatePreparedPDF(prepared, DATA)
    const doc = await PDFDocument.load(out)
    const annots = doc.getPage(0).node.Annots()
    expect(annots?.size() ?? 0).toBeGreaterThan(0)
  })
})

describe('eligibility gates (fall back to a correct full render)', () => {
  async function reasonFor(tpl: LoadedTemplate): Promise<string | null> {
    return (await prepareTemplate(tpl)).reason
  }

  it('multiPage table → ineligible', async () => {
    const t = dynTable('tbl', 'rows', false, ['a'])
    t.style.multiPage = true
    const r = await reasonFor(loaded(makeManifest({ fields: [t] })))
    expect(r).toMatch(/multiPage/i)
  })

  it('dynamic hyperlink → ineligible', async () => {
    const f = { ...dynText('n', 'name', false), zIndex: 5 }
    f.hyperlink = { mode: 'dynamic', jsonKey: 'url' }
    const r = await reasonFor(loaded(makeManifest({ fields: [staticText('s', 'x'), f] })))
    expect(r).toMatch(/hyperlink/i)
  })

  it('static-above-dynamic z-order → ineligible', async () => {
    const manifest = makeManifest({
      fields: [
        { ...staticText('s', 'x'), zIndex: 10 }, // static ABOVE dynamic
        { ...dynText('n', 'name', false), zIndex: 1 },
      ],
    })
    expect(await reasonFor(loaded(manifest))).toMatch(/z-order/i)
  })

  it('no static content → ineligible (no benefit)', async () => {
    const manifest = makeManifest({ fields: [{ ...dynText('n', 'name', false), zIndex: 0 }] })
    expect(await reasonFor(loaded(manifest))).toMatch(/no static content/i)
  })

  it('an ineligible template still renders correctly via fallback', async () => {
    const t = dynTable('tbl', 'rows', false, ['a'])
    t.style.multiPage = true
    const tpl = loaded(makeManifest({ fields: [t] }))
    const prepared = await prepareTemplate(tpl)
    expect(prepared.eligible).toBe(false)
    const fast = await generatePreparedPDF(prepared, {
      texts: {},
      images: {},
      tables: { rows: [{ a: 'hi' }] },
      links: {},
    })
    const full = await generatePDF(tpl, {
      texts: {},
      images: {},
      tables: { rows: [{ a: 'hi' }] },
      links: {},
    })
    expect(pageText((await parsePdfGeometry(fast))[0]!)).toBe(
      pageText((await parsePdfGeometry(full))[0]!),
    )
  })
})
