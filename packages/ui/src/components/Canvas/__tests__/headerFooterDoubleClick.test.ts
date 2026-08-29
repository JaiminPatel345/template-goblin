// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../../../store/templateStore.js'
import { useUiStore } from '../../../store/uiStore.js'
import type { PageBand } from '@template-goblin/types'

describe('Header / Footer double-click settings trigger', () => {
  beforeEach(() => {
    useTemplateStore.setState({
      meta: { ...useTemplateStore.getState().meta, width: 595, height: 842 },
      pages: [
        {
          id: 'page-1',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
          width: 595,
          height: 842,
          pageSize: 'A4',
        },
      ],
      header: undefined,
      footer: undefined,
    })
    useUiStore.setState({
      currentPageId: 'page-1',
      pageLayoutSettings: null,
    })
  })

  it('opens Header settings when double-clicking in enabled Header band Y-range [0, height]', () => {
    const header: PageBand = {
      enabled: true,
      applyToFirstPage: true,
      fields: [],
      style: {
        height: 60,
        backgroundColor: null,
        paddingTop: 10,
        paddingBottom: 10,
        paddingLeft: 10,
        paddingRight: 10,
        divider: null,
      },
    }
    useTemplateStore.setState({ header })

    // Simulate click at y = 30 (inside [0, 60])
    const templateState = useTemplateStore.getState()
    const uiState = useUiStore.getState()
    const pt = { x: 100, y: 30 }

    const headerActive =
      templateState.header &&
      templateState.header.enabled !== false &&
      templateState.header.style.height > 0
    const inHeaderArea = headerActive && pt.y >= 0 && pt.y <= templateState.header!.style.height

    if (inHeaderArea) {
      uiState.setPageLayoutSettings('header')
    }

    expect(useUiStore.getState().pageLayoutSettings).toBe('header')
  })

  it('opens Footer settings when double-clicking in enabled Footer band Y-range [pageHeight - height, pageHeight]', () => {
    const footer: PageBand = {
      enabled: true,
      applyToFirstPage: true,
      fields: [],
      style: {
        height: 40,
        backgroundColor: null,
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 5,
        paddingRight: 5,
        divider: null,
      },
    }
    useTemplateStore.setState({ footer })

    // Page height 842, footer height 40 -> footer top = 802. Click at y = 820
    const templateState = useTemplateStore.getState()
    const uiState = useUiStore.getState()
    const pt = { x: 100, y: 820 }

    const footerActive =
      templateState.footer &&
      templateState.footer.enabled !== false &&
      templateState.footer.style.height > 0
    const footerTop = templateState.meta.height - (templateState.footer?.style.height ?? 0)
    const inFooterArea = footerActive && pt.y >= footerTop && pt.y <= templateState.meta.height

    if (inFooterArea) {
      uiState.setPageLayoutSettings('footer')
    }

    expect(useUiStore.getState().pageLayoutSettings).toBe('footer')
  })

  it('does NOT open settings when double-clicking in body zone between header and footer', () => {
    const header: PageBand = {
      enabled: true,
      applyToFirstPage: true,
      fields: [],
      style: {
        height: 60,
        backgroundColor: null,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        divider: null,
      },
    }
    const footer: PageBand = {
      enabled: true,
      applyToFirstPage: true,
      fields: [],
      style: {
        height: 40,
        backgroundColor: null,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        divider: null,
      },
    }
    useTemplateStore.setState({ header, footer })

    // Click at y = 400 (body zone)
    const templateState = useTemplateStore.getState()
    const uiState = useUiStore.getState()
    const pt = { x: 100, y: 400 }

    const headerActive =
      templateState.header &&
      templateState.header.enabled !== false &&
      templateState.header.style.height > 0
    const inHeaderArea = headerActive && pt.y >= 0 && pt.y <= templateState.header!.style.height

    const footerActive =
      templateState.footer &&
      templateState.footer.enabled !== false &&
      templateState.footer.style.height > 0
    const footerTop = templateState.meta.height - (templateState.footer?.style.height ?? 0)
    const inFooterArea = footerActive && pt.y >= footerTop && pt.y <= templateState.meta.height

    if (inHeaderArea) uiState.setPageLayoutSettings('header')
    else if (inFooterArea) uiState.setPageLayoutSettings('footer')

    expect(useUiStore.getState().pageLayoutSettings).toBeNull()
  })

  it('does NOT open settings if header is disabled (enabled = false)', () => {
    const header: PageBand = {
      enabled: false,
      applyToFirstPage: true,
      fields: [],
      style: {
        height: 60,
        backgroundColor: null,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        divider: null,
      },
    }
    useTemplateStore.setState({ header })

    const templateState = useTemplateStore.getState()
    const uiState = useUiStore.getState()
    const pt = { x: 100, y: 30 }

    const headerActive =
      templateState.header &&
      templateState.header.enabled !== false &&
      templateState.header.style.height > 0
    const inHeaderArea = headerActive && pt.y >= 0 && pt.y <= templateState.header!.style.height

    if (inHeaderArea) uiState.setPageLayoutSettings('header')

    expect(useUiStore.getState().pageLayoutSettings).toBeNull()
  })
})
