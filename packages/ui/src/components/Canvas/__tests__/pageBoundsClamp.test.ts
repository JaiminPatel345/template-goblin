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
import { clampToPage } from '../usePageBoundsEnforcement.js'

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
})
