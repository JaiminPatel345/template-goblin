/**
 * E2E resize coverage.
 *
 * Verifies that dragging Fabric's built-in corner / edge controls resizes a
 * field and commits the new dimensions to the store. Specifically guards the
 * regression where Konva's `Group.width()` returned 0 and every release
 * snapped the rect back to the 20×20 minimum (the equivalent Fabric pitfall
 * is forgetting to reset `scaleX`/`scaleY` after read in `groupToFieldPatch`).
 *
 * Runs serial — Fabric viewport math + drag is sensitive to parallel
 * worker races just like selection-and-move.spec.ts.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

/* ------------------------------------------------------------------------ */
/*  Seed                                                                    */
/* ------------------------------------------------------------------------ */

interface SeedField {
  id: string
  type: 'text' | 'image' | 'table'
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

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

const IMAGE_STYLE = { fit: 'contain' }

const BASE_CELL = {
  fontFamily: 'Helvetica',
  fontSize: 10,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  backgroundColor: '#ffffff',
  borderWidth: 0,
  borderColor: '#cccccc',
  paddingTop: 2,
  paddingBottom: 2,
  paddingLeft: 4,
  paddingRight: 4,
  align: 'left',
  verticalAlign: 'top',
}

const TABLE_STYLE = {
  maxRows: 5,
  maxColumns: 3,
  multiPage: false,
  showHeader: true,
  headerStyle: { ...BASE_CELL, fontWeight: 'bold', backgroundColor: '#eeeeee' },
  rowStyle: BASE_CELL,
  oddRowStyle: null,
  evenRowStyle: null,
  cellStyle: { overflowMode: 'truncate' },
  columns: [
    { key: 'a', label: 'A', width: 80, style: null, headerStyle: null },
    { key: 'b', label: 'B', width: 80, style: null, headerStyle: null },
  ],
}

function fieldPayload(s: SeedField): Record<string, unknown> {
  const base = {
    id: s.id,
    label: s.id,
    groupId: null,
    pageId: null,
    x: s.x,
    y: s.y,
    width: s.width,
    height: s.height,
    zIndex: s.zIndex,
    source: { mode: 'dynamic', jsonKey: s.id, required: false, placeholder: null },
  }
  if (s.type === 'text') return { ...base, type: 'text', style: TEXT_STYLE }
  if (s.type === 'image') return { ...base, type: 'image', style: IMAGE_STYLE }
  return { ...base, type: 'table', style: TABLE_STYLE }
}

async function seedTemplate(page: Page, seeds: SeedField[]): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'resize-test',
        version: '0.0.0',
        width: 1000,
        height: 800,
        locked: false,
      },
      fields: seeds.map(fieldPayload),
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

/* ------------------------------------------------------------------------ */
/*  Canvas helpers                                                          */
/* ------------------------------------------------------------------------ */

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

async function readField(
  page: Page,
  id: string,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return await page.evaluate((fid) => {
    const raw = localStorage.getItem('template-goblin-template')
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      state?: {
        fields?: Array<{ id: string; x: number; y: number; width: number; height: number }>
      }
    }
    const f = parsed.state?.fields?.find((x) => x.id === fid)
    return f ? { x: f.x, y: f.y, width: f.width, height: f.height } : null
  }, id)
}

async function viewport(page: Page): Promise<{ zoom: number; tx: number; ty: number }> {
  return await page.evaluate(() => {
    interface FabricLike {
      viewportTransform?: number[]
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    const v = fc?.viewportTransform ?? [1, 0, 0, 1, 0, 0]
    return { zoom: v[0] ?? 1, tx: v[4] ?? 0, ty: v[5] ?? 0 }
  })
}

/** Convert page-pt coords to absolute screen coords (for page.mouse.*). */
async function toScreen(page: Page, ptX: number, ptY: number): Promise<{ x: number; y: number }> {
  const box = await fabricCanvas(page).boundingBox()
  if (!box) throw new Error('canvas has no bounding box')
  const { zoom, tx, ty } = await viewport(page)
  return { x: box.x + ptX * zoom + tx, y: box.y + ptY * zoom + ty }
}

/** Click the field's centre to select it (Fabric drag handles only appear on selection). */
async function selectField(page: Page, id: string): Promise<void> {
  const f = await readField(page, id)
  if (!f) throw new Error(`field ${id} missing`)
  const { x, y } = await toScreen(page, f.x + f.width / 2, f.y + f.height / 2)
  await page.mouse.click(x, y)
  // Wait for Fabric to commit selection.
  await page.waitForTimeout(80)
}

/* ------------------------------------------------------------------------ */
/*  Tests                                                                   */
/* ------------------------------------------------------------------------ */

const FIELDS: SeedField[] = [
  { id: 'a', type: 'text', x: 100, y: 100, width: 200, height: 80, zIndex: 0 },
  { id: 'b', type: 'image', x: 100, y: 250, width: 200, height: 80, zIndex: 1 },
  { id: 'c', type: 'table', x: 100, y: 400, width: 200, height: 80, zIndex: 2 },
]

test.describe('Resize via Fabric corner controls', () => {
  test.beforeEach(async ({ page }) => {
    await seedTemplate(page, FIELDS)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
  })

  test('dragging the bottom-right corner enlarges width and height', async ({ page }) => {
    await selectField(page, 'a')
    const before = await readField(page, 'a')
    if (!before) throw new Error('field gone')

    // Bottom-right corner in page coords (Fabric controls sit at the bbox edge).
    const { x: brX, y: brY } = await toScreen(
      page,
      before.x + before.width,
      before.y + before.height,
    )
    await page.mouse.move(brX, brY)
    await page.mouse.down()
    // Drag 60 pt outward (horizontal + vertical)
    await page.mouse.move(brX + 60, brY + 60, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(120)

    const after = await readField(page, 'a')
    if (!after) throw new Error('field gone after resize')
    expect(after.width).toBeGreaterThan(before.width)
    expect(after.height).toBeGreaterThan(before.height)
    // Position unchanged (we dragged the BR corner, not the body).
    expect(after.x).toBe(before.x)
    expect(after.y).toBe(before.y)
  })

  test('dragging the top-left corner shrinks bottom-right anchored', async ({ page }) => {
    await selectField(page, 'a')
    const before = await readField(page, 'a')
    if (!before) throw new Error('field gone')

    const { x: tlX, y: tlY } = await toScreen(page, before.x, before.y)
    await page.mouse.move(tlX, tlY)
    await page.mouse.down()
    // Drag inward so width and height shrink
    await page.mouse.move(tlX + 40, tlY + 30, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(120)

    const after = await readField(page, 'a')
    if (!after) throw new Error('field gone after resize')
    // Width / height shrank
    expect(after.width).toBeLessThan(before.width)
    expect(after.height).toBeLessThan(before.height)
    // Origin moved INWARD (towards bottom-right)
    expect(after.x).toBeGreaterThan(before.x)
    expect(after.y).toBeGreaterThan(before.y)
  })

  test('REGRESSION: release does not snap to 20×20 minimum (Konva-era bug)', async ({ page }) => {
    // Konva's Group had no intrinsic width/height — reading node.width() during
    // onTransformEnd returned 0 → Math.max(20, 0) = 20 — every release
    // collapsed to 20×20. Fabric's groupToFieldPatch reads (width × scaleX)
    // and resets scale; verify we don't accidentally re-introduce that path.
    await selectField(page, 'a')
    const before = await readField(page, 'a')
    if (!before) throw new Error('field gone')
    expect(before.width).toBe(200) // baseline

    const { x, y } = await toScreen(page, before.x + before.width, before.y + before.height)
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x + 30, y + 20, { steps: 8 })
    await page.mouse.up()
    await page.waitForTimeout(120)

    const after = await readField(page, 'a')
    if (!after) throw new Error('field gone after resize')
    expect(after.width).toBeGreaterThan(50) // definitely not 20
    expect(after.height).toBeGreaterThan(50)
  })

  test('image field (mixed type) is resizable identically to text field', async ({ page }) => {
    await selectField(page, 'b')
    const before = await readField(page, 'b')
    if (!before) throw new Error('image field gone')

    const { x: brX, y: brY } = await toScreen(
      page,
      before.x + before.width,
      before.y + before.height,
    )
    await page.mouse.move(brX, brY)
    await page.mouse.down()
    await page.mouse.move(brX + 50, brY + 40, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(120)

    const after = await readField(page, 'b')
    if (!after) throw new Error('image field gone after resize')
    expect(after.width).toBeGreaterThan(before.width)
    expect(after.height).toBeGreaterThan(before.height)
  })

  test('table field is resizable identically', async ({ page }) => {
    await selectField(page, 'c')
    const before = await readField(page, 'c')
    if (!before) throw new Error('table field gone')

    const { x: brX, y: brY } = await toScreen(
      page,
      before.x + before.width,
      before.y + before.height,
    )
    await page.mouse.move(brX, brY)
    await page.mouse.down()
    await page.mouse.move(brX + 50, brY + 40, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(120)

    const after = await readField(page, 'c')
    if (!after) throw new Error('table field gone after resize')
    expect(after.width).toBeGreaterThan(before.width)
    expect(after.height).toBeGreaterThan(before.height)
  })
})
