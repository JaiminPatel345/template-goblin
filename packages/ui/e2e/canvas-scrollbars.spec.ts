/**
 * E2E for GH #66: native scrollbars on the canvas viewport when the page
 * (canvas) exceeds the visible area.
 *
 * Pre-fix the canvas was sized to the container's `clientWidth/Height` and
 * the page was placed inside via `viewportTransform`, so zooming past fit
 * just clipped the page — there was no way to reach off-screen edges
 * without zooming back out. Post-fix the canvas is sized to
 * `pageWidth × zoom × pageHeight × zoom` and the wrapping container has
 * `overflow: auto`, so the browser draws scrollbars natively.
 *
 * Covered:
 *   1. At fit-zoom the canvas fits the viewport — neither scrollbar
 *      shows (the container's scrollWidth/Height equal its clientWidth/
 *      Height).
 *   2. After zooming past fit the canvas grows past the viewport — both
 *      scrollbars appear (scrollWidth/Height > clientWidth/Height).
 *   3. Scrolling the container moves the user's view of the page (we
 *      assert `scrollLeft` and `scrollTop` updates persist after a
 *      programmatic scroll).
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

async function seed(page: Page): Promise<void> {
  // Use a moderately-sized A4 page so fit-zoom usually shrinks it to fit
  // and a 200% zoom guarantees overflow on a default Playwright viewport.
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'canvas-scrollbars-test',
        version: '0.0.0',
        width: 595,
        height: 842,
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: [
        {
          id: 'p0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
          width: 595,
          height: 842,
          pageSize: 'A4',
        },
      ],
      backgroundDataUrl: null,
      backgroundBuffer: null,
      pageBackgroundDataUrls: [],
      pageBackgroundBuffers: [],
      fontBuffers: [],
      placeholderBuffers: [],
      staticImageBuffers: [],
      staticImageDataUrls: [],
    },
    version: 2,
  }
  await page.addInitScript((s: string) => {
    return new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('template-goblin', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv')
      }
      req.onsuccess = () => {
        const db = req.result
        const tx = db.transaction('kv', 'readwrite')
        tx.objectStore('kv').put(s, 'template-goblin-template')
        tx.oncomplete = () => {
          localStorage.removeItem('template-goblin-ui')
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
      req.onerror = () => reject(req.error)
    })
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

/**
 * Resolve the scrollable container (the parent of `canvas-stage-wrapper`).
 * That's the div we set `overflow: auto` on — it's where the scrollbars
 * render and where `scroll*` properties measure overflow.
 */
async function readScrollState(page: Page): Promise<{
  clientWidth: number
  clientHeight: number
  scrollWidth: number
  scrollHeight: number
  scrollLeft: number
  scrollTop: number
}> {
  return await page.evaluate(() => {
    const wrapper = document.querySelector('[data-testid="canvas-stage-wrapper"]')
    const container = wrapper?.parentElement
    if (!container) {
      throw new Error('canvas scroll container not found in DOM')
    }
    return {
      clientWidth: container.clientWidth,
      clientHeight: container.clientHeight,
      scrollWidth: container.scrollWidth,
      scrollHeight: container.scrollHeight,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }
  })
}

test.describe('Canvas scrollbars (#66)', () => {
  test('at fit-zoom (default after onboarding) the canvas fits the viewport — no overflow', async ({
    page,
  }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    // The auto-fit effect lands a zoom where canvas dimensions ≤ container
    // (with 40px padding). scrollWidth and clientWidth should be equal
    // (within the 1px sub-pixel tolerance browsers add).
    await page.waitForTimeout(200)
    const s = await readScrollState(page)
    expect(s.scrollWidth - s.clientWidth).toBeLessThanOrEqual(1)
    expect(s.scrollHeight - s.clientHeight).toBeLessThanOrEqual(1)
  })

  test('zooming past fit grows the canvas past the viewport on both axes', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.waitForTimeout(200)

    // Drive the zoom directly through Fabric — the fastest way to reach a
    // known-larger-than-viewport canvas size from the test (Ctrl+= would
    // also work but takes many keystrokes to reach 3x).
    await page.evaluate(() => {
      interface FabricLike {
        setDimensions: (d: { width: number; height: number }) => void
        setViewportTransform: (vpt: number[]) => void
        requestRenderAll: () => void
      }
      // We can't reach the uiStore directly, but we can call
      // `setDimensions` + `setViewportTransform` on the fabric instance
      // — useFabricSync's resize observer leaves user-zoom alone (only
      // recomputes on container resize), so a manual canvas resize stays
      // until the user changes zoom from the toolbar.
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('fabric canvas not exposed')
      const z = 3 // 300% — far past fit on a default 1280×720 viewport.
      fc.setDimensions({ width: 595 * z, height: 842 * z })
      fc.setViewportTransform([z, 0, 0, z, 0, 0])
      fc.requestRenderAll()
    })

    // After the zoom-up, the wrapper holding the canvas (the
    // `canvas-stage-wrapper` div) shrinks the canvas back to its CSS
    // `width: 100%` if any styling overrides — assert against the
    // CONTAINER's scroll properties, which honour the canvas's intrinsic
    // pixel size from `setDimensions`.
    await page.waitForTimeout(150)
    const s = await readScrollState(page)
    expect(s.scrollWidth).toBeGreaterThan(s.clientWidth)
    expect(s.scrollHeight).toBeGreaterThan(s.clientHeight)
  })

  test('REGRESSION: when the canvas overflows, its leading edge (left/top) is reachable, not pinned past negative scroll', async ({
    page,
  }) => {
    // The previous fix used `align-items: center; justify-content: center`
    // on the scroll container. With flex centring, an oversized child
    // pins past the leading edge into negative-scroll territory the
    // browser can't reach. Visually: the canvas's left and top get
    // CLIPPED with no way to pan to them. Real-world repro: A4 page at
    // 90% toolbar zoom in a viewport narrower than ~600px shows the
    // certificate's left edge hidden with no scrollbar.
    //
    // The current fix uses `margin: auto` on the inner wrapper instead
    // — the wrapper resolves to top-left:0 when oversized, so the leading
    // edge is at scrollLeft=0 / scrollTop=0 and overflow flows scrollably.
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.waitForTimeout(200)

    // Force canvas to overflow on both axes.
    await page.evaluate(() => {
      interface FabricLike {
        setDimensions: (d: { width: number; height: number }) => void
        setViewportTransform: (vpt: number[]) => void
        requestRenderAll: () => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('fabric canvas not exposed')
      const z = 3
      fc.setDimensions({ width: 595 * z, height: 842 * z })
      fc.setViewportTransform([z, 0, 0, z, 0, 0])
      fc.requestRenderAll()
    })
    await page.waitForTimeout(150)

    // Reset scroll to the start. With flex-centring the wrapper would
    // sit at negative offsetLeft / offsetTop here. With margin:auto it
    // sits at 0/0 — the leading edge is on screen.
    await page.evaluate(() => {
      const wrapper = document.querySelector('[data-testid="canvas-stage-wrapper"]')
      const container = wrapper?.parentElement
      if (!container) throw new Error('container not found')
      container.scrollLeft = 0
      container.scrollTop = 0
    })

    const offsets = await page.evaluate(() => {
      const wrapper = document.querySelector(
        '[data-testid="canvas-stage-wrapper"]',
      ) as HTMLElement | null
      const container = wrapper?.parentElement
      if (!wrapper || !container) throw new Error('layout not found')
      return {
        offsetLeft: wrapper.offsetLeft,
        offsetTop: wrapper.offsetTop,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      }
    })
    expect(offsets.offsetLeft).toBeGreaterThanOrEqual(0)
    expect(offsets.offsetTop).toBeGreaterThanOrEqual(0)
    expect(offsets.scrollLeft).toBe(0)
    expect(offsets.scrollTop).toBe(0)
  })

  test('container honours scrollLeft / scrollTop after a programmatic scroll', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.waitForTimeout(200)

    // Force overflow first (same path as the test above).
    await page.evaluate(() => {
      interface FabricLike {
        setDimensions: (d: { width: number; height: number }) => void
        setViewportTransform: (vpt: number[]) => void
        requestRenderAll: () => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('fabric canvas not exposed')
      const z = 3
      fc.setDimensions({ width: 595 * z, height: 842 * z })
      fc.setViewportTransform([z, 0, 0, z, 0, 0])
      fc.requestRenderAll()
    })
    await page.waitForTimeout(100)

    // Programmatically scroll the container by 80px on each axis and
    // assert the read-back values reflect that — confirms the container
    // is the scroll surface (not some inner element with its own scroll).
    await page.evaluate(() => {
      const wrapper = document.querySelector('[data-testid="canvas-stage-wrapper"]')
      const container = wrapper?.parentElement
      if (!container) throw new Error('container not found')
      container.scrollLeft = 80
      container.scrollTop = 80
    })

    await page.waitForTimeout(50)
    const s = await readScrollState(page)
    expect(s.scrollLeft).toBeGreaterThanOrEqual(75)
    expect(s.scrollTop).toBeGreaterThanOrEqual(75)
  })

  test('mouse wheel over the canvas scrolls the container vertically', async ({ page }) => {
    // The pre-fix `mouse:wheel` handler called `preventDefault()` on every
    // wheel event and shifted Fabric's `viewportTransform` translate
    // instead of letting the browser's native scroll fire. Under the new
    // page-sized canvas model that translate moves Fabric's drawing INSIDE
    // its own pixel area (off-page), so neither path scrolled the visible
    // viewport. This test asserts that a plain `wheel` event over the
    // canvas now bubbles to the `overflow: auto` container.
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.waitForTimeout(200)

    await page.evaluate(() => {
      interface FabricLike {
        setDimensions: (d: { width: number; height: number }) => void
        setViewportTransform: (vpt: number[]) => void
        requestRenderAll: () => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('fabric canvas not exposed')
      const z = 3
      fc.setDimensions({ width: 595 * z, height: 842 * z })
      fc.setViewportTransform([z, 0, 0, z, 0, 0])
      fc.requestRenderAll()
    })
    await page.waitForTimeout(100)

    const before = await readScrollState(page)
    expect(before.scrollTop).toBe(0)

    // Position the mouse over the canvas, then dispatch a vertical wheel.
    const canvas = fabricCanvas(page)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no bounding box')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.wheel(0, 200)

    await page.waitForTimeout(80)
    const after = await readScrollState(page)
    expect(after.scrollTop).toBeGreaterThan(before.scrollTop)
  })

  test('shift+wheel scrolls the container horizontally', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.waitForTimeout(200)

    await page.evaluate(() => {
      interface FabricLike {
        setDimensions: (d: { width: number; height: number }) => void
        setViewportTransform: (vpt: number[]) => void
        requestRenderAll: () => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('fabric canvas not exposed')
      const z = 3
      fc.setDimensions({ width: 595 * z, height: 842 * z })
      fc.setViewportTransform([z, 0, 0, z, 0, 0])
      fc.requestRenderAll()
    })
    await page.waitForTimeout(100)

    const canvas = fabricCanvas(page)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no bounding box')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

    // Modern browsers translate shift+wheel deltaY into horizontal scroll
    // automatically when the target element is horizontally scrollable —
    // we just need to NOT call preventDefault. Hold Shift and wheel.
    await page.keyboard.down('Shift')
    await page.mouse.wheel(0, 200)
    await page.keyboard.up('Shift')

    await page.waitForTimeout(80)
    const after = await readScrollState(page)
    expect(after.scrollLeft).toBeGreaterThan(0)
  })

  test('space + drag pans by scrolling the container', async ({ page }) => {
    // Pre-#66 space+drag mutated `viewportTransform` translate. Under the
    // new page-sized canvas model that translate is wiped by the next
    // zoom-sync. The handler now drives `container.scrollLeft/Top` so the
    // pan tracks the scrollbar position and survives every effect re-run.
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await page.waitForTimeout(200)

    await page.evaluate(() => {
      interface FabricLike {
        setDimensions: (d: { width: number; height: number }) => void
        setViewportTransform: (vpt: number[]) => void
        requestRenderAll: () => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('fabric canvas not exposed')
      const z = 3
      fc.setDimensions({ width: 595 * z, height: 842 * z })
      fc.setViewportTransform([z, 0, 0, z, 0, 0])
      fc.requestRenderAll()
    })
    await page.waitForTimeout(100)

    const before = await readScrollState(page)
    expect(before.scrollTop).toBe(0)

    const canvas = fabricCanvas(page)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('canvas has no bounding box')

    // Hold Space, mousedown, drag up-and-left (scroll grows down-and-right),
    // mouseup, release Space.
    await page.keyboard.down('Space')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 - 120, { steps: 6 })
    await page.mouse.up()
    await page.keyboard.up('Space')

    await page.waitForTimeout(80)
    const after = await readScrollState(page)
    expect(after.scrollTop).toBeGreaterThan(before.scrollTop)
    expect(after.scrollLeft).toBeGreaterThan(before.scrollLeft)
  })
})
