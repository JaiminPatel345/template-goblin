/**
 * Pure unit tests for the page-bounds clamp helper from
 * `usePageBoundsEnforcement.ts`. The clamp shifts an object's `left`/`top`
 * so its `getBoundingRect()` lies inside `[0, 0, pageW, pageH]`.
 *
 * These tests are the regression guard for the original #46 bug — a
 * 1280-pt-wide field on a 595-pt page rendering off the side of the
 * preview. With the clamp wired up the canvas can't put a field outside
 * the page rect in the first place.
 */
import { describe, it, expect } from 'vitest'
import { clampToPage, buildPageBoundsRect } from '../usePageBoundsEnforcement.js'

interface FakeRect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Build a fake `FabricObject`-shaped value just rich enough for `clampToPage`
 * to read its `getBoundingRect()`, mutate `left`/`top`, and re-call
 * `setCoords`. Avoids needing an actual Fabric canvas/DOM.
 */
function fakeFabricObject(initial: FakeRect) {
  const state = { ...initial }
  return {
    get left() {
      return state.left
    },
    get top() {
      return state.top
    },
    setCoords() {
      // no-op: getBoundingRect re-derives from current state
    },
    getBoundingRect() {
      return {
        left: state.left,
        top: state.top,
        width: state.width,
        height: state.height,
      }
    },
    set(updates: Partial<FakeRect>) {
      Object.assign(state, updates)
    },
    /** test-only helper to read the post-clamp position */
    _state: () => state,
  }
}

describe('clampToPage', () => {
  it('does not shift an object that is already inside the page', () => {
    const obj = fakeFabricObject({ left: 50, top: 50, width: 100, height: 100 })
    const moved = clampToPage(obj as never, 595, 842)
    expect(moved).toBe(false)
    expect(obj._state().left).toBe(50)
    expect(obj._state().top).toBe(50)
  })

  it('shifts a left-overflow object back so its left edge sits at 0', () => {
    const obj = fakeFabricObject({ left: -30, top: 100, width: 200, height: 50 })
    const moved = clampToPage(obj as never, 595, 842)
    expect(moved).toBe(true)
    expect(obj._state().left).toBe(0)
    expect(obj._state().top).toBe(100)
  })

  it('shifts a right-overflow object so its right edge sits at pageW', () => {
    // 1280-pt-wide field starting at x=10 on a 595-pt page — the exact
    // shape of the original #46 bug. After clamp it should be flush right.
    const obj = fakeFabricObject({ left: 10, top: 100, width: 1280, height: 95 })
    const moved = clampToPage(obj as never, 595, 842)
    expect(moved).toBe(true)
    // pageW - width = 595 - 1280 = -685 (object is wider than page)
    expect(obj._state().left).toBe(595 - 1280)
    expect(obj._state().top).toBe(100)
  })

  it('shifts a top-overflow object back so its top edge sits at 0', () => {
    const obj = fakeFabricObject({ left: 50, top: -20, width: 100, height: 100 })
    const moved = clampToPage(obj as never, 595, 842)
    expect(moved).toBe(true)
    expect(obj._state().left).toBe(50)
    expect(obj._state().top).toBe(0)
  })

  it('clamps both axes when the object overflows in two corners', () => {
    const obj = fakeFabricObject({ left: 600, top: 900, width: 100, height: 100 })
    const moved = clampToPage(obj as never, 595, 842)
    expect(moved).toBe(true)
    expect(obj._state().left).toBe(595 - 100)
    expect(obj._state().top).toBe(842 - 100)
  })

  // #61 — body-zone clamp: header/footer bands reserve Y-space and body
  // fields cannot intrude.
  it('clamps a body field out of the header band Y-range', () => {
    const obj = fakeFabricObject({ left: 50, top: 10, width: 100, height: 30 })
    const moved = clampToPage(obj as never, 595, 842, { header: 60 })
    expect(moved).toBe(true)
    expect(obj._state().top).toBe(60) // shifted down to the header's bottom edge
  })

  it('clamps a body field out of the footer band Y-range', () => {
    // Footer = 50pt; body must end at 842 - 50 = 792. Field bottom = 830 → shift.
    const obj = fakeFabricObject({ left: 50, top: 780, width: 100, height: 50 })
    const moved = clampToPage(obj as never, 595, 842, { footer: 50 })
    expect(moved).toBe(true)
    expect(obj._state().top).toBe(842 - 50 - 50) // top = 742
  })

  it('respects both bands simultaneously', () => {
    const obj = fakeFabricObject({ left: 50, top: 0, width: 100, height: 30 })
    const moved = clampToPage(obj as never, 595, 842, { header: 40, footer: 40 })
    expect(moved).toBe(true)
    expect(obj._state().top).toBe(40)
  })

  it('zero band heights collapse to the original page-rect clamp', () => {
    const obj = fakeFabricObject({ left: 50, top: 50, width: 100, height: 100 })
    const moved = clampToPage(obj as never, 595, 842, { header: 0, footer: 0 })
    expect(moved).toBe(false)
  })

  // #61 follow-up — a band-tagged field is clamped INSIDE its band, not
  // pushed out of it. The user's draw-to-create flow tags new fields with
  // __bandKind based on where the rect was drawn.
  it('keeps a header-band field inside the header band on drag', () => {
    const obj = fakeFabricObject({ left: 50, top: 10, width: 100, height: 20 })
    ;(obj as unknown as { __bandKind: 'header' }).__bandKind = 'header'
    // Header height = 60. The field is already inside [0, 60] → no clamp.
    const moved = clampToPage(obj as never, 595, 842, { header: 60, footer: 30 })
    expect(moved).toBe(false)
    expect(obj._state().top).toBe(10)
  })

  it('pushes a header-band field back DOWN if dragged above page top', () => {
    const obj = fakeFabricObject({ left: 50, top: -5, width: 100, height: 20 })
    ;(obj as unknown as { __bandKind: 'header' }).__bandKind = 'header'
    const moved = clampToPage(obj as never, 595, 842, { header: 60, footer: 30 })
    expect(moved).toBe(true)
    expect(obj._state().top).toBe(0)
  })

  it('pushes a header-band field UP if dragged past the header bottom edge', () => {
    // Header height 60, field height 20 → max top = 40.
    const obj = fakeFabricObject({ left: 50, top: 100, width: 100, height: 20 })
    ;(obj as unknown as { __bandKind: 'header' }).__bandKind = 'header'
    const moved = clampToPage(obj as never, 595, 842, { header: 60, footer: 30 })
    expect(moved).toBe(true)
    expect(obj._state().top).toBe(40)
  })

  it('keeps a footer-band field inside the footer band on drag', () => {
    // Footer height = 40; band Y = [802, 842]. Field at top=812, height=20 → fits.
    const obj = fakeFabricObject({ left: 50, top: 812, width: 100, height: 20 })
    ;(obj as unknown as { __bandKind: 'footer' }).__bandKind = 'footer'
    const moved = clampToPage(obj as never, 595, 842, { header: 60, footer: 40 })
    expect(moved).toBe(false)
    expect(obj._state().top).toBe(812)
  })

  it('pushes a footer-band field DOWN if dragged above the footer top edge', () => {
    // Footer band top = 842 - 40 = 802. Field at top=700 → must shift down.
    const obj = fakeFabricObject({ left: 50, top: 700, width: 100, height: 20 })
    ;(obj as unknown as { __bandKind: 'footer' }).__bandKind = 'footer'
    const moved = clampToPage(obj as never, 595, 842, { header: 60, footer: 40 })
    expect(moved).toBe(true)
    expect(obj._state().top).toBe(802)
  })
})

describe('buildPageBoundsRect — page colour fill', () => {
  // Regression guard for the save→reopen colour-spill bug: the page
  // colour MUST be carried as the page-bounds rect's `fill`, not as
  // `canvas.backgroundColor` (which would paint the whole framebuffer).
  it('carries the supplied page colour as `fill`', () => {
    const r = buildPageBoundsRect(595, 842, '#aa3939')
    expect(r.fill).toBe('#aa3939')
  })

  it('falls back to transparent fill when no colour is supplied', () => {
    const r = buildPageBoundsRect(595, 842, null)
    expect(r.fill).toBe('transparent')
  })

  it('marks the rect as page-bounds and excludes it from export', () => {
    const r = buildPageBoundsRect(595, 842, '#fff')
    expect(r.__isPageBounds).toBe(true)
    expect(r.excludeFromExport).toBe(true)
    expect(r.selectable).toBe(false)
    expect(r.evented).toBe(false)
  })
})
