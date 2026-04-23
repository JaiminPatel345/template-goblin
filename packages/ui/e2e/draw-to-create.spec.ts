/**
 * E2E coverage for draw-to-create — the toolbar Text/Image/Table tools that
 * let the user drag a rectangle on the canvas, which opens the
 * FieldCreationPopup; on Create the field appears in the store.
 *
 * Wired in `useFabricCanvas.ts` mouse:down/move/up + `usePageHandlers.ts`
 * popup confirm/cancel.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function seedEmptyTemplate(page: Page): Promise<void> {
  // Solid-color page 0 already set up so the onboarding picker doesn't block
  // the canvas. No fields.
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'draw-test',
        version: '0.0.0',
        width: 1000,
        height: 800,
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
  await page.addInitScript((s: string) => {
    localStorage.setItem('template-goblin-template', s)
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

async function readFields(
  page: Page,
): Promise<
  Array<{ id: string; type: string; x: number; y: number; width: number; height: number }>
> {
  return await page.evaluate(() => {
    const raw = localStorage.getItem('template-goblin-template')
    if (!raw) return []
    const parsed = JSON.parse(raw) as {
      state?: {
        fields?: Array<{
          id: string
          type: string
          x: number
          y: number
          width: number
          height: number
        }>
      }
    }
    return parsed.state?.fields ?? []
  })
}

async function viewport(page: Page) {
  return await page.evaluate(() => {
    interface FabricLike {
      viewportTransform?: number[]
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    const v = fc?.viewportTransform ?? [1, 0, 0, 1, 0, 0]
    return { zoom: v[0] ?? 1, tx: v[4] ?? 0, ty: v[5] ?? 0 }
  })
}

async function toScreen(page: Page, ptX: number, ptY: number) {
  const box = await fabricCanvas(page).boundingBox()
  if (!box) throw new Error('canvas has no bounding box')
  const { zoom, tx, ty } = await viewport(page)
  return { x: box.x + ptX * zoom + tx, y: box.y + ptY * zoom + ty }
}

/* ------------------------------------------------------------------------ */
/*  Tests                                                                   */
/* ------------------------------------------------------------------------ */

test.describe('Draw-to-create flow', () => {
  test.beforeEach(async ({ page }) => {
    await seedEmptyTemplate(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
  })

  test('Text tool → draw rect → popup opens with Text type', async ({ page }) => {
    // Click the Text toolbar button
    await page
      .locator('button', { hasText: /^Text$/ })
      .first()
      .click()

    // Drag from (200, 200) to (400, 280) in page-pt coords
    const start = await toScreen(page, 200, 200)
    const end = await toScreen(page, 400, 280)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 10 })
    await page.mouse.up()

    // Popup appears
    const popup = page.locator('[role="dialog"]', { hasText: /Create Text field/i })
    await expect(popup).toBeVisible({ timeout: 2000 })

    // Cancel for cleanup (no field should be created)
    await page.locator('[data-testid="create-popup-cancel"]').click()
    await expect(popup).toBeHidden()
    expect(await readFields(page)).toEqual([])
  })

  test('confirm with a JSON key creates the field in the store', async ({ page }) => {
    await page
      .locator('button', { hasText: /^Text$/ })
      .first()
      .click()

    const start = await toScreen(page, 100, 100)
    const end = await toScreen(page, 280, 160)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 10 })
    await page.mouse.up()

    await expect(page.locator('[data-testid="create-popup-confirm"]')).toBeVisible({
      timeout: 2000,
    })

    // Type a json key
    await page.locator('[data-testid="create-popup-json-key"]').fill('student_name')
    await page.locator('[data-testid="create-popup-confirm"]').click()

    // Field appears
    await expect.poll(async () => (await readFields(page)).length, { timeout: 2000 }).toBe(1)
    const f = (await readFields(page))[0]!
    expect(f.type).toBe('text')
    expect(f.x).toBeGreaterThanOrEqual(95) // allow snap rounding
    expect(f.x).toBeLessThanOrEqual(105)
    expect(f.width).toBeGreaterThanOrEqual(170)
    expect(f.width).toBeLessThanOrEqual(190)
  })

  test('Image tool → draw → popup → confirm yields an image field', async ({ page }) => {
    await page
      .locator('button', { hasText: /^Image$/ })
      .first()
      .click()

    const start = await toScreen(page, 50, 50)
    const end = await toScreen(page, 200, 200)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 10 })
    await page.mouse.up()

    await expect(page.locator('[data-testid="create-popup-confirm"]')).toBeVisible({
      timeout: 2000,
    })
    await page.locator('[data-testid="create-popup-json-key"]').fill('photo')
    await page.locator('[data-testid="create-popup-confirm"]').click()

    await expect.poll(async () => (await readFields(page)).length, { timeout: 2000 }).toBe(1)
    expect((await readFields(page))[0]!.type).toBe('image')
  })

  test('Table tool → draw → popup → confirm yields a table field', async ({ page }) => {
    await page
      .locator('button', { hasText: /^Table$/ })
      .first()
      .click()

    const start = await toScreen(page, 50, 50)
    const end = await toScreen(page, 350, 200)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 10 })
    await page.mouse.up()

    await expect(page.locator('[data-testid="create-popup-confirm"]')).toBeVisible({
      timeout: 2000,
    })
    await page.locator('[data-testid="create-popup-json-key"]').fill('rows')
    await page.locator('[data-testid="create-popup-confirm"]').click()

    await expect.poll(async () => (await readFields(page)).length, { timeout: 2000 }).toBe(1)
    expect((await readFields(page))[0]!.type).toBe('table')
  })

  test('rect smaller than 10×10 is discarded (no popup, no field)', async ({ page }) => {
    await page
      .locator('button', { hasText: /^Text$/ })
      .first()
      .click()

    const start = await toScreen(page, 100, 100)
    const end = await toScreen(page, 105, 102) // 5×2, well under 10×10
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 4 })
    await page.mouse.up()

    // No popup, no field
    await page.waitForTimeout(200)
    await expect(page.locator('[data-testid="create-popup-confirm"]')).toBeHidden()
    expect(await readFields(page)).toEqual([])
  })

  test('Esc cancels the popup', async ({ page }) => {
    await page
      .locator('button', { hasText: /^Text$/ })
      .first()
      .click()
    const start = await toScreen(page, 100, 100)
    const end = await toScreen(page, 250, 160)
    await page.mouse.move(start.x, start.y)
    await page.mouse.down()
    await page.mouse.move(end.x, end.y, { steps: 8 })
    await page.mouse.up()

    await expect(page.locator('[data-testid="create-popup-confirm"]')).toBeVisible({
      timeout: 2000,
    })
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="create-popup-confirm"]')).toBeHidden()
    expect(await readFields(page)).toEqual([])
  })
})
