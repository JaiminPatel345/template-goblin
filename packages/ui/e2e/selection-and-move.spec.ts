/**
 * E2E selection + move coverage.
 *
 * Regression target — user reported:
 *   "Create 5 elements. 1st and 2nd are selectable + movable. 3rd/4th/5th
 *    are not selectable via canvas click. Selecting the 3rd from the left
 *    panel works, but dragging inside its bounds moves the 2nd instead."
 *
 * Coverage strategy:
 *   - Parameterised over count N = 1, 2, 3, 4, 5 — at every count we assert
 *     every field is independently click-selectable + drag-movable. No
 *     ordinal gets special treatment.
 *   - Fields have VARYING sizes (not a uniform grid) so hit regions are
 *     tested at multiple widths/heights.
 *   - Parameterised over field MIX — one full sweep is text-only, the other
 *     mixes text / image / table so the Konva shape differences (fills,
 *     placeholder images, etc.) are all exercised through the same flow.
 *
 * These Playwright tests run against a real browser + real Konva so they
 * exercise the hit canvas + drag engine the Vitest logic-tests cannot reach.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

/* ------------------------------------------------------------------------ */
/*  Seed types                                                              */
/* ------------------------------------------------------------------------ */

type SeedType = 'text' | 'image' | 'table'

interface SeedField {
  id: string
  type: SeedType
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

/**
 * 5 fields with VARYING sizes — not a uniform grid. Ensures hit detection
 * handles different rectangle shapes. Laid out on a 1000×800 page so the
 * viewport can comfortably fit the whole canvas.
 */
const VARIED_GEOMETRY: Array<Omit<SeedField, 'id' | 'type' | 'zIndex'>> = [
  { x: 40, y: 40, width: 220, height: 60 }, //   wide-short
  { x: 300, y: 40, width: 120, height: 120 }, // square
  { x: 460, y: 40, width: 300, height: 90 }, //  widest
  { x: 40, y: 180, width: 90, height: 180 }, //  tall-narrow
  { x: 160, y: 180, width: 260, height: 140 }, //big block
]

/** Pure-text seed for the first parameterised sweep. */
function buildTextSeeds(count: number): SeedField[] {
  return VARIED_GEOMETRY.slice(0, count).map((g, i) => ({
    id: `f${i + 1}`,
    type: 'text',
    zIndex: i,
    ...g,
  }))
}

/**
 * Mixed-type seed — cycles through text / image / table in order so every
 * count ≥ 3 exercises all three Konva shape paths.
 */
function buildMixedSeeds(count: number): SeedField[] {
  const mix: SeedType[] = ['text', 'image', 'table', 'text', 'image']
  return VARIED_GEOMETRY.slice(0, count).map((g, i) => ({
    id: `f${i + 1}`,
    type: mix[i] ?? 'text',
    zIndex: i,
    ...g,
  }))
}

/* ------------------------------------------------------------------------ */
/*  Seed writers — shape-matching payloads for the store's persist v2       */
/* ------------------------------------------------------------------------ */

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

async function seedTemplateWithFields(page: Page, seeds: SeedField[]): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'selection-move-test',
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

function konvaCanvas(page: Page) {
  return page.locator('[data-testid="canvas-stage-wrapper"] canvas').first()
}

/**
 * Read the currently selected field ids at runtime via the Fabric canvas.
 * `selectedFieldIds` is transient UI state — not persisted — so we cannot
 * read it from localStorage. The Fabric canvas is exposed at
 * `window.__fabricCanvas` in dev mode (`useFabricCanvas.ts`). Each active
 * object carries a `__fieldId` marker per REQ-048.
 */
async function readSelection(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    interface FabricLike {
      getActiveObjects(): Array<{ __fieldId?: string }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) return []
    return fc
      .getActiveObjects()
      .map((o) => o.__fieldId)
      .filter((id): id is string => !!id)
  })
}

async function readFieldPosition(
  page: Page,
  fieldId: string,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return await page.evaluate((id) => {
    const raw = localStorage.getItem('template-goblin-template')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as {
        state?: {
          fields?: Array<{
            id: string
            x: number
            y: number
            width: number
            height: number
          }>
        }
      }
      const f = parsed.state?.fields?.find((f) => f.id === id)
      return f ? { x: f.x, y: f.y, width: f.width, height: f.height } : null
    } catch {
      return null
    }
  }, fieldId)
}

/**
 * Given a field id, compute the viewport pixel at its current centre,
 * factoring in the current Konva zoom.
 */
async function centerOfFieldInViewport(
  page: Page,
  fieldId: string,
): Promise<{ x: number; y: number }> {
  const geom = await readFieldPosition(page, fieldId)
  if (!geom) throw new Error(`Field ${fieldId} not found in localStorage`)
  const canvas = konvaCanvas(page)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas element has no bounding box')
  // Fabric viewport transform: [zoom, 0, 0, zoom, tx, ty]. The field's
  // screen position is (x * zoom + tx, y * zoom + ty) relative to the
  // canvas element.
  const vpt = await page.evaluate(() => {
    interface FabricLike {
      viewportTransform?: number[]
      getZoom(): number
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) return { zoom: 1, tx: 0, ty: 0 }
    const v = fc.viewportTransform ?? [1, 0, 0, 1, 0, 0]
    return { zoom: v[0] ?? 1, tx: v[4] ?? 0, ty: v[5] ?? 0 }
  })
  return {
    x: box.x + (geom.x + geom.width / 2) * vpt.zoom + vpt.tx,
    y: box.y + (geom.y + geom.height / 2) * vpt.zoom + vpt.ty,
  }
}

/* ------------------------------------------------------------------------ */
/*  Parameterised sweep                                                     */
/*                                                                         */
/*  Run the full "click-select + drag-move" check for N = 1..5, with each  */
/*  Nth configuration being a fresh page. That way any broken ordinal      */
/*  bubbles up as a specific failing test name ("5 elements - text").      */
/* ------------------------------------------------------------------------ */

function describeSweep(title: string, buildSeeds: (count: number) => SeedField[]): void {
  for (const count of [1, 2, 3, 4, 5] as const) {
    test.describe(`${title} — ${count} element${count > 1 ? 's' : ''}`, () => {
      const seeds = buildSeeds(count)

      test.beforeEach(async ({ page }) => {
        await seedTemplateWithFields(page, seeds)
        await page.goto('/')
        await expect(konvaCanvas(page)).toBeVisible()
      })

      test(`every one of ${count} fields is click-selectable`, async ({ page }) => {
        for (const s of seeds) {
          const { x, y } = await centerOfFieldInViewport(page, s.id)
          await page.mouse.click(x, y)
          await expect
            .poll(async () => (await readSelection(page))[0], { timeout: 2000 })
            .toBe(s.id)
        }
      })

      test(`every one of ${count} fields is drag-movable`, async ({ page }) => {
        for (const s of seeds) {
          const before = await readFieldPosition(page, s.id)
          if (!before) throw new Error(`missing ${s.id}`)
          const { x, y } = await centerOfFieldInViewport(page, s.id)
          await page.mouse.move(x, y)
          await page.mouse.down()
          await page.mouse.move(x + 25, y + 15, { steps: 8 })
          await page.mouse.up()
          const after = await readFieldPosition(page, s.id)
          if (!after) throw new Error(`${s.id} gone after drag`)
          expect(after.x).not.toBe(before.x)
          expect(after.y).not.toBe(before.y)
        }
      })

      if (count >= 2) {
        test(`dragging field N does NOT move field N-1 (cross-hit regression)`, async ({
          page,
        }) => {
          // Drag the LAST field in the seed — most likely to expose the
          // "drag inside field N moves field N-1" bug since N has the
          // highest zIndex and sits on top of any earlier field that would
          // be the mis-hit target.
          const last = seeds[seeds.length - 1]!
          const prev = seeds[seeds.length - 2]!
          const beforePrev = await readFieldPosition(page, prev.id)
          const beforeLast = await readFieldPosition(page, last.id)
          if (!beforePrev || !beforeLast) throw new Error('missing seeds')

          const c = await centerOfFieldInViewport(page, last.id)
          await page.mouse.move(c.x, c.y)
          await page.mouse.down()
          await page.mouse.move(c.x + 30, c.y + 10, { steps: 8 })
          await page.mouse.up()

          const afterPrev = await readFieldPosition(page, prev.id)
          const afterLast = await readFieldPosition(page, last.id)
          expect(afterPrev).toEqual(beforePrev)
          expect(afterLast!.x).toBeGreaterThan(beforeLast.x)
        })
      }

      test(`left-panel row click selects each of ${count} fields`, async ({ page }) => {
        for (const s of seeds) {
          const row = page.locator('.tg-field-item-key', { hasText: `.${s.id}` })
          await row.first().click()
          await expect
            .poll(async () => (await readSelection(page))[0], { timeout: 2000 })
            .toBe(s.id)
        }
      })

      if (count >= 2) {
        test(`after left-panel selection, drag on canvas moves that field`, async ({ page }) => {
          const target = seeds[seeds.length - 1]!
          const other = seeds[0]!
          const row = page.locator('.tg-field-item-key', { hasText: `.${target.id}` })
          await row.first().click()

          const beforeTarget = await readFieldPosition(page, target.id)
          const beforeOther = await readFieldPosition(page, other.id)
          if (!beforeTarget || !beforeOther) throw new Error('missing')
          const c = await centerOfFieldInViewport(page, target.id)
          await page.mouse.move(c.x, c.y)
          await page.mouse.down()
          await page.mouse.move(c.x + 22, c.y + 14, { steps: 8 })
          await page.mouse.up()

          const afterTarget = await readFieldPosition(page, target.id)
          const afterOther = await readFieldPosition(page, other.id)
          expect(afterOther).toEqual(beforeOther)
          expect(afterTarget!.x).toBeGreaterThan(beforeTarget.x)
        })
      }

      if (count >= 3) {
        test(`shift+click across ${count} fields builds a multi-selection`, async ({ page }) => {
          const ids = seeds.map((s) => s.id)
          // First click without shift to seed a single selection.
          const c0 = await centerOfFieldInViewport(page, ids[0]!)
          await page.mouse.click(c0.x, c0.y)

          // Shift+click the rest — each must be added, none silently
          // toggled off (that was the shift-double-toggle regression).
          await page.keyboard.down('Shift')
          for (const id of ids.slice(1)) {
            const c = await centerOfFieldInViewport(page, id)
            await page.mouse.click(c.x, c.y)
          }
          await page.keyboard.up('Shift')

          const sel = await readSelection(page)
          expect(sel).toEqual(expect.arrayContaining(ids))
          expect(sel).toHaveLength(ids.length)
        })
      }

      test(`clicking any field shows the right panel`, async ({ page }) => {
        const c = await centerOfFieldInViewport(page, seeds[0]!.id)
        await page.mouse.click(c.x, c.y)
        await expect(page.locator('.tg-right-panel')).toBeVisible()
      })
    })
  }
}

/* ------------------------------------------------------------------------ */
/*  Two full sweeps per spec                                                */
/* ------------------------------------------------------------------------ */

describeSweep('Text-only', buildTextSeeds)
describeSweep('Mixed types (text/image/table)', buildMixedSeeds)
