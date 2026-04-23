/**
 * E2E coverage for canvas zoom — Fabric.js edition.
 *
 * Fabric exposes zoom as `canvas.getZoom()` (aka `viewportTransform[0]`).
 * Wheel events are handled by `fc.on('mouse:wheel', ...)` which listens to
 * native `wheel` events on the upper-canvas DOM element. Ctrl/Meta + wheel
 * zooms around the cursor; Shift + wheel pans horizontally; plain wheel
 * pans vertically. Ctrl+0 fits page, Ctrl+1 resets to 1.0.
 *
 * Wired in `useFabricCanvas.ts` (wireWheelEvents) + `useCanvasKeyboard.ts`.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function seedTemplate(page: Page, width = 1000, height = 800): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'zoom-test',
        version: '0.0.0',
        width,
        height,
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: [
        {
          id: 'page-0',
          index: 0,
          backgroundType: 'color',
          backgroundColor: '#ffffff',
          backgroundFilename: null,
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
  await page.addInitScript((seed: string) => {
    localStorage.setItem('template-goblin-template', seed)
  }, JSON.stringify(payload))
}

/** Forces the onboarding picker — no pages seeded. */
async function seedEmptyForOnboarding(page: Page): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: '',
        version: '0.0.0',
        width: 0,
        height: 0,
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: [],
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
  await page.addInitScript((seed: string) => {
    localStorage.setItem('template-goblin-template', seed)
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

interface Viewport {
  zoom: number
  tx: number
  ty: number
}

async function viewport(page: Page): Promise<Viewport> {
  return await page.evaluate(() => {
    interface FabricLike {
      viewportTransform?: number[]
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    const v = fc?.viewportTransform ?? [1, 0, 0, 1, 0, 0]
    return { zoom: v[0] ?? 1, tx: v[4] ?? 0, ty: v[5] ?? 0 }
  })
}

/**
 * Dispatch a native `wheel` event on Fabric's upper-canvas element. Fabric's
 * `mouse:wheel` event forwards from the native `wheel` listener it binds in
 * the constructor, so this is the only reliable way to feed a wheel event
 * into the Fabric pipeline from Playwright.
 */
async function dispatchWheel(
  page: Page,
  clientX: number,
  clientY: number,
  init: {
    deltaY?: number
    deltaX?: number
    ctrlKey?: boolean
    shiftKey?: boolean
    metaKey?: boolean
  },
): Promise<void> {
  await page.evaluate(
    (args) => {
      interface FabricLike {
        upperCanvasEl?: HTMLCanvasElement
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      const el = fc?.upperCanvasEl
      if (!el) throw new Error('fabric upper canvas not available')
      const ev = new WheelEvent('wheel', {
        clientX: args.clientX,
        clientY: args.clientY,
        deltaY: args.deltaY ?? 0,
        deltaX: args.deltaX ?? 0,
        ctrlKey: args.ctrlKey ?? false,
        shiftKey: args.shiftKey ?? false,
        metaKey: args.metaKey ?? false,
        bubbles: true,
        cancelable: true,
      })
      el.dispatchEvent(ev)
    },
    { clientX, clientY, ...init },
  )
}

test.describe('Zoom — Ctrl+wheel', () => {
  test.beforeEach(async ({ page }) => {
    await seedTemplate(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
  })

  test('Ctrl+wheel up increases zoom', async ({ page }) => {
    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
      deltaY: -100,
      ctrlKey: true,
    })
    const after = await viewport(page)
    expect(after.zoom).toBeGreaterThan(before.zoom)
  })

  test('Ctrl+wheel down decreases zoom', async ({ page }) => {
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    // Zoom in a little first so there's head room.
    for (let i = 0; i < 3; i++) {
      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: -100,
        ctrlKey: true,
      })
    }
    const before = await viewport(page)
    await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
      deltaY: 100,
      ctrlKey: true,
    })
    const after = await viewport(page)
    expect(after.zoom).toBeLessThan(before.zoom)
  })

  test('zoom clamps at 5.0 upper bound', async ({ page }) => {
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    for (let i = 0; i < 200; i++) {
      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: -100,
        ctrlKey: true,
      })
    }
    const { zoom } = await viewport(page)
    expect(zoom).toBeLessThanOrEqual(5)
    expect(zoom).toBeCloseTo(5, 3)
  })

  test('zoom clamps at 0.1 lower bound', async ({ page }) => {
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    for (let i = 0; i < 200; i++) {
      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: 100,
        ctrlKey: true,
      })
    }
    const { zoom } = await viewport(page)
    expect(zoom).toBeGreaterThanOrEqual(0.1)
    expect(zoom).toBeCloseTo(0.1, 3)
  })

  test('trackpad pinch (ctrlKey:true with no physical Ctrl) still zooms', async ({ page }) => {
    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
      deltaY: -50,
      ctrlKey: true,
    })
    const after = await viewport(page)
    expect(after.zoom).toBeGreaterThan(before.zoom)
  })

  test('zoom anchors at cursor — page point under cursor stays in place ±2 px', async ({
    page,
  }) => {
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    const cursorX = box.x + 250
    const cursorY = box.y + 200

    // Resolve which page-point lives under the cursor before zoom.
    const before = await page.evaluate(
      ({ cx, cy }) => {
        interface FabricLike {
          viewportTransform?: number[]
          upperCanvasEl?: HTMLCanvasElement
        }
        const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
        const v = fc?.viewportTransform ?? [1, 0, 0, 1, 0, 0]
        const r = fc?.upperCanvasEl?.getBoundingClientRect()
        if (!r) throw new Error('no upper canvas')
        const localX = cx - r.left
        const localY = cy - r.top
        const zoom = v[0] ?? 1
        return {
          zoom,
          localX,
          localY,
          pagePtX: (localX - (v[4] ?? 0)) / zoom,
          pagePtY: (localY - (v[5] ?? 0)) / zoom,
        }
      },
      { cx: cursorX, cy: cursorY },
    )

    await dispatchWheel(page, cursorX, cursorY, { deltaY: -100, ctrlKey: true })

    // Where is that same page-point drawn on screen now?
    const after = await page.evaluate(
      ({ ppx, ppy }) => {
        interface FabricLike {
          viewportTransform?: number[]
          upperCanvasEl?: HTMLCanvasElement
        }
        const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
        const v = fc?.viewportTransform ?? [1, 0, 0, 1, 0, 0]
        const r = fc?.upperCanvasEl?.getBoundingClientRect()
        if (!r) throw new Error('no upper canvas')
        const zoom = v[0] ?? 1
        const localX = ppx * zoom + (v[4] ?? 0)
        const localY = ppy * zoom + (v[5] ?? 0)
        return { screenX: r.left + localX, screenY: r.top + localY, zoom }
      },
      { ppx: before.pagePtX, ppy: before.pagePtY },
    )

    expect(after.zoom).toBeGreaterThan(before.zoom)
    expect(Math.abs(after.screenX - cursorX)).toBeLessThanOrEqual(2)
    expect(Math.abs(after.screenY - cursorY)).toBeLessThanOrEqual(2)
  })
})

test.describe('Wheel without Ctrl pans instead of zooming', () => {
  test.beforeEach(async ({ page }) => {
    await seedTemplate(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
  })

  test('plain wheel pans vertically (vpt[5] changes, zoom unchanged)', async ({ page }) => {
    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, { deltaY: 120 })
    const after = await viewport(page)
    expect(after.zoom).toBeCloseTo(before.zoom, 5)
    // handler does `vpt[5] -= e.deltaY` → deltaY=120 → ty decreases by 120
    expect(Math.round(after.ty - before.ty)).toBe(-120)
  })

  test('Shift+wheel pans horizontally (vpt[4] changes, zoom unchanged)', async ({ page }) => {
    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
      deltaY: 120,
      shiftKey: true,
    })
    const after = await viewport(page)
    expect(after.zoom).toBeCloseTo(before.zoom, 5)
    expect(Math.round(after.tx - before.tx)).toBe(-120)
    expect(Math.round(after.ty - before.ty)).toBe(0)
  })
})

test.describe('Onboarding → canvas transition keeps wheel wiring alive', () => {
  test('complete onboarding with solid color, then Ctrl+wheel zooms', async ({ page }) => {
    await seedEmptyForOnboarding(page)
    await page.goto('/')

    // The picker uses `data-testid="onboarding-solid-color"`.
    const solid = page.locator('[data-testid="onboarding-solid-color"]').first()
    await solid.waitFor({ state: 'visible', timeout: 5000 })
    await solid.click()

    // After clicking "Solid color" the picker shows a color input + "Apply".
    const apply = page.locator('[data-testid="onboarding-color-apply"]').first()
    await apply.waitFor({ state: 'visible', timeout: 5000 })
    await apply.click()

    await expect(fabricCanvas(page)).toBeVisible({ timeout: 5000 })
    // Give the ref-callback a tick to mount the Fabric canvas.
    await page.waitForFunction(
      () => {
        return (window as unknown as { __fabricCanvas?: unknown }).__fabricCanvas !== undefined
      },
      null,
      { timeout: 5000 },
    )

    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')

    await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
      deltaY: -100,
      ctrlKey: true,
    })
    const after = await viewport(page)
    expect(after.zoom).not.toBe(before.zoom)
  })
})

test.describe('Keyboard: Ctrl+0 (fit) and Ctrl+1 (100%)', () => {
  test.beforeEach(async ({ page }) => {
    await seedTemplate(page, 595, 842) // A4
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
  })

  test('Ctrl+1 resets zoom to 1.0 from a zoomed-in state', async ({ page }) => {
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    for (let i = 0; i < 6; i++) {
      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: -100,
        ctrlKey: true,
      })
    }
    const zoomedIn = (await viewport(page)).zoom
    expect(zoomedIn).toBeGreaterThan(1)

    await page.keyboard.press('Control+1')
    const z = (await viewport(page)).zoom
    expect(z).toBeCloseTo(1.0, 5)
  })

  test('Ctrl+0 sets zoom to approximately the fit-to-viewport factor', async ({ page }) => {
    // zoom way in first so Ctrl+0 has something to do.
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    for (let i = 0; i < 10; i++) {
      await dispatchWheel(page, box.x + box.width / 2, box.y + box.height / 2, {
        deltaY: -100,
        ctrlKey: true,
      })
    }
    await page.keyboard.press('Control+0')
    const { zoom } = await viewport(page)

    // Canvas container is the full parent div — width/height read from Fabric.
    const canSize = await page.evaluate(() => {
      interface FabricLike {
        width?: number
        height?: number
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      return { w: fc?.width ?? 0, h: fc?.height ?? 0 }
    })
    const expected = Math.min((canSize.w - 32) / 595, (canSize.h - 32) / 842)
    expect(zoom).toBeLessThanOrEqual(expected + 0.01)
    expect(zoom).toBeGreaterThan(expected * 0.5)
  })
})
