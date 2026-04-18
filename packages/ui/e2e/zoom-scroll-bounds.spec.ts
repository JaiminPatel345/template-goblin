/**
 * Zoom scroll-bounds bug — Workstream 2 of the zoom/pan /test request.
 *
 * Bug report (verbatim):
 *   "When I zoomed image I am unable to see full image on left side —
 *    scrollbar shows it is on end but it is not actual end on left side.
 *    For right side it is working correctly."
 *
 * These tests are RED until the Dev fixes the scroll asymmetry. They reproduce
 * the bug so that the fix can be verified and a regression guard stays in
 * place after the fix lands.
 *
 * Root-cause hypothesis (for the Dev — not asserted by tests):
 *   The canvas scroll container in `CanvasArea.tsx` uses
 *     `display: flex; justify-content: center; overflow: auto;`
 *   around the <Stage>. When the Stage is larger than the container,
 *   `justify-content: center` collapses the leftward overflow — the flex
 *   item's margin-left becomes negative and cannot be scrolled into view.
 *   Fix candidates:
 *     - Replace centering with padding / margin:auto with a wrapper that
 *       allows overflow in both directions, e.g. drop `justify-content:
 *       center` once the Stage exceeds the container, or wrap the Stage in
 *       a sized inner div with `margin: auto` so overflow is symmetric.
 *     - Or use `transform: scale(N); transform-origin: 0 0;` on a fixed-size
 *       wrapper so `scrollWidth` reflects the scaled size on both sides.
 *
 * Expectation when this suite first runs against the current code:
 *   - BUG-ZOOM-1: FAIL (left-side max-scroll < right-side max-scroll)
 *   - BUG-ZOOM-2: FAIL (scrollLeft=0 does not reveal the canvas left edge)
 *   - BUG-ZOOM-3: PASS (right side works today — regression guard)
 *   - BUG-ZOOM-4: likely PASS (vertical flex centering typically symmetric
 *     because the flex container is column-less / align-items is default)
 *   - BUG-ZOOM-5: FAIL (horizontal centre is off when scrollLeft=maxScrollLeft/2)
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

async function seedTemplate(page: Page, width = 1000, height = 800): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'test',
        version: '0.0.0',
        width,
        height,
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: [],
      backgroundDataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
      backgroundBuffer: null,
      pageBackgroundDataUrls: [],
      pageBackgroundBuffers: [],
      fontBuffers: [],
      placeholderBuffers: [],
    },
    version: 2,
  }
  await page.addInitScript((seed: string) => {
    localStorage.setItem('template-goblin-template', seed)
  }, JSON.stringify(payload))
}

function canvas(page: Page) {
  return page.locator('canvas').first()
}

/**
 * Inspect the canvas scroll container (immediate parent of the Konva <canvas>).
 * Returns everything we need to reason about symmetric scroll bounds.
 */
async function inspectScroll(page: Page) {
  return canvas(page).evaluate((c) => {
    // Inline copy of findScrollContainer — evaluate runs in the browser.
    let node: HTMLElement | null = (c as HTMLCanvasElement).parentElement
    let parent: HTMLElement = (c as HTMLCanvasElement).parentElement as HTMLElement
    while (node) {
      const style = getComputedStyle(node)
      if (
        style.overflowX === 'auto' ||
        style.overflowX === 'scroll' ||
        style.overflow === 'auto' ||
        style.overflow === 'scroll'
      ) {
        parent = node
        break
      }
      node = node.parentElement
    }
    const canvasRect = c.getBoundingClientRect()
    const parentRect = parent.getBoundingClientRect()
    return {
      scrollLeft: parent.scrollLeft,
      scrollTop: parent.scrollTop,
      scrollWidth: parent.scrollWidth,
      scrollHeight: parent.scrollHeight,
      clientWidth: parent.clientWidth,
      clientHeight: parent.clientHeight,
      maxScrollLeft: parent.scrollWidth - parent.clientWidth,
      maxScrollTop: parent.scrollHeight - parent.clientHeight,
      // Position of the canvas element relative to the viewport:
      canvasLeft: canvasRect.left,
      canvasRight: canvasRect.right,
      canvasTop: canvasRect.top,
      canvasBottom: canvasRect.bottom,
      containerLeft: parentRect.left,
      containerRight: parentRect.right,
      containerTop: parentRect.top,
      containerBottom: parentRect.bottom,
      canvasWidth: canvasRect.width,
      canvasHeight: canvasRect.height,
    }
  })
}

/** Directly set scrollLeft/scrollTop on the scroll container. */
async function setScroll(page: Page, left: number, top?: number): Promise<void> {
  await canvas(page).evaluate(
    (c, args) => {
      const { left, top } = args
      let node: HTMLElement | null = (c as HTMLCanvasElement).parentElement
      let parent: HTMLElement = (c as HTMLCanvasElement).parentElement as HTMLElement
      while (node) {
        const style = getComputedStyle(node)
        if (
          style.overflowX === 'auto' ||
          style.overflowX === 'scroll' ||
          style.overflow === 'auto' ||
          style.overflow === 'scroll'
        ) {
          parent = node
          break
        }
        node = node.parentElement
      }
      parent.scrollLeft = left
      if (top !== undefined) parent.scrollTop = top
    },
    { left, top: top ?? 0 },
  )
}

/** Zoom by dispatching wheel events over the container. */
async function zoomTo(page: Page, targetZoom: number) {
  const box = await canvas(page).boundingBox()
  if (!box) throw new Error('canvas not visible')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.mouse.move(cx, cy)
  // Each wheel tick moves zoom by 0.05. Auto-fit is whatever the default
  // viewport produces — read it first and drive toward target.
  // We issue enough ticks to reach ~200% from any reasonable start.
  const ticks = 40
  for (let i = 0; i < ticks; i++) {
    await page.mouse.wheel(0, -100) // zoom in
  }
  // Clamp by subsequent behaviour — CanvasArea clamps to [0.1, 5].
  void targetZoom
}

test.describe('Zoom scroll bounds — Workstream 2 (BUG reproduction)', () => {
  test.beforeEach(async ({ page }) => {
    await seedTemplate(page, 1000, 800)
    await page.goto('/')
    await canvas(page).waitFor({ state: 'visible' })
  })

  test('BUG-ZOOM-1: horizontal scroll bounds are symmetric when zoomed', async ({ page }) => {
    await zoomTo(page, 2.0)
    const info = await inspectScroll(page)

    // Sanity: the canvas should now overflow the container horizontally.
    expect(info.scrollWidth).toBeGreaterThan(info.clientWidth)

    // Scroll all the way left — scrollLeft becomes 0.
    await setScroll(page, 0)
    const atLeft = await inspectScroll(page)

    // Scroll all the way right — scrollLeft becomes maxScrollLeft.
    await setScroll(page, atLeft.maxScrollLeft)
    const atRight = await inspectScroll(page)

    // Distance of canvas-left-edge-past-container-left when fully scrolled right:
    const overflowRightWhenAtRight = atRight.containerLeft - atRight.canvasLeft
    // Distance of canvas-right-edge-past-container-right when fully scrolled left:
    const overflowLeftWhenAtLeft = atLeft.canvasRight - atLeft.containerRight

    // These two overflow distances should be EQUAL in a symmetric scroll
    // container. They won't be if left-side scroll is clipped.
    expect(overflowRightWhenAtRight).toBeCloseTo(overflowLeftWhenAtLeft, 0)
  })

  test('BUG-ZOOM-2: scrolling fully left reveals the canvas left edge', async ({ page }) => {
    await zoomTo(page, 2.0)
    const info = await inspectScroll(page)
    expect(info.scrollWidth).toBeGreaterThan(info.clientWidth)

    await setScroll(page, 0)
    const atLeft = await inspectScroll(page)

    // The canvas's left edge should be at (or to the right of) the
    // container's left edge — i.e. the leftmost pixel of the canvas is
    // visible, not clipped beyond the container's left boundary.
    // Allow 2 px rounding slack.
    expect(atLeft.canvasLeft).toBeGreaterThanOrEqual(atLeft.containerLeft - 2)
  })

  test('BUG-ZOOM-3: scrolling fully right reveals the canvas right edge (regression guard)', async ({
    page,
  }) => {
    await zoomTo(page, 2.0)
    const info = await inspectScroll(page)
    expect(info.scrollWidth).toBeGreaterThan(info.clientWidth)

    await setScroll(page, info.maxScrollLeft)
    const atRight = await inspectScroll(page)

    // Mirror of BUG-ZOOM-2 — right side currently works.
    expect(atRight.canvasRight).toBeLessThanOrEqual(atRight.containerRight + 2)
  })

  test('BUG-ZOOM-4: vertical scroll bounds are symmetric when zoomed', async ({ page }) => {
    await zoomTo(page, 2.0)
    const info = await inspectScroll(page)

    if (info.scrollHeight <= info.clientHeight) {
      test.skip(true, 'Container does not overflow vertically at this zoom; skip')
    }

    await setScroll(page, 0, 0)
    const atTop = await inspectScroll(page)

    await setScroll(page, 0, atTop.maxScrollTop)
    const atBottom = await inspectScroll(page)

    const overflowBottomWhenAtBottom = atBottom.containerTop - atBottom.canvasTop
    const overflowTopWhenAtTop = atTop.canvasBottom - atTop.containerBottom

    expect(overflowBottomWhenAtBottom).toBeCloseTo(overflowTopWhenAtTop, 0)
  })

  test('BUG-ZOOM-5: canvas centre aligns with viewport centre at scrollLeft=maxScrollLeft/2', async ({
    page,
  }) => {
    await zoomTo(page, 2.0)
    const info = await inspectScroll(page)
    expect(info.scrollWidth).toBeGreaterThan(info.clientWidth)

    await setScroll(page, Math.round(info.maxScrollLeft / 2))
    const centred = await inspectScroll(page)

    const canvasCentreX = (centred.canvasLeft + centred.canvasRight) / 2
    const containerCentreX = (centred.containerLeft + centred.containerRight) / 2

    // Should be within 1-2 px. If the scroll origin is asymmetric the centre
    // will be noticeably off.
    expect(Math.abs(canvasCentreX - containerCentreX)).toBeLessThanOrEqual(2)
  })
})
