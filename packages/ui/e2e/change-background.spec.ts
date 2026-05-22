/**
 * E2E for the Change Background dialog (#58).
 *
 * Pre-fix: the toolbar "BG" button opened a file picker that updated only
 * the legacy `backgroundDataUrl`. For multi-page templates the canvas
 * reads from `pageBackgroundDataUrls.get(pageId)`, so a new image had no
 * visual effect. Post-fix the button reuses `AddPageDialog` in `mode="edit"`,
 * offering image / solid color / inherit. The handler updates the CURRENT
 * page entry via `updatePage` + `setPageBackground`.
 *
 * Covered:
 *   1. Toolbar button is labelled "Change Background" (was "BG").
 *   2. Image: upload → store and canvas pick up the new bytes.
 *   3. Solid color: pick a hex → page's `backgroundType` flips to 'color'
 *      with the chosen colour persisted.
 *   4. Same as previous: page's `backgroundType` flips to 'inherit'
 *      (multi-page templates only).
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

const BLUE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFElEQVR4XmNkYGD4z8DAwMgABFAGA' +
  'AYbAQEDjC1nAAAAAElFTkSuQmCC'

interface SeedOpts {
  multiPage: boolean
}

async function seed(page: Page, { multiPage }: SeedOpts): Promise<void> {
  const pages: Record<string, unknown>[] = [
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
  ]
  if (multiPage) {
    pages.push({
      id: 'p1',
      index: 1,
      backgroundType: 'color',
      backgroundColor: '#cce5ff',
      backgroundFilename: null,
      width: 595,
      height: 842,
      pageSize: 'A4',
    })
  }
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'change-bg-test',
        version: '0.0.0',
        width: 595,
        height: 842,
        locked: false,
      },
      fields: [],
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

interface PersistedPage {
  id: string
  index: number
  backgroundType: string
  backgroundColor: string | null
  backgroundFilename: string | null
}

async function readPage(page: Page, pageId: string): Promise<PersistedPage | undefined> {
  return await page.evaluate(async (id: string) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('template-goblin', 1)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const raw = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly')
      const req = tx.objectStore('kv').get('template-goblin-template') as IDBRequest<
        string | undefined
      >
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })
    if (!raw) return undefined
    const parsed = JSON.parse(raw) as { state?: { pages?: PersistedPage[] } }
    return parsed.state?.pages?.find((p) => p.id === id)
  }, pageId)
}

async function readPageBackgroundDataUrl(page: Page, pageId: string): Promise<string | null> {
  return await page.evaluate(async (id: string) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('template-goblin', 1)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const raw = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction('kv', 'readonly')
      const req = tx.objectStore('kv').get('template-goblin-template') as IDBRequest<
        string | undefined
      >
      tx.oncomplete = () => resolve(req.result)
      tx.onerror = () => reject(tx.error)
    })
    if (!raw) return null
    const parsed = JSON.parse(raw) as {
      state?: { pageBackgroundDataUrls?: Array<[string, string]> }
    }
    const entry = parsed.state?.pageBackgroundDataUrls?.find(([k]) => k === id)
    return entry?.[1] ?? null
  }, pageId)
}

async function openChangeBgDialog(page: Page): Promise<void> {
  // #128 — Change Background lives under the File tab in the new menu
  // bar. Click File first to surface the ribbon button.
  await page.locator('[data-testid="menu-tab-file"]').click()
  await page.locator('[data-testid="toolbar-change-background"]').click()
  await expect(page.locator('.tg-dialog-title', { hasText: 'Change Background' })).toBeVisible()
}

test.describe('Change Background dialog (#58)', () => {
  test('size picker shows "Same as Current" in edit mode (not "Same as previous")', async ({
    page,
  }) => {
    await seed(page, { multiPage: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openChangeBgDialog(page)

    // Solid color routes through the size step where the radio renders.
    await page.locator('button', { hasText: /Solid color/ }).click()
    await page.locator('button', { hasText: /Next →/ }).click()
    await expect(page.locator('text=Page size:')).toBeVisible()

    const dialog = page.locator('.tg-dialog')
    const text = (await dialog.textContent()) ?? ''
    expect(text).toMatch(/Same as Current \(595 × 842 pt\)/)
    expect(text).not.toMatch(/Same as previous \(/)
  })

  test('toolbar button is labelled "Change Background"', async ({ page }) => {
    await seed(page, { multiPage: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    // #128 — Change Background lives under File now; surface the ribbon first.
    await page.locator('[data-testid="menu-tab-file"]').click()
    const btn = page.locator('[data-testid="toolbar-change-background"]')
    await expect(btn).toContainText(/Change Background/i)
    // The old "BG" label should not appear in the toolbar text.
    // #128 — the toolbar wrapper now uses role="region" instead of the
    // legacy `.tg-toolbar` class.
    const toolbarText = (await page.getByRole('region', { name: /toolbar/i }).textContent()) ?? ''
    expect(toolbarText).not.toMatch(/^BG$|\bBG\b(?!\.)/)
  })

  test('changing to a new image updates the canvas and per-page bg map', async ({ page }) => {
    await seed(page, { multiPage: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openChangeBgDialog(page)

    const buffer = Buffer.from(BLUE_PNG_BASE64, 'base64')
    // The dialog's hidden file input is scoped inside `.tg-dialog`.
    await page
      .locator('.tg-dialog input[type="file"][accept="image/*"]')
      .setInputFiles({ name: 'blue.png', mimeType: 'image/png', buffer })

    // Size step → confirm with Match image (the default for image flow).
    await page.getByRole('button', { name: 'Apply', exact: true }).click()

    // The async FileReader chain in `handleChangeBackground` lands the
    // bytes in `pageBackgroundDataUrls`. Poll for the per-page entry.
    await expect
      .poll(async () => readPageBackgroundDataUrl(page, 'p0'), { timeout: 5000 })
      .toMatch(/^data:image\/png;base64,/)
    const updated = await readPage(page, 'p0')
    expect(updated?.backgroundType).toBe('image')
    expect(updated?.width).toBe(4)
    expect(updated?.height).toBe(4)
  })

  test('changing to a solid colour flips backgroundType and persists the colour', async ({
    page,
  }) => {
    await seed(page, { multiPage: false })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openChangeBgDialog(page)

    await page.locator('button', { hasText: /Solid color/ }).click()

    // Set a non-default colour. The native `<input type="color">` was
    // replaced by the react-colorful popover (GH #121) — open the swatch
    // and fill the popover's hex text input, which is a plain `<input>`
    // that Playwright's `fill()` handles natively.
    await page.locator('[data-testid="color-picker-swatch"]').click()
    await page.locator('[data-testid="color-picker-hex"]').fill('#ff8800')
    await page.locator('button', { hasText: /Next →/ }).click()
    await page.getByRole('button', { name: 'Apply', exact: true }).click()

    await expect
      .poll(async () => (await readPage(page, 'p0'))?.backgroundType, { timeout: 3000 })
      .toBe('color')
    const updated = await readPage(page, 'p0')
    expect(updated?.backgroundColor?.toLowerCase()).toBe('#ff8800')
  })

  test('changing the bg to inherit (Same as previous page) flips backgroundType (multi-page)', async ({
    page,
  }) => {
    await seed(page, { multiPage: true })
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    // Switch to Page 2 first — inherit only makes sense when there's a
    // previous page to inherit from.
    await page.locator('button', { hasText: /^Page 2$/ }).click()
    await openChangeBgDialog(page)
    await page.locator('[data-testid="add-page-inherit"]').click()

    await expect
      .poll(async () => (await readPage(page, 'p1'))?.backgroundType, { timeout: 3000 })
      .toBe('inherit')
    const updated = await readPage(page, 'p1')
    expect(updated?.backgroundColor).toBeNull()
    expect(updated?.backgroundFilename).toBeNull()
  })
})
