import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../templateStore.js'
import { useUiStore } from '../uiStore.js'
import { currentPageBandContext } from '../../components/Canvas/bandGeometry.js'
import type { PageDefinition, PageBand } from '@template-goblin/types'

describe('Page Resize in Page Layout (issue #111)', () => {
  const p0: PageDefinition = {
    id: 'p0',
    index: 0,
    backgroundType: 'color',
    backgroundColor: '#ffffff',
    backgroundFilename: null,
    width: 595,
    height: 842,
    pageSize: 'A4',
  }
  const p1: PageDefinition = {
    id: 'p1',
    index: 1,
    backgroundType: 'color',
    backgroundColor: '#ffffff',
    backgroundFilename: null,
    width: 595,
    height: 842,
    pageSize: 'A4',
  }

  const header: PageBand = {
    enabled: true,
    applyToFirstPage: true,
    style: {
      height: 50,
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 5,
      paddingBottom: 5,
      backgroundColor: '#ffffff',
      divider: { color: '#000000', width: 1, gap: 0 },
    },
    fields: [],
  }
  const footer: PageBand = {
    enabled: true,
    applyToFirstPage: true,
    style: {
      height: 60,
      paddingLeft: 10,
      paddingRight: 10,
      paddingTop: 5,
      paddingBottom: 5,
      backgroundColor: '#ffffff',
      divider: { color: '#000000', width: 1, gap: 0 },
    },
    fields: [],
  }

  beforeEach(() => {
    useTemplateStore.setState({
      meta: {
        name: 'Test',
        unit: 'pt',
        width: 595,
        height: 842,
        pageSize: 'A4',
        locked: false,
        maxPages: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      pages: [p0, p1],
      header,
      footer,
      fields: [],
      groups: [],
    })
    useUiStore.setState({
      currentPageId: 'p0',
      pageLayoutMenu: { kind: 'closed' },
      pageLayoutSettings: null,
    })
  })

  it('updates page 0 dimensions and meta, repositioning footer band to pageHeight - footerHeight', () => {
    // Resize Page 0 to custom (1000 x 1200)
    useTemplateStore.getState().updatePage('p0', { pageSize: 'custom', width: 1000, height: 1200 })

    const store = useTemplateStore.getState()
    const page0 = store.pages.find((p) => p.id === 'p0')

    expect(page0?.width).toBe(1000)
    expect(page0?.height).toBe(1200)

    // Current page band context resolves pageHeight = 1200
    const ctx = currentPageBandContext()
    expect(ctx.pageHeight).toBe(1200)
    expect(ctx.header?.style.height).toBe(50)
    expect(ctx.footer?.style.height).toBe(60)

    // Footer top Y is pageHeight - footerHeight = 1200 - 60 = 1140
    const footerTop = ctx.pageHeight - (ctx.footer?.style.height ?? 0)
    expect(footerTop).toBe(1140)
  })

  it('resizes currently active page only in multi-page templates (page 1 resized, page 0 unchanged)', () => {
    useUiStore.setState({ currentPageId: 'p1' })

    // Resize Page 1 to A3 (842 x 1191)
    useTemplateStore.getState().updatePage('p1', { pageSize: 'A3', width: 842, height: 1191 })

    const store = useTemplateStore.getState()
    const page0 = store.pages.find((p) => p.id === 'p0')
    const page1 = store.pages.find((p) => p.id === 'p1')

    // Page 0 remains A4 (595 x 842)
    expect(page0?.width).toBe(595)
    expect(page0?.height).toBe(842)

    // Page 1 is now A3 (842 x 1191)
    expect(page1?.width).toBe(842)
    expect(page1?.height).toBe(1191)

    // Footer top Y on Page 1 is 1191 - 60 = 1131
    const ctxP1 = currentPageBandContext()
    expect(ctxP1.pageHeight).toBe(1191)
    expect(ctxP1.pageHeight - (ctxP1.footer?.style.height ?? 0)).toBe(1131)

    // Switch back to Page 0
    useUiStore.setState({ currentPageId: 'p0' })
    const ctxP0 = currentPageBandContext()
    expect(ctxP0.pageHeight).toBe(842)
    expect(ctxP0.pageHeight - (ctxP0.footer?.style.height ?? 0)).toBe(782)
  })

  it('preserves body field absolute coordinates during page resize', () => {
    const field = {
      id: 'f1',
      pageId: 'p0',
      x: 100,
      y: 200,
      width: 150,
      height: 40,
      type: 'text',
      zIndex: 1,
    }
    useTemplateStore.setState({ fields: [field as any] })

    useTemplateStore.getState().updatePage('p0', { width: 400, height: 600 })

    const f = useTemplateStore.getState().fields.find((item) => item.id === 'f1')
    expect(f?.x).toBe(100)
    expect(f?.y).toBe(200)
  })

  it('updates pageLayoutMenu and pageLayoutSettings store state for resizePage', () => {
    useUiStore.getState().setPageLayoutMenu({ kind: 'flyout', target: 'resizePage' })
    expect(useUiStore.getState().pageLayoutMenu).toEqual({ kind: 'flyout', target: 'resizePage' })

    useUiStore.getState().setPageLayoutSettings('resizePage')
    expect(useUiStore.getState().pageLayoutSettings).toBe('resizePage')
  })
})
