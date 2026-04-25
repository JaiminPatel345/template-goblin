/**
 * E2E for image-field rendering: Fit Mode (contain / cover / fill), drag,
 * and resize behaviour. Anchors the contract that the canvas image stays
 * inside the field rect, scales to the rect rather than its native pixel
 * size, and re-fits when the rect dimensions change.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

// Tests use separate pages so each gets a fresh `addInitScript` registration
// + an empty IndexedDB. (Previously `mode: 'serial'` shared state across
// tests in the file and a stale `__fieldWidth` would leak between cases.)

// 4×4 red PNG, plain bytes inside a data URL — small enough to fit any rect
// and big enough that 'contain' vs 'cover' produce different scales when the
// rect aspect ratio differs from 1:1.
const TINY_PNG =
  'data:image/png;base64,' +
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAEklEQVR4XmP8z8AARBgAcwBQEgEDA' +
  'XAGRgwAAAAASUVORK5CYII='

async function seedImageField(
  page: Page,
  opts: {
    mode: 'static' | 'dynamic'
    fit?: 'fill' | 'contain' | 'cover'
    width: number
    height: number
  },
): Promise<void> {
  const filename = opts.mode === 'static' ? 'static-img.png' : 'placeholder-img.png'
  const source =
    opts.mode === 'static'
      ? { mode: 'static', value: { filename } }
      : { mode: 'dynamic', jsonKey: 'photo', required: false, placeholder: { filename } }
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'image-field-test',
        version: '0.0.0',
        width: 600,
        height: 500,
        locked: false,
      },
      fields: [
        {
          id: 'img1',
          type: 'image',
          label: 'img1',
          groupId: null,
          pageId: null,
          x: 50,
          y: 50,
          width: opts.width,
          height: opts.height,
          zIndex: 0,
          source,
          style: { fit: opts.fit ?? 'contain' },
        },
      ],
      fonts: [],
      groups: [],
      pages: [
        {
          id: 'p',
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
      // Use the tiny PNG as the field's image source — both static and dynamic
      // image fields look it up via `staticImageDataUrls` / placeholder resolver.
      staticImageDataUrls: [[filename, TINY_PNG]],
    },
    version: 2,
  }
  // Write directly to IndexedDB (skip the localStorage→IDB migration path)
  // so each test starts from a clean, deterministic state with no chance of
  // a delete-vs-write race blocking on the legacy migrate helper.
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
 * Each test seeds IDB synchronously inside an awaited init script so a fresh
 * value overwrites any leftover from the previous test. No async deleteDB
 * race needed.
 */

interface ImgInfo {
  scaleX: number
  scaleY: number
  left: number
  top: number
  natW: number
  natH: number
  groupLeft: number
  groupTop: number
  groupW: number
  groupH: number
}

async function readImageInfo(page: Page): Promise<ImgInfo | null> {
  return await page.evaluate(() => {
    interface FabricLike {
      getObjects: () => Array<{
        __fieldId?: string
        left?: number
        top?: number
        width?: number
        height?: number
        getObjects?: () => Array<{
          __fieldId?: string
          scaleX?: number
          scaleY?: number
          width?: number
          height?: number
          left?: number
          top?: number
        }>
      }>
    }
    const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
    if (!fc) return null
    const g = fc.getObjects().find((o) => o.__fieldId === 'img1')
    if (!g?.getObjects) return null
    const child = g
      .getObjects()
      .find(
        (c) =>
          typeof c.__fieldId === 'string' &&
          c.__fieldId.startsWith('__img_') &&
          !c.__fieldId.startsWith('__img_placeholder_'),
      )
    if (!child) return null
    return {
      scaleX: child.scaleX ?? 0,
      scaleY: child.scaleY ?? 0,
      left: child.left ?? 0,
      top: child.top ?? 0,
      natW: child.width ?? 0,
      natH: child.height ?? 0,
      groupLeft: g.left ?? 0,
      groupTop: g.top ?? 0,
      groupW: g.width ?? 0,
      groupH: g.height ?? 0,
    }
  })
}

async function waitForImage(page: Page): Promise<void> {
  await expect
    .poll(
      async () => {
        const info = await readImageInfo(page)
        return info?.natW ?? 0
      },
      { timeout: 5000 },
    )
    .toBeGreaterThan(0)
}

test.describe('Image field — Fit Mode behaviour', () => {
  test('contain on a non-square rect uses min(w/natW, h/natH) for both axes', async ({ page }) => {
    await seedImageField(page, { mode: 'static', fit: 'contain', width: 200, height: 100 })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await waitForImage(page)
    const info = (await readImageInfo(page))!
    // 4×4 image, 200×100 rect: contain scale = min(50, 25) = 25.
    expect(info.scaleX).toBeCloseTo(25, 5)
    expect(info.scaleY).toBeCloseTo(25, 5)
  })

  test('cover on a non-square rect uses max(w/natW, h/natH) for both axes', async ({ page }) => {
    await seedImageField(page, { mode: 'static', fit: 'cover', width: 200, height: 100 })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await waitForImage(page)
    const info = (await readImageInfo(page))!
    // 4×4 image, 200×100 rect: cover scale = max(50, 25) = 50.
    expect(info.scaleX).toBeCloseTo(50, 5)
    expect(info.scaleY).toBeCloseTo(50, 5)
  })

  test('fill stretches each axis independently', async ({ page }) => {
    await seedImageField(page, { mode: 'static', fit: 'fill', width: 200, height: 100 })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await waitForImage(page)
    const info = (await readImageInfo(page))!
    expect(info.scaleX).toBeCloseTo(50, 5)
    expect(info.scaleY).toBeCloseTo(25, 5)
  })

  test('contain image fits entirely inside the field rect (no overflow)', async ({ page }) => {
    await seedImageField(page, { mode: 'static', fit: 'contain', width: 200, height: 100 })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await waitForImage(page)
    const info = (await readImageInfo(page))!
    // The image's rendered footprint is natW * scaleX × natH * scaleY. For
    // contain on a 200×100 rect with a 4×4 image, that's 100×100 (square,
    // fits in rect width AND height — both <= rect size).
    const renderedW = info.natW * info.scaleX
    const renderedH = info.natH * info.scaleY
    expect(renderedW).toBeLessThanOrEqual(200)
    expect(renderedH).toBeLessThanOrEqual(100)
    // Aspect ratio preserved (square image stays square).
    expect(info.scaleX).toBeCloseTo(info.scaleY, 5)
  })
})

test.describe('Image field — drag and resize', () => {
  test('resizing the field rect re-fits the image (contain stays inside)', async ({ page }) => {
    await seedImageField(page, { mode: 'static', fit: 'contain', width: 200, height: 100 })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await waitForImage(page)

    // Mirror what Fabric does when the user drags a corner handle: scale the
    // group first, then fire `object:modified`. The handler's
    // `groupToFieldPatch` reads `width * scaleX` to capture the new rect
    // size and resets scale to 1.
    await page.evaluate(() => {
      interface FabricLike {
        getObjects: () => Array<{
          __fieldId?: string
          width?: number
          height?: number
          set?: (props: Record<string, number>) => void
          setCoords?: () => void
        }>
        fire?: (ev: string, opt: Record<string, unknown>) => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('no fabric canvas')
      const g = fc.getObjects().find((o) => o.__fieldId === 'img1')
      if (!g) throw new Error('group missing')
      // Original rect is 200×100. Scale to 80×80 → scale factors 0.4 / 0.8.
      g.set?.({ scaleX: 80 / 200, scaleY: 80 / 100 })
      g.setCoords?.()
      fc.fire?.('object:modified', { target: g })
    })

    // Wait for reconciliation to rebuild the image at the new size, then
    // snapshot a STABLE info reading. The `object:modified` handler fires
    // TWO store actions (moveField + resizeField), each triggering a
    // reconciliation that momentarily swaps the image child back to a
    // placeholder Rect while the async FabricImage reload settles. Polling
    // a single value and then reading again can race the second rebuild,
    // so we keep retrying until a single read produces the expected scale
    // and use THAT snapshot for the rest of the assertions.
    let after: ImgInfo | null = null
    await expect
      .poll(async () => {
        const info = await readImageInfo(page)
        if (
          info &&
          Math.abs(info.scaleX - 20) < 0.5 &&
          Math.abs(info.scaleY - 20) < 0.5 &&
          info.natW > 0 &&
          info.natH > 0
        ) {
          after = info
          return true
        }
        return false
      })
      .toBe(true)
    const stable = after as ImgInfo | null
    if (!stable) throw new Error('image info never stabilised')
    // 4×4 image, 80×80 rect: contain scale = min(20, 20) = 20.
    expect(stable.scaleX).toBeCloseTo(20, 1)
    expect(stable.scaleY).toBeCloseTo(20, 1)
    // Rendered footprint must still fit inside the new 80×80 rect.
    expect(stable.natW * stable.scaleX).toBeLessThanOrEqual(80)
    expect(stable.natH * stable.scaleY).toBeLessThanOrEqual(80)
  })

  test('moving the field keeps the image scale unchanged', async ({ page }) => {
    await seedImageField(page, { mode: 'static', fit: 'contain', width: 100, height: 100 })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await waitForImage(page)
    const before = (await readImageInfo(page))!

    // Move the field — same path as the canvas drag.
    await page.evaluate(() => {
      interface FabricLike {
        getObjects: () => Array<{
          __fieldId?: string
          set?: (props: Record<string, number>) => void
          setCoords?: () => void
        }>
        fire?: (ev: string, opt: Record<string, unknown>) => void
      }
      const fc = (window as unknown as { __fabricCanvas?: FabricLike }).__fabricCanvas
      if (!fc) throw new Error('no fabric canvas')
      const g = fc.getObjects().find((o) => o.__fieldId === 'img1')
      if (!g) throw new Error('group missing')
      g.set?.({ left: 250, top: 250, scaleX: 1, scaleY: 1 })
      g.setCoords?.()
      fc.fire?.('object:modified', { target: g })
    })

    // Wait for the async image reload to settle. Reconciliation rebuilds
    // children which momentarily replaces the image with a placeholder
    // Rect; poll until a real image child re-exists (natW > 0) and use
    // THAT snapshot for the scale comparison. We can't gate on the
    // group's left/top — Fabric Group recomputes its bounding box from
    // child centers post-add, so `Group#left` doesn't reflect the
    // field's stored x.
    let after: ImgInfo | null = null
    await expect
      .poll(async () => {
        const info = await readImageInfo(page)
        if (info && info.natW > 0) {
          after = info
          return true
        }
        return false
      })
      .toBe(true)
    const stable = after as ImgInfo | null
    if (!stable) throw new Error('image info never stabilised after move')
    // The rect moved but the image's scale must match the previous value —
    // moving must NOT grow the image (regression for the user-reported
    // "moving auto-resizes the image" bug).
    expect(stable.scaleX).toBeCloseTo(before.scaleX, 2)
    expect(stable.scaleY).toBeCloseTo(before.scaleY, 2)
    // The image's natural width / height (bitmap pixels) is constant.
    expect(stable.natW).toBe(before.natW)
    expect(stable.natH).toBe(before.natH)
  })
})
