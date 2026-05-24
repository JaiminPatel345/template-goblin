/**
 * BUG-16 — Regression test (#145).
 *
 * The ribbon row used to stay pinned even when the user wanted it out
 * of the way. Now:
 *  - Clicking the currently-active menu tab collapses the ribbon
 *    (Office Online double-click convention).
 *  - Pressing Escape with no dialog open also collapses it.
 *  - Clicking any tab while collapsed re-expands.
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

test('BUG-16: ribbon collapses on active-tab click and Escape, re-expands on different tab', async ({
  page,
}) => {
  await clearStorage(page)
  await page.goto('/')
  await onboardSolidColor(page)
  await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })

  const ribbon = page.locator('[data-testid^="ribbon-"]').first()
  await expect(ribbon).toBeVisible()

  // Click active tab → collapses.
  await page.locator('[data-testid="menu-tab-insert"]').click()
  await expect(ribbon).toHaveCount(0)

  // Click a different tab → re-expands to that tab.
  await page.locator('[data-testid="menu-tab-view"]').click()
  await expect(page.locator('[data-testid="ribbon-view"]')).toBeVisible()

  // Escape with no dialog open → collapses again.
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-testid="ribbon-view"]')).toHaveCount(0)
})
