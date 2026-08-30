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
    width: 595,
    height: 842,
    pageSize: 'A4',
  }
  const p1: PageDefinition = {
    id: 'p1',
    index: 1,
    backgroundType: 'image',
    backgroundColor: null,
    backgroundFilename: 'bg1.png',
    width: 842,
    height: 1191,
    pageSize: 'A3',
  }
  const p2: PageDefinition = {
    id: 'p2',
    index: 2,
    backgroundType: 'inherit',
    backgroundColor: null,
    backgroundFilename: null,
    width: 1000,
    height: 1200,
    pageSize: 'custom',
  }

  const f0_text: Partial<FieldDefinition> = { id: 'f0_text', type: 'text', pageId: 'p0' }
  const f0_text2: Partial<FieldDefinition> = { id: 'f0_text2', type: 'text', pageId: 'p0' }
  const f1_image: Partial<FieldDefinition> = { id: 'f1_image', type: 'image', pageId: 'p1' }
  const f2_table: Partial<FieldDefinition> = { id: 'f2_table', type: 'table', pageId: 'p2' }
  const f2_text: Partial<FieldDefinition> = { id: 'f2_text', type: 'text', pageId: 'p2' }

  beforeEach(() => {
    useTemplateStore.setState({
      pages: [p0, p1, p2],
      fields: [
        f0_text as FieldDefinition,
        f0_text2 as FieldDefinition,
        f1_image as FieldDefinition,
        f2_table as FieldDefinition,
        f2_text as FieldDefinition,
      ],
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
    expect(fields.find((f) => f.id === 'f2_table')?.pageId).toBe('p2')
    expect(fields.find((f) => f.id === 'f0_text')?.pageId).toBe('p0')
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

  it('preserves all field data types and pageId links across page swapping', () => {
    useTemplateStore.getState().reorderPages(2, 0)
    const fields = useTemplateStore.getState().fields

    expect(fields.find((f) => f.id === 'f0_text')?.pageId).toBe('p0')
    expect(fields.find((f) => f.id === 'f0_text2')?.pageId).toBe('p0')
    expect(fields.find((f) => f.id === 'f1_image')?.pageId).toBe('p1')
    expect(fields.find((f) => f.id === 'f2_table')?.pageId).toBe('p2')
    expect(fields.find((f) => f.id === 'f2_text')?.pageId).toBe('p2')
  })

  it('preserves distinct page dimensions (width/height) at new array positions', () => {
    useTemplateStore.getState().reorderPages(2, 0)
    const pages = useTemplateStore.getState().pages.sort((a, b) => a.index - b.index)

    // Position 0 is now p2 (1000 x 1200)
    expect(pages[0]?.id).toBe('p2')
    expect(pages[0]?.width).toBe(1000)
    expect(pages[0]?.height).toBe(1200)

    // Position 1 is now p0 (595 x 842)
    expect(pages[1]?.id).toBe('p0')
    expect(pages[1]?.width).toBe(595)
    expect(pages[1]?.height).toBe(842)

    // Position 2 is now p1 (842 x 1191)
    expect(pages[2]?.id).toBe('p1')
    expect(pages[2]?.width).toBe(842)
    expect(pages[2]?.height).toBe(1191)
  })

  it('preserves background types (color, image, inherit) and properties', () => {
    useTemplateStore.getState().reorderPages(1, 0)
    const pages = useTemplateStore.getState().pages.sort((a, b) => a.index - b.index)

    expect(pages[0]?.id).toBe('p1')
    expect(pages[0]?.backgroundType).toBe('image')
    expect(pages[0]?.backgroundFilename).toBe('bg1.png')

    expect(pages[1]?.id).toBe('p0')
    expect(pages[1]?.backgroundType).toBe('color')
    expect(pages[1]?.backgroundColor).toBe('#ffffff')

    expect(pages[2]?.id).toBe('p2')
    expect(pages[2]?.backgroundType).toBe('inherit')
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
