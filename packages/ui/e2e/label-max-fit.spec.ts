/**
 * E2E coverage for GH issue #12 — static / placeholder labels must render
 * at the largest possible font size that fits their bounding rect, and must
 * re-fit when the field is resized.
 *
 * Regression target: the old implementation rendered labels through a
 * `FabricText` with an `absolutePositioned: false` clipPath whose origin
 * landed at the text's centre, effectively hiding most characters behind a
 * thin slice. Users saw "tiny vertical lines" instead of legible text.
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
  // Large dynamic text — should get a generous fontSize.
  { id: 'big', x: 40, y: 40, width: 260, height: 160, zIndex: 0 },
  // Narrow — width-limited, font should shrink accordingly.
  { id: 'narrow', x: 320, y: 40, width: 60, height: 160, zIndex: 1 },
  // Short — height-limited.
  { id: 'short', x: 40, y: 220, width: 260, height: 30, zIndex: 2 },
]

const TEXT_STYLE = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
  // Auto-fit on so the canvas re-fits the label to the rect, which is the
  // behaviour this spec asserts (large rect → big font, etc.). Pre-#25
  // the canvas always auto-fit; post-#25 it honours `fontSize` unless
  // `fontSizeDynamic` is true, so the seed has to opt in.
  fontSizeDynamic: true,
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
        name: 'label-max-fit-test',
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
        // Use a non-trivial placeholder so the label is obvious on the canvas.
        source: { mode: 'dynamic', jsonKey: s.id, required: false, placeholder: 'Hello' },
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
    localStorage.removeItem('template-goblin-ui')
  }, JSON.stringify(payload))
}

function fabricCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

interface LabelInfo {
  fontSize: number
  charCount: number
  width: number
}

/** Read the current fontSize + text + width of a field Group's label child. */
async function readFieldLabel(page: Page, fieldId: string): Promise<LabelInfo> {
  return await page.evaluate((id) => {
    interface FabricLike {
      getObjects: () => Array<{
        __fieldId?: string
        getObjects?: () => Array<{
          fontSize?: number
          text?: string
          width?: number
        }>
      }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) throw new Error('Fabric canvas not ready')
    const group = fc.getObjects().find((o) => o.__fieldId === id)
    if (!group || !group.getObjects) throw new Error(`group ${id} missing`)
    // Children: [bgRect, ...maybeImage..., label].  Label is the Textbox —
    // find it by the presence of a `text` property.
    const children = group.getObjects()
    const label = children.find((c) => typeof c.text === 'string' && (c.text as string).length > 0)
    if (!label) throw new Error(`label for ${id} missing`)
    return {
      fontSize: label.fontSize ?? 0,
      charCount: (label.text ?? '').length,
      width: label.width ?? 0,
    }
  }, fieldId)
}

test.describe('Label max-fit (#12)', () => {
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

  test('large rect produces a big font size (not the old 8pt floor)', async ({ page }) => {
    const info = await readFieldLabel(page, 'big')
    expect(info.charCount).toBeGreaterThan(0)
    // A 260×160 rect with "Hello" should comfortably fit > 40pt.
    expect(info.fontSize).toBeGreaterThan(40)
  })

  test('narrow rect produces a smaller font size than the wide one', async ({ page }) => {
    const big = await readFieldLabel(page, 'big')
    const narrow = await readFieldLabel(page, 'narrow')
    expect(narrow.fontSize).toBeLessThan(big.fontSize)
    expect(narrow.fontSize).toBeGreaterThanOrEqual(8)
  })

  test('short rect produces a font bounded by height', async ({ page }) => {
    const info = await readFieldLabel(page, 'short')
    // Height is 30pt, max is floor(30*0.8) = 24.
    expect(info.fontSize).toBeLessThanOrEqual(24)
    expect(info.fontSize).toBeGreaterThanOrEqual(8)
  })

  test('resizing a field re-fits the label font', async ({ page }) => {
    const before = await readFieldLabel(page, 'big')

    // Shrink the field via the store — triggers the same reconciliation
    // path as a drag-resize.
    await page.evaluate((id) => {
      interface Store {
        getState: () => { resizeField: (id: string, w: number, h: number) => void }
      }
      const tpl = (window as unknown as { __templateStore?: Store }).__templateStore
      // Fallback: reach into zustand via any exposed hook — if the store
      // isn't exposed globally, use a Fabric-driven resize instead.
      if (tpl?.getState) {
        tpl.getState().resizeField(id, 80, 40)
      } else {
        // Resize via Fabric directly, then trigger object:modified.
        interface FabricLike {
          getObjects: () => Array<{
            __fieldId?: string
            set?: (props: Record<string, number>) => void
            setCoords?: () => void
            fire?: (ev: string, opt: Record<string, unknown>) => void
          }>
          fire?: (ev: string, opt: Record<string, unknown>) => void
        }
        const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
        if (!fc) throw new Error('no fabric canvas')
        const g = fc.getObjects().find((o) => o.__fieldId === id)
        if (!g) throw new Error(`no group ${id}`)
        g.set?.({ width: 80, height: 40, scaleX: 1, scaleY: 1 })
        g.setCoords?.()
        fc.fire?.('object:modified', { target: g })
      }
    }, 'big')

    await expect
      .poll(async () => (await readFieldLabel(page, 'big')).fontSize)
      .toBeLessThan(before.fontSize)

    const after = await readFieldLabel(page, 'big')
    expect(after.fontSize).toBeGreaterThanOrEqual(8)
    expect(after.fontSize).toBeLessThan(before.fontSize)
  })
})
