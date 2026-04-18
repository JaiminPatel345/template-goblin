import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { PageDefinition, TextField, TextFieldStyle } from '@template-goblin/types'

// ---------------------------------------------------------------------------
// Stub localStorage BEFORE importing the store (persist middleware needs it)
// ---------------------------------------------------------------------------
const storage = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
  clear: () => storage.clear(),
})

import { useTemplateStore } from '../templateStore'

function makeTextStyle(): TextFieldStyle {
  return {
    fontId: null,
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontSizeDynamic: false,
    fontSizeMin: 11,
    lineHeight: 1.2,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    align: 'left',
    verticalAlign: 'top',
    maxRows: 1,
    overflowMode: 'truncate',
    snapToGrid: true,
  }
}

describe('templateStore.reset — last-page delete', () => {
  beforeEach(() => {
    storage.clear()
    useTemplateStore.getState().reset()
  })

  it('clears fields, pages, fonts, and backgrounds', () => {
    const s = useTemplateStore.getState()
    // Seed: one field, one page, one color on page 0.
    s.setPage0BackgroundColor('#123456')
    const field: TextField = {
      id: 'f-1',
      type: 'text',
      groupId: null,
      pageId: null,
      label: '',
      source: { mode: 'dynamic', jsonKey: 'name', required: true, placeholder: null },
      x: 0,
      y: 0,
      width: 100,
      height: 20,
      zIndex: 0,
      style: makeTextStyle(),
    }
    s.addField(field)

    const pageB: PageDefinition = {
      id: 'p-b',
      index: 1,
      backgroundType: 'color',
      backgroundColor: '#ff0000',
      backgroundFilename: null,
    }
    s.addPage(pageB)

    const before = useTemplateStore.getState()
    expect(before.fields.length).toBe(1)
    expect(before.pages.length).toBe(2)

    // Last-page delete path triggers reset().
    useTemplateStore.getState().reset()

    const after = useTemplateStore.getState()
    expect(after.fields).toEqual([])
    expect(after.pages).toEqual([])
    expect(after.backgroundDataUrl).toBeNull()
    expect(after.backgroundBuffer).toBeNull()
    expect(after.fonts).toEqual([])
    expect(after.groups).toEqual([])
    expect(after.history).toEqual([])
  })
})

describe('templateStore.setPage0BackgroundColor — onboarding path', () => {
  beforeEach(() => {
    storage.clear()
    useTemplateStore.getState().reset()
  })

  it('persists color on page 0 with correct manifest fields', () => {
    useTemplateStore.getState().setPage0BackgroundColor('#abcdef')
    const s = useTemplateStore.getState()
    const page0 = s.pages.find((p) => p.index === 0)
    expect(page0).toBeDefined()
    expect(page0!.backgroundType).toBe('color')
    expect(page0!.backgroundColor).toBe('#abcdef')
    expect(page0!.backgroundFilename).toBeNull()
    // Legacy image background is cleared so it can't leak into the canvas.
    expect(s.backgroundDataUrl).toBeNull()
    expect(s.backgroundBuffer).toBeNull()
  })

  it('updates the existing page 0 instead of prepending a duplicate', () => {
    const s = useTemplateStore.getState()
    s.setPage0BackgroundColor('#111111')
    s.setPage0BackgroundColor('#222222')
    const pages = useTemplateStore.getState().pages
    expect(pages.filter((p) => p.index === 0)).toHaveLength(1)
    expect(pages.find((p) => p.index === 0)!.backgroundColor).toBe('#222222')
  })
})
