/**
 * E2E coverage for GH issue #10 — selected fields must show unmistakable
 * visual emphasis beyond Fabric's default corner handles.
 *
 * What we assert:
 *   - A field's background Rect has its `fill` / `stroke` / `strokeWidth`
 *     swapped to the selected-state tokens when the Group becomes active.
 *   - Deselecting (clicking empty canvas / selecting a different field)
 *     restores the defaults.
 *   - Multi-select (shift+click) emphasizes every member of the active set
 *     independently.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

interface SeedField {
  id: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

const SEEDS: SeedField[] = [
  { id: 'f1', x: 60, y: 60, width: 180, height: 100, zIndex: 0 },
  { id: 'f2', x: 280, y: 60, width: 180, height: 100, zIndex: 1 },
  { id: 'f3', x: 60, y: 220, width: 180, height: 100, zIndex: 2 },
]

const TEXT_STYLE = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  fontSizeDynamic: false,
  fontSizeMin: 8,
  lineHeight: 1.2,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  align: 'left',
  verticalAlign: 'top',
  maxRows: 2,
  overflowMode: 'truncate',
  snapToGrid: false,
}

async function seedTemplate(page: Page): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'selection-emphasis-test',
        version: '0.0.0',
        width: 600,
        height: 500,
        locked: false,
      },
      fields: SEEDS.map((s) => ({
        id: s.id,
        label: s.id,
        type: 'text',
        groupId: null,
        pageId: null,
        x: s.x,
        y: s.y,
        width: s.width,
        height: s.height,
        zIndex: s.zIndex,
        source: { mode: 'dynamic', jsonKey: s.id, required: false, placeholder: null },
        style: TEXT_STYLE,
      })),
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
    // Reset any prior UI-store currentPageId so onboarding doesn't appear.
    localStorage.removeItem('template-goblin-ui')
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

interface RectVisuals {
  fill: string
  stroke: string
  strokeWidth: number
  defaultFill: string
  defaultStroke: string
  defaultStrokeWidth: number
}

/** Read the current fill / stroke / strokeWidth of a field Group's bgRect. */
async function readFieldVisuals(page: Page, fieldId: string): Promise<RectVisuals> {
  return await page.evaluate((id) => {
    interface FabricLike {
      getObjects: () => Array<{
        __fieldId?: string
        getObjects?: () => Array<{
          fill?: string | unknown
          stroke?: string
          strokeWidth?: number
          __defaultFill?: string
          __defaultStroke?: string
          __defaultStrokeWidth?: number
        }>
      }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) throw new Error('Fabric canvas not ready')
    const group = fc.getObjects().find((o) => o.__fieldId === id)
    if (!group || !group.getObjects) throw new Error(`group ${id} missing`)
    const bg = group.getObjects()[0]
    if (!bg) throw new Error(`bg rect for ${id} missing`)
    return {
      fill: typeof bg.fill === 'string' ? bg.fill : '',
      stroke: bg.stroke ?? '',
      strokeWidth: bg.strokeWidth ?? 0,
      defaultFill: bg.__defaultFill ?? '',
      defaultStroke: bg.__defaultStroke ?? '',
      defaultStrokeWidth: bg.__defaultStrokeWidth ?? 0,
    }
  }, fieldId)
}

async function boundingBoxCenter(page: Page, fieldId: string): Promise<{ x: number; y: number }> {
  // Use Fabric's own scene → screen conversion to find the click point.
  return await page.evaluate((id) => {
    interface FabricLike {
      getObjects: () => Array<{
        __fieldId?: string
        left?: number
        top?: number
        width?: number
        height?: number
      }>
      viewportTransform?: number[]
      getElement?: () => HTMLCanvasElement
      upperCanvasEl?: HTMLCanvasElement
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) throw new Error('Fabric canvas not ready')
    const g = fc.getObjects().find((o) => o.__fieldId === id)
    if (!g) throw new Error(`group ${id} missing`)
    const vpt = fc.viewportTransform ?? [1, 0, 0, 1, 0, 0]
    const zoom = vpt[0] ?? 1
    const tx = vpt[4] ?? 0
    const ty = vpt[5] ?? 0
    const gx = g.left ?? 0
    const gy = g.top ?? 0
    const gw = g.width ?? 0
    const gh = g.height ?? 0
    const el = fc.upperCanvasEl ?? fc.getElement?.()
    if (!el) throw new Error('canvas element missing')
    const rect = el.getBoundingClientRect()
    return {
      x: rect.left + (gx + gw / 2) * zoom + tx,
      y: rect.top + (gy + gh / 2) * zoom + ty,
    }
  }, fieldId)
}

test.describe('Selection emphasis (#10)', () => {
  test.beforeEach(async ({ page }) => {
    await seedTemplate(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible({ timeout: 5000 })
    await expect
      .poll(
        () =>
          page.evaluate(() => !!(window as unknown as { __fabricCanvas?: unknown }).__fabricCanvas),
        { timeout: 5000 },
      )
      .toBe(true)
  })

  test('unselected fields render with default fill + stroke', async ({ page }) => {
    for (const s of SEEDS) {
      const v = await readFieldVisuals(page, s.id)
      expect(v.fill).toBe(v.defaultFill)
      expect(v.stroke).toBe(v.defaultStroke)
      expect(v.strokeWidth).toBe(v.defaultStrokeWidth)
    }
  })

  test('clicking a field swaps its bg to the selected-state tokens', async ({ page }) => {
    const before = await readFieldVisuals(page, 'f1')

    const center = await boundingBoxCenter(page, 'f1')
    await page.mouse.click(center.x, center.y)

    await expect
      .poll(async () => (await readFieldVisuals(page, 'f1')).strokeWidth)
      .toBeGreaterThan(before.strokeWidth)

    const after = await readFieldVisuals(page, 'f1')
    expect(after.fill).not.toBe(before.defaultFill)
    expect(after.stroke).not.toBe(before.defaultStroke)
    expect(after.strokeWidth).toBeGreaterThan(before.defaultStrokeWidth)

    // Untouched fields remain at defaults.
    const f2 = await readFieldVisuals(page, 'f2')
    expect(f2.fill).toBe(f2.defaultFill)
    expect(f2.stroke).toBe(f2.defaultStroke)
    expect(f2.strokeWidth).toBe(f2.defaultStrokeWidth)
  })

  test('switching selection restores the previous field and emphasizes the new one', async ({
    page,
  }) => {
    const c1 = await boundingBoxCenter(page, 'f1')
    await page.mouse.click(c1.x, c1.y)
    await expect
      .poll(async () => (await readFieldVisuals(page, 'f1')).strokeWidth)
      .toBeGreaterThan(1)

    const c2 = await boundingBoxCenter(page, 'f2')
    await page.mouse.click(c2.x, c2.y)

    await expect
      .poll(async () => (await readFieldVisuals(page, 'f2')).strokeWidth)
      .toBeGreaterThan(1)

    const f1 = await readFieldVisuals(page, 'f1')
    expect(f1.fill).toBe(f1.defaultFill)
    expect(f1.stroke).toBe(f1.defaultStroke)
    expect(f1.strokeWidth).toBe(f1.defaultStrokeWidth)

    const f2 = await readFieldVisuals(page, 'f2')
    expect(f2.strokeWidth).toBeGreaterThan(f2.defaultStrokeWidth)
  })

  test('clicking empty canvas clears emphasis from every field', async ({ page }) => {
    const c1 = await boundingBoxCenter(page, 'f1')
    await page.mouse.click(c1.x, c1.y)
    await expect
      .poll(async () => (await readFieldVisuals(page, 'f1')).strokeWidth)
      .toBeGreaterThan(1)

    // Click empty area far from any field.
    const canvasBox = await fabricCanvas(page).boundingBox()
    if (!canvasBox) throw new Error('canvas has no bbox')
    await page.mouse.click(canvasBox.x + canvasBox.width - 10, canvasBox.y + canvasBox.height - 10)

    await expect.poll(async () => (await readFieldVisuals(page, 'f1')).strokeWidth).toBe(1)

    for (const s of SEEDS) {
      const v = await readFieldVisuals(page, s.id)
      expect(v.fill).toBe(v.defaultFill)
      expect(v.stroke).toBe(v.defaultStroke)
      expect(v.strokeWidth).toBe(v.defaultStrokeWidth)
    }
  })

  test('shift+click multi-select emphasizes every member of the active selection', async ({
    page,
  }) => {
    const c1 = await boundingBoxCenter(page, 'f1')
    await page.mouse.click(c1.x, c1.y)

    const c2 = await boundingBoxCenter(page, 'f2')
    await page.keyboard.down('Shift')
    await page.mouse.click(c2.x, c2.y)
    await page.keyboard.up('Shift')

    await expect
      .poll(async () => (await readFieldVisuals(page, 'f1')).strokeWidth)
      .toBeGreaterThan(1)
    await expect
      .poll(async () => (await readFieldVisuals(page, 'f2')).strokeWidth)
      .toBeGreaterThan(1)

    const f3 = await readFieldVisuals(page, 'f3')
    expect(f3.strokeWidth).toBe(f3.defaultStrokeWidth)
  })
})
