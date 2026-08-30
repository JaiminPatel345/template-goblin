import { describe, it, expect, vi } from 'vitest'
import { computeVisibleText, type ResolvedTextStyle } from '../textMeasure.js'

describe('computeVisibleText', () => {
  const baseStyle: ResolvedTextStyle = {
    fontFamily: 'Helvetica',
    fontSize: 12,
    fontSizeMin: 6,
    color: '#000000',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.2,
    maxRows: 3,
    overflowMode: 'truncate',
  }

  function mockDocumentCanvas() {
    const mockCanvas = {
      getContext: () => ({
        measureText: (text: string) => ({ width: text.length * 10 }),
      }),
    } as unknown as HTMLCanvasElement

    if (typeof globalThis.document === 'undefined') {
      vi.stubGlobal('document', {
        createElement: (tagName: string) => {
          if (tagName === 'canvas') return mockCanvas
          return {}
        },
      })
    } else {
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') return mockCanvas
        return document.createElement(tagName)
      })
    }
  }

  it('returns null if the bounding box height is smaller than a single line height', () => {
    mockDocumentCanvas()

    // 12px font * 1.2 line height = 14.4px
    // If box height is 10px, maxLines should evaluate to 0 and it should return null.
    const visible = computeVisibleText('Hello World', baseStyle, 12, 100, 10)
    expect(visible).toBeNull()

    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('returns text if bounding box is large enough for at least one line', () => {
    mockDocumentCanvas()

    // 12px font * 1.2 line height = 14.4px
    // If box height is 20px, it fits one line.
    const visible = computeVisibleText('A', baseStyle, 12, 100, 20)
    expect(typeof visible).toBe('string')

    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})
