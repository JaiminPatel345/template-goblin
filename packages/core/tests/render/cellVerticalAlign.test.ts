/**
 * Tests for the cell verticalAlign resolver.
 *
 * Pre-fix the table renderer always rendered cell text at
 * `startY + paddingTop`, ignoring the editor's vAlign toggle. The
 * plain-text renderer already honoured the same flag — these tests
 * pin the table-cell parity.
 */
import { resolveCellTextY } from '../../src/render/cellVerticalAlign.js'

describe('resolveCellTextY', () => {
  // Cell at y=100, 40 tall, fontSize 12, paddings 4/4.
  const startY = 100
  const rowHeight = 40
  const fontSize = 12
  const padTop = 4
  const padBottom = 4

  it('top → startY + paddingTop', () => {
    expect(resolveCellTextY(startY, rowHeight, fontSize, padTop, padBottom, 'top')).toBe(104)
  })

  it('middle → centred inside the cell', () => {
    // (40 - 12) / 2 = 14 → 100 + 14 = 114
    expect(resolveCellTextY(startY, rowHeight, fontSize, padTop, padBottom, 'middle')).toBe(114)
  })

  it('bottom → flush to the bottom inside paddingBottom', () => {
    // 100 + 40 - 4 - 12 = 124
    expect(resolveCellTextY(startY, rowHeight, fontSize, padTop, padBottom, 'bottom')).toBe(124)
  })

  it('top with zero padding stays at startY', () => {
    expect(resolveCellTextY(0, 30, 10, 0, 0, 'top')).toBe(0)
  })

  it('middle with asymmetric paddings still centres on rowHeight', () => {
    // verticalAlign: middle ignores paddings on purpose — the cell
    // box is the source of truth for vertical centring.
    expect(resolveCellTextY(0, 30, 10, 0, 12, 'middle')).toBe(10)
  })

  it('bottom respects paddingBottom even with asymmetric paddings', () => {
    // 0 + 30 - 6 - 10 = 14
    expect(resolveCellTextY(0, 30, 10, 0, 6, 'bottom')).toBe(14)
  })

  it('large fontSize relative to rowHeight: middle can produce a negative offset from startY', () => {
    // A cell shorter than its font + paddings has the text leaking
    // upward when centred. The renderer's clip rect handles the
    // visible bound; the resolver itself shouldn't clamp.
    // (10 - 12) / 2 = -1 → startY 0 + -1 = -1
    expect(resolveCellTextY(0, 10, 12, 0, 0, 'middle')).toBe(-1)
  })
})
