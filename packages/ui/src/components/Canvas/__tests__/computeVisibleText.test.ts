/**
 * @vitest-environment jsdom
 */
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

  // Mock global document to provide a stubbed canvas context.
  // We need getMeasureCtx to return something with measureText.
  // The actual textMeasure.ts tries to create a canvas and falls back to null if no document.
  // However, in tests we can mock the canvas context or it might already be provided by jsdom.
  // Let's assume jsdom provides a basic canvas, but we'll test the core logic.

  it('returns null if the bounding box height is smaller than a single line height', () => {
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: () => ({
            measureText: (text: string) => ({ width: text.length * 10 }),
          }),
        } as unknown as HTMLCanvasElement
      }
      return originalCreateElement(tagName)
    })

    // 12px font * 1.2 line height = 14.4px
    // If box height is 10px, maxLines should evaluate to 0 and it should return null.
    const visible = computeVisibleText('Hello World', baseStyle, 12, 100, 10)
    expect(visible).toBeNull()

    vi.restoreAllMocks()
  })

  it('returns text if bounding box is large enough for at least one line', () => {
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return {
          getContext: () => ({
            measureText: (text: string) => ({ width: text.length * 10 }),
          }),
        } as unknown as HTMLCanvasElement
      }
      return originalCreateElement(tagName)
    })

    // 12px font * 1.2 line height = 14.4px
    // If box height is 20px, it fits one line.
    const visible = computeVisibleText('A', baseStyle, 12, 100, 20)
    expect(typeof visible).toBe('string')

    vi.restoreAllMocks()
  })
})
