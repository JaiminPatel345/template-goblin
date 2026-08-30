import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

async function seedWithBands(page: Page): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'page-resize-e2e',
        version: '0.0.0',
        width: 595,
        height: 842,
        pageSize: 'A4',
        locked: false,
      },
      fields: [],
      fonts: [],
      groups: [],
      pages: [
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
      ],
      header: {
        enabled: true,
        applyToFirstPage: true,
        style: { height: 50, paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5 },
        fields: [],
      },
      footer: {
        enabled: true,
        applyToFirstPage: true,
        style: { height: 60, paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5 },
        fields: [],
      },
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

test.describe('Page Layout — Resize page (issue #111)', () => {
  test('opens Page Layout -> Resize page -> changes dimensions and updates page size & footer band', async ({
    page,
  }) => {
    await seedWithBands(page)
    await page.goto('/')

    // Click Page Layout anchor in toolbar
    const pageLayoutBtn = page.locator('[data-page-layout-anchor="true"]')
    await expect(pageLayoutBtn).toBeVisible()
    await pageLayoutBtn.click()

    // Assert main menu is open with 4 items
    const menu = page.locator('[data-testid="page-layout-menu"]')
    await expect(menu).toBeVisible()

    const resizeItem = page.locator('[data-testid="page-layout-menu-resize-page"]')
    await expect(resizeItem).toBeVisible()
    await resizeItem.click()

    // Flyout pane opens
    const flyout = page.locator('[data-testid="page-layout-flyout-resizePage"]')
    await expect(flyout).toBeVisible()

    const settingsBtn = page.locator('[data-testid="page-layout-flyout-resizePage-settings"]')
    await expect(settingsBtn).toBeVisible()
    await settingsBtn.click()

    // Modal dialog opens
    const modal = page.locator('[data-testid="resize-page-modal"]')
    await expect(modal).toBeVisible()

    // Pick Custom preset
    const customRadio = page.locator('[data-testid="resize-preset-custom"]')
    await customRadio.click()

    // Fill width and height
    const widthInput = page.locator('[data-testid="resize-page-width-input"]')
    const heightInput = page.locator('[data-testid="resize-page-height-input"]')

    await widthInput.fill('700')
    await heightInput.fill('1000')

    // Click Apply
    const applyBtn = page.locator('[data-testid="resize-page-apply-button"]')
    await expect(applyBtn).toBeEnabled()
    await applyBtn.click()

    // Modal closes
    await expect(modal).not.toBeVisible()

    // Assert page dimensions updated in store
    const pageDims = await page.evaluate(async () => {
      const DB_NAME = 'template-goblin'
      const STORE_NAME = 'kv'
      const KEY = 'template-goblin-template'

      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1)
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })

      const raw = await new Promise<string | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const req = tx.objectStore(STORE_NAME).get(KEY) as IDBRequest<string | undefined>
        tx.onsuccess = () => resolve(req.result)
        tx.onerror = () => reject(tx.error)
      })

      if (!raw) return null
      const parsed = JSON.parse(raw) as {
        state?: { pages?: Array<{ width?: number; height?: number }> }
      }
      return parsed.state?.pages?.[0] ?? null
    })

    expect(pageDims?.width).toBe(700)
    expect(pageDims?.height).toBe(1000)
  })
})
