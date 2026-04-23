/**
 * E2E coverage for canvas pan — Fabric.js edition.
 *
 * Fabric has no scroll container — the viewport is a 3×3 affine matrix
 * exposed as `canvas.viewportTransform = [zoom, 0, 0, zoom, tx, ty]`. Pan
 * mutates tx (index 4) and ty (index 5). The Konva-era version of this
 * spec read scrollLeft/scrollTop; all of that is replaced with vpt reads.
 *
 * Behaviour under test (wired in `useFabricCanvas.ts` + `useCanvasKeyboard.ts`):
 *   - Space + left-mouse drag pans (Figma / Canva convention)
 *   - Middle-mouse drag pans without Space
 *   - Plain left drag over empty canvas does NOT pan (it may rubber-band select)
 *   - Releasing Space mid-drag stops panning
 *   - Plain wheel (no modifier) pans via vpt[5] (see zoom.spec.ts)
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function seedTemplate(page: Page, width = 1000, height = 800): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'pan-test',
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

test.describe('Pan — Fabric viewportTransform', () => {
  test.beforeEach(async ({ page }) => {
    await seedTemplate(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
  })

  test('Space + left-mouse drag pans the viewport by the drag delta', async ({ page }) => {
    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    const sx = box.x + box.width / 2
    const sy = box.y + box.height / 2

    await page.keyboard.down('Space')
    await page.mouse.move(sx, sy)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(sx + 100, sy + 50, { steps: 10 })
    await page.mouse.up({ button: 'left' })
    await page.keyboard.up('Space')

    const after = await viewport(page)
    expect(Math.round(after.tx - before.tx)).toBe(100)
    expect(Math.round(after.ty - before.ty)).toBe(50)
    expect(after.zoom).toBeCloseTo(before.zoom, 5)
  })

  test('middle-mouse drag pans without Space', async ({ page }) => {
    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    const sx = box.x + box.width / 2
    const sy = box.y + box.height / 2

    await page.mouse.move(sx, sy)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(sx - 80, sy - 40, { steps: 10 })
    await page.mouse.up({ button: 'middle' })

    const after = await viewport(page)
    expect(Math.round(after.tx - before.tx)).toBe(-80)
    expect(Math.round(after.ty - before.ty)).toBe(-40)
  })

  test('pan completes on mouse-up; subsequent left-drag does NOT pan', async ({ page }) => {
    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')
    const sx = box.x + box.width / 2
    const sy = box.y + box.height / 2

    // Start a space+left-drag pan
    await page.keyboard.down('Space')
    await page.mouse.move(sx, sy)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(sx + 60, sy, { steps: 8 })
    await page.mouse.up({ button: 'left' })
    await page.keyboard.up('Space')

    const afterPan = await viewport(page)
    expect(Math.round(afterPan.tx - before.tx)).toBe(60)

    // Now a plain left-drag (no Space) must NOT pan.
    await page.mouse.move(sx, sy)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(sx + 100, sy, { steps: 8 })
    await page.mouse.up({ button: 'left' })

    const afterPlain = await viewport(page)
    expect(Math.round(afterPlain.tx - afterPan.tx)).toBe(0)
  })

  test('plain left drag (no Space, no tool, on empty canvas) does NOT pan', async ({ page }) => {
    const before = await viewport(page)
    const box = await fabricCanvas(page).boundingBox()
    if (!box) throw new Error('canvas not visible')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down({ button: 'left' })
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up({ button: 'left' })

    const after = await viewport(page)
    // Plain drag may start a rubber-band box-select but MUST NOT pan.
    expect(after.tx).toBeCloseTo(before.tx, 5)
    expect(after.ty).toBeCloseTo(before.ty, 5)
  })

  test('Space sets pan mode but does not move the viewport on its own', async ({ page }) => {
    const before = await viewport(page)
    await page.keyboard.down('Space')
    await page.waitForTimeout(60)
    const held = await viewport(page)
    await page.keyboard.up('Space')

    expect(held.tx).toBe(before.tx)
    expect(held.ty).toBe(before.ty)
  })
})
