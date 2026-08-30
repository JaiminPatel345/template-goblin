import { test, expect } from '@playwright/test'

test.describe('Header / Footer Double-Click Settings Trigger', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
    })
    await page.goto('/')
  })

  test('double clicking Header band region opens Header settings modal', async ({ page }) => {
    // Enable Header band via store
    await page.evaluate(() => {
      const store = (
        window as unknown as {
          __templateStore?: {
            getState: () => {
              setHeader: (band: unknown) => void
            }
          }
        }
      ).__templateStore
      store?.getState().setHeader({
        enabled: true,
        applyToFirstPage: true,
        fields: [],
        style: {
          height: 60,
          backgroundColor: '#f0f0f0',
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10,
          divider: null,
        },
      })
    })

    // Double click at canvas top (y=30, inside header band [0, 60])
    const canvas = page.locator('[data-testid="canvas-stage-wrapper"]')
    await canvas.dblclick({ position: { x: 200, y: 30 } })

    // Verify Band Settings Modal opens with "Header settings"
    const modal = page.locator('[data-testid="band-settings-modal"]')
    await expect(modal).toBeVisible()
    await expect(modal.locator('.tg-dialog-title')).toHaveText('Header settings')

    // Click Done to close modal
    await modal.locator('button:has-text("Done")').click()
    await expect(modal).toHaveCount(0)
  })

  test('double clicking Footer band region opens Footer settings modal', async ({ page }) => {
    // Enable Footer band via store
    await page.evaluate(() => {
      const store = (
        window as unknown as {
          __templateStore?: {
            getState: () => {
              setFooter: (band: unknown) => void
            }
          }
        }
      ).__templateStore
      store?.getState().setFooter({
        enabled: true,
        applyToFirstPage: true,
        fields: [],
        style: {
          height: 50,
          backgroundColor: '#e0e0e0',
          paddingTop: 5,
          paddingBottom: 5,
          paddingLeft: 5,
          paddingRight: 5,
          divider: null,
        },
      })
    })

    // Page height is 842 for A4. Footer top is 842 - 50 = 792. Click at y=810
    const canvas = page.locator('[data-testid="canvas-stage-wrapper"]')
    await canvas.dblclick({ position: { x: 200, y: 810 } })

    // Verify Band Settings Modal opens with "Footer settings"
    const modal = page.locator('[data-testid="band-settings-modal"]')
    await expect(modal).toBeVisible()
    await expect(modal.locator('.tg-dialog-title')).toHaveText('Footer settings')

    // Click Done to close modal
    await modal.locator('button:has-text("Done")').click()
    await expect(modal).toHaveCount(0)
  })

  test('double clicking body area between header and footer does NOT open band settings modal', async ({
    page,
  }) => {
    // Enable Header band
    await page.evaluate(() => {
      const store = (
        window as unknown as {
          __templateStore?: {
            getState: () => {
              setHeader: (band: unknown) => void
            }
          }
        }
      ).__templateStore
      store?.getState().setHeader({
        enabled: true,
        applyToFirstPage: true,
        fields: [],
        style: {
          height: 60,
          backgroundColor: '#f0f0f0',
          paddingTop: 10,
          paddingBottom: 10,
          paddingLeft: 10,
          paddingRight: 10,
          divider: null,
        },
      })
    })

    // Double click in middle body area (y=400)
    const canvas = page.locator('[data-testid="canvas-stage-wrapper"]')
    await canvas.dblclick({ position: { x: 200, y: 400 } })

    // Band Settings Modal should NOT open
    const modal = page.locator('[data-testid="band-settings-modal"]')
    await expect(modal).toHaveCount(0)
  })
})
