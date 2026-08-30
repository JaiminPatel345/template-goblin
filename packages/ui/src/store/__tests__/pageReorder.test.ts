import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../templateStore.js'
import { useUiStore } from '../uiStore.js'
import type { PageDefinition, FieldDefinition } from '@template-goblin/types'

describe('Page reordering (issue #59)', () => {
  const p0: PageDefinition = {
    id: 'p0',
    index: 0,
    backgroundType: 'color',
    backgroundColor: '#ffffff',
    backgroundFilename: null,
  }
  const p1: PageDefinition = {
    id: 'p1',
    index: 1,
    backgroundType: 'color',
    backgroundColor: '#ff0000',
    backgroundFilename: null,
  }
  const p2: PageDefinition = {
    id: 'p2',
    index: 2,
    backgroundType: 'color',
    backgroundColor: '#00ff00',
    backgroundFilename: null,
  }

  const f0: Partial<FieldDefinition> = { id: 'f0', pageId: 'p0' }
  const f1: Partial<FieldDefinition> = { id: 'f1', pageId: 'p1' }
  const f2: Partial<FieldDefinition> = { id: 'f2', pageId: 'p2' }

  beforeEach(() => {
    useTemplateStore.setState({
      pages: [p0, p1, p2],
      fields: [f0 as FieldDefinition, f1 as FieldDefinition, f2 as FieldDefinition],
      history: [],
      historyIndex: -1,
    })
    useUiStore.setState({ currentPageId: 'p2' })
  })

  it('reorders page at end to start (2 -> 0)', () => {
    useTemplateStore.getState().reorderPages(2, 0)
    const pages = useTemplateStore.getState().pages.sort((a, b) => a.index - b.index)

    expect(pages).toHaveLength(3)
    expect(pages[0]?.id).toBe('p2')
    expect(pages[0]?.index).toBe(0)
    expect(pages[1]?.id).toBe('p0')
    expect(pages[1]?.index).toBe(1)
    expect(pages[2]?.id).toBe('p1')
    expect(pages[2]?.index).toBe(2)

    // Current page in UI store remains unchanged by ID ('p2')
    expect(useUiStore.getState().currentPageId).toBe('p2')

    // Field pageId associations remain untouched
    const fields = useTemplateStore.getState().fields
    expect(fields.find((f) => f.id === 'f2')?.pageId).toBe('p2')
    expect(fields.find((f) => f.id === 'f0')?.pageId).toBe('p0')
  })

  it('reorders page at start to end (0 -> 2)', () => {
    useTemplateStore.getState().reorderPages(0, 2)
    const pages = useTemplateStore.getState().pages.sort((a, b) => a.index - b.index)

    expect(pages[0]?.id).toBe('p1')
    expect(pages[0]?.index).toBe(0)
    expect(pages[1]?.id).toBe('p2')
    expect(pages[1]?.index).toBe(1)
    expect(pages[2]?.id).toBe('p0')
    expect(pages[2]?.index).toBe(2)
  })

  it('no-op on drop-on-self (1 -> 1)', () => {
    const historyBefore = useTemplateStore.getState().history.length
    useTemplateStore.getState().reorderPages(1, 1)

    expect(useTemplateStore.getState().history.length).toBe(historyBefore)
    const pages = useTemplateStore.getState().pages.sort((a, b) => a.index - b.index)
    expect(pages[0]?.id).toBe('p0')
    expect(pages[1]?.id).toBe('p1')
    expect(pages[2]?.id).toBe('p2')
  })

  it('no-op on out-of-bounds index', () => {
    useTemplateStore.getState().reorderPages(-1, 1)
    useTemplateStore.getState().reorderPages(0, 99)

    const pages = useTemplateStore.getState().pages.sort((a, b) => a.index - b.index)
    expect(pages[0]?.id).toBe('p0')
    expect(pages[1]?.id).toBe('p1')
    expect(pages[2]?.id).toBe('p2')
  })

  it('preserves per-page background image mappings when pages are reordered', () => {
    const bgUrls = new Map<string, string>([
      ['p0', 'data:image/png;base64,P0BG'],
      ['p2', 'data:image/png;base64,P2BG'],
    ])
    const bgBuffers = new Map<string, ArrayBuffer>([
      ['p0', new ArrayBuffer(8)],
      ['p2', new ArrayBuffer(16)],
    ])

    useTemplateStore.setState({
      pageBackgroundDataUrls: bgUrls,
      pageBackgroundBuffers: bgBuffers,
    })

    useTemplateStore.getState().reorderPages(2, 0)

    const state = useTemplateStore.getState()
    expect(state.pageBackgroundDataUrls.get('p2')).toBe('data:image/png;base64,P2BG')
    expect(state.pageBackgroundDataUrls.get('p0')).toBe('data:image/png;base64,P0BG')
    expect(state.pageBackgroundBuffers.get('p2')?.byteLength).toBe(16)
    expect(state.pageBackgroundBuffers.get('p0')?.byteLength).toBe(8)
  })
})
