/**
 * #61 — save / load round-trip for header, footer, and pageNumber config.
 *
 * Regression target: the first cut of #61 added bands to the store but
 * forgot to include them in the manifest written by `saveTemplate`. Users
 * lost every band setting (height, divider, padding, band fields, page
 * number) whenever they reopened the `.tgbl` file. This test pins the
 * round-trip so the fix can't silently regress.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import JSZip from 'jszip'

const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

vi.stubGlobal(
  'Blob',
  class BlobStub {
    constructor(
      public parts: unknown[],
      public opts: { type?: string } = {},
    ) {}
    get type() {
      return this.opts.type ?? ''
    }
  },
)

import { openTemplate } from '../saveOpen.js'
import { useTemplateStore } from '../../store/templateStore.js'

const HEADER_TEXT_ID = 'header-text-1'
const FOOTER_IMG_ID = 'footer-img-1'

function buildManifestWithBands() {
  return {
    version: '1.0',
    meta: {
      name: 'Bands',
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
    pages: [],
    fields: [],
    header: {
      style: {
        height: 40,
        backgroundColor: '#f5f5f5',
        divider: { color: '#888888', width: 0.5, gap: 4 },
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 12,
        paddingRight: 12,
      },
      fields: [
        {
          id: HEADER_TEXT_ID,
          type: 'text',
          groupId: null,
          pageId: null,
          label: 'Title',
          x: 0,
          y: 0,
          width: 200,
          height: 20,
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
            align: 'left',
            verticalAlign: 'middle',
            maxRows: 1,
            overflowMode: 'truncate',
            snapToGrid: true,
          },
          source: { mode: 'static', value: 'My Document' },
        },
      ],
      applyToFirstPage: true,
    },
    footer: {
      style: {
        height: 30,
        backgroundColor: null,
        divider: { color: '#888888', width: 0.5, gap: 4 },
        paddingTop: 4,
        paddingBottom: 4,
        paddingLeft: 12,
        paddingRight: 12,
      },
      fields: [
        {
          id: FOOTER_IMG_ID,
          type: 'image',
          groupId: null,
          pageId: null,
          label: 'Logo',
          x: 0,
          y: 0,
          width: 20,
          height: 20,
          zIndex: 1,
          style: { fit: 'contain' },
          source: { mode: 'static', value: { filename: 'logo.png' } },
        },
      ],
      applyToFirstPage: false,
    },
    pageNumber: {
      enabled: true,
      placement: 'footer',
      align: 'center',
      color: '#333333',
      numeralStyle: 'roman',
      fontFamily: 'Helvetica',
      fontSize: 10,
      showOnFirstPage: false,
    },
  }
}

async function buildTgbl(manifest: object): Promise<File> {
  const zip = new JSZip()
  zip.file('manifest.json', JSON.stringify(manifest))
  const blob = await zip.generateAsync({ type: 'arraybuffer' })
  return new File([blob], 'tpl.tgbl', { type: 'application/zip' })
}

beforeEach(() => {
  storage.clear()
  useTemplateStore.getState().reset()
})

describe('openTemplate — band restoration (#61)', () => {
  it('rehydrates header, footer, and pageNumber from manifest.json', async () => {
    const file = await buildTgbl(buildManifestWithBands())
    await openTemplate(file)
    const s = useTemplateStore.getState()

    expect(s.header).toBeDefined()
    expect(s.header?.style.height).toBe(40)
    expect(s.header?.style.divider?.color).toBe('#888888')
    expect(s.header?.applyToFirstPage).toBe(true)
    expect(s.header?.fields).toHaveLength(1)
    expect(s.header?.fields[0]?.id).toBe(HEADER_TEXT_ID)

    expect(s.footer).toBeDefined()
    expect(s.footer?.style.height).toBe(30)
    expect(s.footer?.applyToFirstPage).toBe(false)
    expect(s.footer?.fields[0]?.id).toBe(FOOTER_IMG_ID)

    expect(s.pageNumber?.enabled).toBe(true)
    expect(s.pageNumber?.placement).toBe('footer')
    expect(s.pageNumber?.numeralStyle).toBe('roman')
    expect(s.pageNumber?.showOnFirstPage).toBe(false)
  })

  it('legacy manifest without bands leaves header/footer/pageNumber undefined', async () => {
    const m = buildManifestWithBands()
    // Strip the band fields the way a pre-#61 archive would look.
    const legacy = { ...m } as Partial<ReturnType<typeof buildManifestWithBands>>
    delete legacy.header
    delete legacy.footer
    delete legacy.pageNumber
    const file = await buildTgbl(legacy)
    await openTemplate(file)
    const s = useTemplateStore.getState()
    expect(s.header).toBeUndefined()
    expect(s.footer).toBeUndefined()
    expect(s.pageNumber).toBeUndefined()
  })

  it('opening a pre-#61 archive over a band-using store wipes the bands', async () => {
    // Seed the store with bands, then open a legacy archive. The bands
    // must disappear — otherwise leftover band state from the previous
    // template leaks into the freshly-opened one.
    useTemplateStore.getState().setHeader({
      style: {
        height: 30,
        backgroundColor: null,
        divider: null,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      },
      fields: [],
      applyToFirstPage: true,
    })
    expect(useTemplateStore.getState().header).toBeDefined()

    const m = buildManifestWithBands()
    const legacy = { ...m } as Partial<ReturnType<typeof buildManifestWithBands>>
    delete legacy.header
    delete legacy.footer
    delete legacy.pageNumber
    await openTemplate(await buildTgbl(legacy))
    expect(useTemplateStore.getState().header).toBeUndefined()
  })
})
