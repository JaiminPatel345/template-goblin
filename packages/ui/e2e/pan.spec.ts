/**
 * Pan-when-zoomed E2E tests — Workstream 1 of the zoom/pan /test request.
 *
 * Behaviour under test (from the user's verbal spec, not yet in specs/009):
 *
 *   "While I press left mouse I can move zoomed image. Like Canva / Figma —
 *    spacebar + left-mouse drag = pan; middle-click drag also pans."
 *
 * These tests are written from that verbal description. Once the Dev lands the
 * implementation they should go green. Until then, AC-1, AC-2, AC-3, AC-6 are
 * expected to FAIL (the current canvas only supports middle-button pan).
 *
 * Selector strategy:
 *   - The canvas container is the single scrollable <div> wrapping the Konva
 *     <Stage>. We reach it via `.tg-canvas-container .tg-canvas-container *`
 *     is unreliable — instead we use `locator('canvas').locator('..')` which
 *     resolves to the Stage's immediate parent, i.e. the scroll container.
 *   - `data-testid` hooks are only present on onboarding buttons today; if/when
 *     Dev adds `data-testid="canvas-scroll-container"` or a cursor data attr
 *     this file should be updated to use them directly. The canvas() helper
 *     centralises the selector.
 *
 * Scope: these tests DO NOT verify what happens to a drawn field during pan.
 * Pan is strictly a viewport operation — scrollLeft/scrollTop of the container.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

/* ---------------- helpers ---------------- */

/**
 * Seed localStorage with a minimal template that has a background image
 * (1x1 transparent PNG data URL) so CanvasArea renders the scroll container
 * instead of the onboarding picker. Uses the persist key written by
 * `templateStore`: `template-goblin-template`, version 2.
 */
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
      // 1x1 transparent PNG — enough to put the UI in "canvas mode".
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

/** The scroll container is the immediate parent of the Konva <canvas> element. */
function canvas(page: Page) {
  return page.locator('canvas').first()
}

async function scrollContainerBox(page: Page) {
  return canvas(page).evaluate((c) => {
    // Walk up until we find an overflow: auto/scroll element. The direct
    // parent of <canvas> is react-konva's non-scrolling wrapper div.
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
    return {
      scrollLeft: parent.scrollLeft,
      scrollTop: parent.scrollTop,
      scrollWidth: parent.scrollWidth,
      scrollHeight: parent.scrollHeight,
      clientWidth: parent.clientWidth,
      clientHeight: parent.clientHeight,
      cursor: getComputedStyle(parent).cursor,
    }
  })
}

/** Set zoom via the exposed uiStore on window, or fall back to toolbar clicks. */
async function setZoom(page: Page, zoom: number): Promise<void> {
  // Zustand stores aren't globally exposed — use the wheel event which the
  // canvas container listens to, or drive the toolbar. Here we use wheel-to-
  // zoom since that's deterministic and container-scoped.
  const handle = canvas(page)
  const box = await handle.boundingBox()
  if (!box) throw new Error('canvas not visible')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // current zoom default is set by auto-fit; we reset then step
  // Each wheel tick = 0.05 zoom step (see CanvasArea onWheel handler).
  const steps = Math.ceil((zoom - 1) / 0.05)
  for (let i = 0; i < Math.abs(steps); i++) {
    await page.mouse.move(cx, cy)
    await page.mouse.wheel(0, steps > 0 ? -100 : 100)
  }
}

/* ---------------- tests ---------------- */

test.describe('Pan when zoomed — Workstream 1', () => {
  test.beforeEach(async ({ page }) => {
    await seedTemplate(page, 1000, 800)
    await page.goto('/')
    await canvas(page).waitFor({ state: 'visible' })
  })

  test('AC-1: holding Space sets grab cursor on canvas container', async ({ page }) => {
    await canvas(page).hover()
    await page.keyboard.down('Space')
    const { cursor } = await scrollContainerBox(page)
    // Figma/Canva convention is `grab` while Space is held, `grabbing` during drag.
    expect(['grab', 'grabbing', '-webkit-grab']).toContain(cursor)
    await page.keyboard.up('Space')

    const after = await scrollContainerBox(page)
    // Should return to a non-grab cursor (likely 'default' or 'auto' or crosshair/none).
    expect(['grab', 'grabbing', '-webkit-grab']).not.toContain(after.cursor)
  })

  test('AC-2: Space + left-mouse drag pans the viewport by the drag delta', async ({ page }) => {
    await setZoom(page, 1.5)
    const before = await scrollContainerBox(page)

    const box = await canvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2

    await canvas(page).hover()
    await page.keyboard.down('Space')
    await page.mouse.move(startX, startY)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(startX + 100, startY + 50, { steps: 10 })
    await page.mouse.up({ button: 'left' })
    await page.keyboard.up('Space')

    const after = await scrollContainerBox(page)
    // Panning the content 100 right = scrollLeft decreases by 100 (content moves with cursor).
    // Accept a small tolerance for sub-pixel rounding.
    expect(Math.abs(after.scrollLeft - (before.scrollLeft - 100))).toBeLessThanOrEqual(4)
    expect(Math.abs(after.scrollTop - (before.scrollTop - 50))).toBeLessThanOrEqual(4)
  })

  test('AC-3: releasing Space mid-drag stops panning', async ({ page }) => {
    await setZoom(page, 1.5)

    const box = await canvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2

    await page.keyboard.down('Space')
    await page.mouse.move(startX, startY)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(startX + 50, startY, { steps: 5 })

    const midDrag = await scrollContainerBox(page)

    // Release Space before mouseup — further movement should not pan.
    await page.keyboard.up('Space')
    await page.mouse.move(startX + 200, startY, { steps: 10 })

    const afterSpaceRelease = await scrollContainerBox(page)
    expect(afterSpaceRelease.scrollLeft).toBeCloseTo(midDrag.scrollLeft, 0)

    await page.mouse.up({ button: 'left' })
  })

  test('AC-4: plain left-mouse drag (no Space) does not pan', async ({ page }) => {
    await setZoom(page, 1.5)
    const before = await scrollContainerBox(page)

    const box = await canvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')

    // Drag starting outside any field (centre of empty background).
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up({ button: 'left' })

    const after = await scrollContainerBox(page)
    // Plain left drag should NOT move the scroll position. (It may start a
    // draw rect if a placement tool is active, but the default tool is
    // 'select' and we haven't switched tools.)
    expect(after.scrollLeft).toBe(before.scrollLeft)
    expect(after.scrollTop).toBe(before.scrollTop)
  })

  test('AC-5: middle-mouse drag pans even without Space (already implemented)', async ({
    page,
  }) => {
    await setZoom(page, 1.5)
    const before = await scrollContainerBox(page)

    const box = await canvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    const sx = box.x + box.width / 2
    const sy = box.y + box.height / 2

    await page.mouse.move(sx, sy)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(sx + 100, sy + 50, { steps: 10 })
    await page.mouse.up({ button: 'middle' })

    const after = await scrollContainerBox(page)
    expect(Math.abs(after.scrollLeft - (before.scrollLeft - 100))).toBeLessThanOrEqual(4)
    expect(Math.abs(after.scrollTop - (before.scrollTop - 50))).toBeLessThanOrEqual(4)
  })

  test('AC-6: pan at 100% zoom (content fits) does not move scroll position', async ({ page }) => {
    // At default auto-fit zoom the stage fits the container; scrollLeft is 0
    // and scrollWidth === clientWidth, so there is nothing to pan.
    const before = await scrollContainerBox(page)
    if (before.scrollWidth > before.clientWidth) {
      test.skip(true, 'Container is already overflowing at default zoom; skip this AC')
    }

    const box = await canvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')

    await page.keyboard.down('Space')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up({ button: 'left' })
    await page.keyboard.up('Space')

    const after = await scrollContainerBox(page)
    expect(after.scrollLeft).toBe(before.scrollLeft)
    expect(after.scrollTop).toBe(before.scrollTop)
  })

  test('AC-7: pan clamped at bounds — cannot scroll past left edge', async ({ page }) => {
    await setZoom(page, 3.0)

    const box = await canvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')

    // Force scrollLeft to 0 programmatically via a very large rightward drag.
    await page.keyboard.down('Space')
    await page.mouse.move(box.x + 10, box.y + 10)
    await page.mouse.down({ button: 'left' })
    // Drag way more than the container width in the direction that should
    // reveal the left edge (drag content to the right = scroll to 0).
    await page.mouse.move(box.x + 10 + 5000, box.y + 10, { steps: 20 })

    const atLeft = await scrollContainerBox(page)
    expect(atLeft.scrollLeft).toBeGreaterThanOrEqual(0)
    // Then try to pan further left — scrollLeft must not go negative.
    await page.mouse.move(box.x + 10 + 10000, box.y + 10, { steps: 20 })
    const stillAtLeft = await scrollContainerBox(page)
    await page.mouse.up({ button: 'left' })
    await page.keyboard.up('Space')

    expect(stillAtLeft.scrollLeft).toBeGreaterThanOrEqual(0)
  })
})
