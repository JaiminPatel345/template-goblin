/**
 * #159 — clicking outside the toolbar collapses the ribbon, same
 * dismiss semantic as Escape (#145).
 */
import type { Page } from '@playwright/test'
import { test, expect } from '@playwright/test'

async function clearStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.removeItem('template-goblin-template')
    localStorage.removeItem('template-goblin-ui')
    try {
      indexedDB.deleteDatabase('template-goblin')
    } catch {
      /* ignore */
    }
  })
}

async function onboardSolidColor(page: Page): Promise<void> {
  await page.locator('[data-testid="onboarding-solid-color"]').click()
  await page.getByRole('button', { name: /Next/i }).click()
  await page.getByRole('button', { name: /Apply/i }).click()
}

test('#159: mousedown outside the toolbar collapses the open ribbon', async ({ page }) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  // Ribbon visible by default.
  const ribbon = page.locator('[data-testid^="ribbon-"]').first()
  await expect(ribbon).toBeVisible()

  // Synthesise a mousedown on the canvas container (outside the
  // toolbar shell). Playwright's .click() on the Fabric <canvas> can
  // race with Fabric's own selection handler; the window-level
  // listener we install fires off the DOM mousedown phase, so we
  // dispatch the event directly.
  await page.evaluate(() => {
    const container = document.querySelector('.tg-canvas-container')
    if (!container) return
    container.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
  })
  await expect(page.locator('[data-testid^="ribbon-"]')).toHaveCount(0)

  // Clicking a menu tab re-expands.
  await page.locator('[data-testid="menu-tab-view"]').click()
  await expect(page.locator('[data-testid="ribbon-view"]')).toBeVisible()

  // Clicking inside the toolbar (Snap button) does NOT collapse.
  await page.locator('[data-testid="ribbon-snap"]').click()
  await expect(page.locator('[data-testid="ribbon-view"]')).toBeVisible()
})
