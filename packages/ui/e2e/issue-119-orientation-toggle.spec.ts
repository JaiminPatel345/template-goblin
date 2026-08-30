/**
 * E2E for the Portrait/Landscape orientation toggle on the page-size step
 * (#119). Picking the opposite orientation swaps width/height; a swapped
 * preset lands on "Custom" with the rotated dimensions.
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

async function seed(page: Page): Promise<void> {
  const payload = {
    state: {
      meta: {
        schemaVersion: 1,
        name: 'orientation-toggle-test',
        version: '0.0.0',
        width: 595,
        height: 842,
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

async function openSizeStep(page: Page): Promise<void> {
  await page
    .locator('button', { hasText: /\+ Add Page|Add page/i })
    .first()
    .click()
  await expect(page.locator('.tg-dialog-title', { hasText: 'Add New Page' })).toBeVisible()
  await page.locator('button', { hasText: /Solid color/ }).click()
  await page.locator('button', { hasText: /Next →/ }).click()
  await expect(page.locator('text=Page size:')).toBeVisible()
}

test.describe('Page orientation toggle (#119)', () => {
  test('defaults to portrait for an A4-sized previous page', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openSizeStep(page)

    await expect(page.locator('[data-testid="orientation-portrait"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator('[data-testid="orientation-landscape"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  test('choosing Landscape swaps width/height and lands on Custom', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openSizeStep(page)

    await page.locator('[data-testid="orientation-landscape"]').click()

    // Landscape now active, portrait not.
    await expect(page.locator('[data-testid="orientation-landscape"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator('[data-testid="orientation-portrait"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    // Custom inputs are revealed with the rotated A4 dimensions (842 × 595).
    await expect(page.locator('[data-testid="page-size-custom-width"]')).toHaveValue('842')
    await expect(page.locator('[data-testid="page-size-custom-height"]')).toHaveValue('595')
  })

  test('toggling back to Portrait restores the upright dimensions', async ({ page }) => {
    await seed(page)
    await page.goto('/')
    await expect(fabricCanvas(page)).toBeVisible()
    await openSizeStep(page)

    await page.locator('[data-testid="orientation-landscape"]').click()
    await page.locator('[data-testid="orientation-portrait"]').click()

    await expect(page.locator('[data-testid="orientation-portrait"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator('[data-testid="page-size-custom-width"]')).toHaveValue('595')
    await expect(page.locator('[data-testid="page-size-custom-height"]')).toHaveValue('842')
  })
})
