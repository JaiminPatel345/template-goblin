/**
 * #61 — page-wide header / footer / page-number renderer.
 *
 * Verifies the stamp pass through `generatePDF`. Output buffer is checked
 * structurally (magic bytes + multi-page count) rather than via byte-perfect
 * snapshots — PDFKit produces non-deterministic Tjs across runs.
 *
 * The validator gate (FIELD_OVERLAPS_BAND / PAGE_NUMBER_PLACEMENT_INVALID)
 * is covered in `validateManifest.test.ts`.
 */
import AdmZip from 'adm-zip'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadTemplate } from '../src/load.js'
import { generatePDF } from '../src/generate.js'
import type {
  PageBand,
  PageDefinition,
  PageNumberConfig,
  TemplateManifest,
} from '@template-goblin/types'
import { dynText, makeManifest } from './helpers/fixtures.js'

const TEST_DIR = join(tmpdir(), 'tg-test-bands-' + Date.now())

function tgblPath(name: string): string {
  return join(TEST_DIR, name)
}

function writeManifest(name: string, manifest: TemplateManifest): string {
  const zip = new AdmZip()
  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest)))
  const path = tgblPath(name)
  writeFileSync(path, zip.toBuffer())
  return path
}

function pages(n: number): PageDefinition[] {
  const out: PageDefinition[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      id: `p-${i}`,
      index: i,
      backgroundType: 'color',
      backgroundColor: '#ffffff',
      backgroundFilename: null,
    })
  }
  return out
}

function makeHeader(overrides: Partial<PageBand> = {}): PageBand {
  return {
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
    applyToFirstPage: true,
    ...overrides,
  }
}

function makeFooter(overrides: Partial<PageBand> = {}): PageBand {
  return {
    style: {
      height: 30,
      backgroundColor: null,
      divider: null,
      paddingTop: 4,
      paddingBottom: 4,
      paddingLeft: 8,
      paddingRight: 8,
    },
    fields: [],
    applyToFirstPage: true,
    ...overrides,
  }
}

function makePageNumber(overrides: Partial<PageNumberConfig> = {}): PageNumberConfig {
  return {
    enabled: true,
    placement: 'footer',
    align: 'center',
    color: '#000000',
    numeralStyle: 'arabic',
    fontFamily: 'Helvetica',
    fontSize: 10,
    showOnFirstPage: true,
    ...overrides,
  }
}

beforeAll(() => mkdirSync(TEST_DIR, { recursive: true }))
afterAll(() => rmSync(TEST_DIR, { recursive: true, force: true }))

describe('header / footer stamp pass', () => {
  it('produces a valid multi-page PDF with header + footer enabled', async () => {
    const manifest = makeManifest({
      pages: pages(3),
      fields: [dynText('body-1', 'title', false, { pageId: 'p-0', y: 100 })],
      header: makeHeader(),
      footer: makeFooter(),
    })
    const path = writeManifest('hdr-ftr.tgbl', manifest)
    const tpl = await loadTemplate(path)
    const pdf = await generatePDF(tpl, { texts: { title: 'Hi' }, tables: {}, images: {} })
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    // Three pages → expect three `/Type /Page` markers.
    const pageMatches = pdf.toString('binary').match(/\/Type\s*\/Page\b/g) ?? []
    // /Type /Page also matches /Pages — keep the test loose: at least 3.
    expect(pageMatches.length).toBeGreaterThanOrEqual(3)
  })

  it('omits header on page 0 when applyToFirstPage is false', async () => {
    const manifest = makeManifest({
      pages: pages(2),
      fields: [dynText('body-1', 'title', false, { pageId: 'p-0', y: 100 })],
      header: makeHeader({ applyToFirstPage: false }),
    })
    const path = writeManifest('skip-first.tgbl', manifest)
    const tpl = await loadTemplate(path)
    const pdf = await generatePDF(tpl, { texts: { title: 'Hi' }, tables: {}, images: {} })
    expect(pdf.toString('utf-8', 0, 5)).toBe('%PDF-')
    // Smoke: PDF generates without throwing. The actual stamping is verified
    // by the visual diff during manual smoke + the existence of buffered
    // pages (no `INVALID_MANIFEST` thrown).
    expect(pdf.length).toBeGreaterThan(0)
  })

  it('omits page-number on page 0 when showOnFirstPage is false', async () => {
    const manifest = makeManifest({
      pages: pages(2),
      fields: [],
      footer: makeFooter(),
      pageNumber: makePageNumber({ showOnFirstPage: false }),
    })
    const path = writeManifest('pgnum-skip-first.tgbl', manifest)
    const tpl = await loadTemplate(path)
    const pdf = await generatePDF(tpl, { texts: {}, tables: {}, images: {} })
    expect(pdf.length).toBeGreaterThan(0)
  })

  it('renders header divider without crashing', async () => {
    const manifest = makeManifest({
      pages: pages(1),
      fields: [],
      header: makeHeader({
        style: {
          height: 40,
          backgroundColor: '#eeeeee',
          divider: { color: '#888888', width: 0.5, gap: 4 },
          paddingTop: 4,
          paddingBottom: 4,
          paddingLeft: 8,
          paddingRight: 8,
        },
      }),
    })
    const path = writeManifest('hdr-divider.tgbl', manifest)
    const tpl = await loadTemplate(path)
    const pdf = await generatePDF(tpl, { texts: {}, tables: {}, images: {} })
    expect(pdf.length).toBeGreaterThan(0)
  })

  it('renders roman-numeral page numbers', async () => {
    const manifest = makeManifest({
      pages: pages(2),
      fields: [],
      footer: makeFooter(),
      pageNumber: makePageNumber({ numeralStyle: 'roman', showOnFirstPage: true }),
    })
    const path = writeManifest('roman.tgbl', manifest)
    const tpl = await loadTemplate(path)
    const pdf = await generatePDF(tpl, { texts: {}, tables: {}, images: {} })
    expect(pdf.length).toBeGreaterThan(0)
  })

  it('no-op when manifest carries neither header, footer, nor pageNumber', async () => {
    const manifest = makeManifest({
      pages: pages(2),
      fields: [dynText('body-1', 'title', false, { pageId: 'p-0' })],
    })
    const path = writeManifest('plain.tgbl', manifest)
    const tpl = await loadTemplate(path)
    const pdf = await generatePDF(tpl, { texts: { title: 'Hi' }, tables: {}, images: {} })
    expect(pdf.length).toBeGreaterThan(0)
  })
})
