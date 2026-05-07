/**
 * E2E regression for GH #54: when the user navigates between pages, every
 * field must keep its declared position on the canvas — including image
 * fields, whose async-loaded `FabricImage` child is the specific thing the
 * bug snapped to the page's upper-left.
 *
 * Two specs:
 *   1. The minimal #54 reproduction: one image on Page 1 → Page 2 → Page 1.
 *   2. A broader random-walk: three pages, mixed text + image fields and
 *      mixed background types / sizes, navigated through several orderings.
 *      After every navigation we verify EVERY field on the active page is at
 *      the same `(x, y)` it was seeded with, and for image fields that the
 *      loaded `FabricImage` child is centred inside the group rect (the
 *      pre-fix bug shifted that child's local coords by `(-group.left,
 *      -group.top)` so we'd see top ≠ height/2).
 *
 * Why these tests didn't exist before: `page-tabs.spec.ts` only checked
 * which fields land on each page (by `__fieldId`), never their positions.
 * `image-field.spec.ts` covered image fields in isolation, never with a
 * page-switch round-trip. The two scenarios crossed for the first time in
 * #54.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

// 4×4 red PNG, inline as data URL — the minimum that exercises the
// real-image render path. Borrowed from `image-field.spec.ts`.
const TINY_PNG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4XmP8z8AARBgAcwBQEgEDA' +
  'XAGRgwAAAAASUVORK5CYII='

const TEXT_STYLE = {
  fontId: null,
  fontFamily: 'Helvetica',
  fontSize: 12,
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

interface SeedPage {
  id: string
  index: number
  backgroundType: 'color' | 'inherit'
  backgroundColor: string | null
  backgroundFilename: string | null
  width?: number
  height?: number
}

interface SeedField {
  id: string
  type: 'text' | 'image' | 'table'
  pageId: string
  x: number
  y: number
  width: number
  height: number
}

function buildFieldPayload(f: SeedField): Record<string, unknown> {
  const base = {
    id: f.id,
    label: f.id,
    groupId: null,
    pageId: f.pageId,
    x: f.x,
    y: f.y,
    width: f.width,
    height: f.height,
    zIndex: 0,
  }
  if (f.type === 'text') {
    return {
      ...base,
      type: 'text',
      source: { mode: 'dynamic', jsonKey: f.id, required: false, placeholder: null },
      style: TEXT_STYLE,
    }
  }
  if (f.type === 'image') {
    return {
      ...base,
      type: 'image',
      source: { mode: 'static', value: { filename: `${f.id}.png` } },
      style: { fit: 'contain' },
    }
  }
  // table
  return {
    ...base,
    type: 'table',
    source: { mode: 'dynamic', jsonKey: f.id, required: false, placeholder: null },
    style: TABLE_STYLE,
  }
}

async function seed(page: Page, pages: SeedPage[], fields: SeedField[]): Promise<void> {
  // Each image field gets its own static-image entry — keyed by `${id}.png`
  // so the `staticImageDataUrls` lookup in `useImageResolver` finds it. All
  // entries share the same TINY_PNG bytes; the contents don't matter, only
  // that the resolver returns a non-null URL synchronously on page-return
  // (that's what triggers the buggy `createFieldGroup` async path pre-fix).
  const staticImageDataUrls = fields
    .filter((f) => f.type === 'image')
    .map((f) => [`${f.id}.png`, TINY_PNG])

  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'page-switch-stability-test',
        version: '0.0.0',
        width: 1000,
        height: 800,
        locked: false,
      },
      fields: fields.map(buildFieldPayload),
      fonts: [],
      groups: [],
      pages,
      backgroundDataUrl: null,
      backgroundBuffer: null,
      pageBackgroundDataUrls: [],
      pageBackgroundBuffers: [],
      fontBuffers: [],
      placeholderBuffers: [],
      staticImageBuffers: [],
      staticImageDataUrls,
    },
    version: 2,
  }

  // Write directly to IndexedDB so each test starts deterministic — same
  // pattern as `image-field.spec.ts`.
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

interface FieldPos {
  groupLeft: number
  groupTop: number
  /**
   * World-space center of the loaded `FabricImage` child.
   *
   * `child.left` / `child.top` are unreliable for assertions because Fabric
   * v6 stores grouped-children coords relative to the group's centre, and
   * `_calcBounds()` after `add()` can renormalise them — values vary even
   * when the visible position is correct. `getCenterPoint()` returns
   * absolute canvas coords after `setCoords()` and is stable across the
   * group's transform pipeline, so the assertion checks the SAME thing the
   * user sees: where the image's centre lands on the page.
   */
  imageCenter: { x: number; y: number; natW: number } | null
}

async function readFieldPos(page: Page, fieldId: string): Promise<FieldPos | null> {
  return await page.evaluate((id: string) => {
    interface ChildLike {
      __fieldId?: string
      width?: number
      setCoords?: () => void
      getCenterPoint?: () => { x: number; y: number }
    }
    interface FabricLike {
      getObjects: () => Array<{
        __fieldId?: string
        left?: number
        top?: number
        getObjects?: () => ChildLike[]
      }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) return null
    const g = fc.getObjects().find((o) => o.__fieldId === id)
    if (!g) return null
    let imageCenter: { x: number; y: number; natW: number } | null = null
    if (g.getObjects) {
      const child = g
        .getObjects()
        .find(
          (c) =>
            typeof c.__fieldId === 'string' &&
            c.__fieldId.startsWith('__img_') &&
            !c.__fieldId.startsWith('__img_placeholder_'),
        )
      if (child && child.getCenterPoint) {
        child.setCoords?.()
        const c = child.getCenterPoint()
        imageCenter = { x: c.x, y: c.y, natW: child.width ?? 0 }
      }
    }
    return { groupLeft: g.left ?? 0, groupTop: g.top ?? 0, imageCenter }
  }, fieldId)
}

async function waitForImageLoaded(page: Page, fieldId: string): Promise<void> {
  // `natW > 0` means `loadFabricImage` resolved and the FabricImage child is
  // attached. Until then the group only holds the placeholder rect.
  await expect
    .poll(
      async () => {
        const p = await readFieldPos(page, fieldId)
        return p?.imageCenter?.natW ?? 0
      },
      { timeout: 5000 },
    )
    .toBeGreaterThan(0)
}

async function gotoPage(page: Page, pageNum: number): Promise<void> {
  await page.locator(`button:has-text("Page ${pageNum}")`).first().click()
}

/**
 * Sub-pixel tolerance for Fabric group positioning. The field rect's bgRect
 * has `strokeWidth: 1, strokeUniform: true`, and Fabric's `_calcBounds()`
 * includes the stroke half-width when computing the group's `left/top`,
 * which can shift them by 0.5pt from the seeded value. That's invisible to
 * the user and unrelated to GH #54 (which displaces images by hundreds of
 * points), so positional assertions allow ±1pt slack.
 */
const POS_TOLERANCE_PT = 1

function expectClose(actual: number, expected: number, tol: number, label: string): void {
  expect(
    Math.abs(actual - expected),
    `${label} (got ${actual}, want ${expected} ±${tol})`,
  ).toBeLessThanOrEqual(tol)
}

async function expectFieldAt(page: Page, f: SeedField): Promise<void> {
  const pos = await readFieldPos(page, f.id)
  expect(pos, `field ${f.id} should be on the canvas`).not.toBeNull()
  expectClose(pos!.groupLeft, f.x, POS_TOLERANCE_PT, `field ${f.id}.x`)
  expectClose(pos!.groupTop, f.y, POS_TOLERANCE_PT, `field ${f.id}.y`)

  if (f.type === 'image') {
    expect(pos!.imageCenter, `field ${f.id} image child loaded`).not.toBeNull()
    // The image's WORLD centre must land at the rect's centre. Pre-fix,
    // the buggy add-without-reset stored the image's local coords
    // un-translated — its world centre collapsed to (~w/2, ~h/2) on the
    // page (the "stuck to upper-left" visual) regardless of where the
    // field rect actually sat. Tolerance is the same sub-pixel slack as
    // the rect bounds; the bug shifts by 100s of points so this still
    // catches it cleanly.
    expectClose(
      pos!.imageCenter!.x,
      f.x + f.width / 2,
      POS_TOLERANCE_PT,
      `field ${f.id} image world centre-x`,
    )
    expectClose(
      pos!.imageCenter!.y,
      f.y + f.height / 2,
      POS_TOLERANCE_PT,
      `field ${f.id} image world centre-y`,
    )
  }
}

/* ------------------------------------------------------------------------ */
/*  Tests                                                                   */
/* ------------------------------------------------------------------------ */

test.describe('Page switch — element stability across navigations', () => {
  test('GH #54: image on Page 1 stays put after a Page 2 round-trip', async ({ page }) => {
    const seedPages: SeedPage[] = [
      {
        id: 'p0',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        backgroundFilename: null,
      },
      {
        id: 'p1',
        index: 1,
        backgroundType: 'color',
        backgroundColor: '#eeeeee',
        backgroundFilename: null,
      },
    ]
    const fields: SeedField[] = [
      { id: 'img-on-p0', type: 'image', pageId: 'p0', x: 100, y: 200, width: 300, height: 200 },
    ]
    await seed(page, seedPages, fields)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await waitForImageLoaded(page, 'img-on-p0')
    await expectFieldAt(page, fields[0])

    // Switch to Page 2, then back.
    await gotoPage(page, 2)
    await gotoPage(page, 1)

    await waitForImageLoaded(page, 'img-on-p0')
    await expectFieldAt(page, fields[0])
  })

  test('text + image + table fields across 3 mixed pages survive a random-walk', async ({
    page,
  }) => {
    // Three pages with different background types and sizes — the bug fires
    // on page-RETURN regardless of the destination page's content, so we
    // mix all three field types (text / image / table) across the pages at
    // distinct (x, y). A positional drift on any one of them fails the
    // assertion. Tables and text fields don't go through the buggy async
    // image-load path themselves, but they're checked too — the contract
    // is "no element moves on page-switch", not just "no image moves".
    const seedPages: SeedPage[] = [
      {
        id: 'p0',
        index: 0,
        backgroundType: 'color',
        backgroundColor: '#ffffff',
        backgroundFilename: null,
      },
      {
        id: 'p1',
        index: 1,
        backgroundType: 'color',
        backgroundColor: '#cce5ff',
        backgroundFilename: null,
        width: 800,
        height: 600,
      },
      {
        id: 'p2',
        index: 2,
        backgroundType: 'inherit',
        backgroundColor: null,
        backgroundFilename: null,
      },
    ]
    const fields: SeedField[] = [
      // Page 1: text + image + table — every field type on the page that
      // triggers the GH #54 round-trip path.
      { id: 't-p0', type: 'text', pageId: 'p0', x: 30, y: 40, width: 220, height: 60 },
      { id: 'i-p0', type: 'image', pageId: 'p0', x: 80, y: 180, width: 280, height: 220 },
      { id: 'tbl-p0', type: 'table', pageId: 'p0', x: 350, y: 50, width: 300, height: 100 },
      // Page 2: text + image (different page size).
      { id: 't-p1', type: 'text', pageId: 'p1', x: 70, y: 50, width: 240, height: 80 },
      { id: 'i-p1', type: 'image', pageId: 'p1', x: 130, y: 220, width: 320, height: 240 },
      // Page 3 (inherit bg): text + image + table.
      { id: 't-p2', type: 'text', pageId: 'p2', x: 200, y: 260, width: 200, height: 80 },
      { id: 'i-p2', type: 'image', pageId: 'p2', x: 60, y: 90, width: 200, height: 160 },
      { id: 'tbl-p2', type: 'table', pageId: 'p2', x: 60, y: 320, width: 320, height: 120 },
    ]
    await seed(page, seedPages, fields)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()

    const fieldsOnPageIdx = (idx: number): SeedField[] =>
      fields.filter((f) => f.pageId === `p${idx}`)

    const verifyCurrentPage = async (idx: number): Promise<void> => {
      const onPage = fieldsOnPageIdx(idx)
      for (const f of onPage) {
        if (f.type === 'image') await waitForImageLoaded(page, f.id)
      }
      for (const f of onPage) {
        await expectFieldAt(page, f)
      }
    }

    // Initial mount lands on Page 1 (idx 0).
    await verifyCurrentPage(0)

    // Sequence chosen to exercise: forward stepping, repeated visits, and
    // returns to a page after visiting every other page in between. Pre-fix
    // the very first return (step `1` after `2`) already triggers the bug;
    // the later steps catch any per-page-kind variance.
    const sequence: number[] = [2, 3, 1, 3, 2, 1]
    for (const pageNum of sequence) {
      await gotoPage(page, pageNum)
      await verifyCurrentPage(pageNum - 1)
    }
  })
})
