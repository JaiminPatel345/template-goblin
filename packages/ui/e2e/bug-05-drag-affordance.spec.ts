/**
 * BUG-05 — Regression test (#134).
 *
 * Text / Image / Table tools require a drag to place, but a single
 * click was silently resetting to select with no feedback at all.
 * A non-technical user couldn't tell why nothing happened.
 *
 * Fix: when a placing tool is active, render a floating
 * `[data-testid="canvas-place-hint"]` banner over the canvas telling
 * the user exactly what to do. This test toggles the tools and asserts
 * the banner appears with the right copy each time, and disappears
 * when the user goes back to select.
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

test.describe('BUG-05: drag-to-place hint banner', () => {
  test.beforeEach(async ({ page }) => {
    await clearStorage(page)
    await page.goto('/')
    await onboardSolidColor(page)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 5000 })
  })

  test('hint appears with the right copy for each placing tool, then clears', async ({ page }) => {
    const hint = page.locator('[data-testid="canvas-place-hint"]')
    await expect(hint).toHaveCount(0)

    await page.locator('[data-testid="toolbar-tool-text"]').click()
    await expect(hint).toBeVisible()
    await expect(hint).toContainText(/text field/i)

    await page.locator('[data-testid="toolbar-tool-image"]').click()
    await expect(hint).toBeVisible()
    await expect(hint).toContainText(/image/i)

    await page.locator('[data-testid="toolbar-tool-table"]').click()
    await expect(hint).toBeVisible()
    await expect(hint).toContainText(/table/i)

    // Clicking the active tool again should toggle back to select and clear.
    await page.locator('[data-testid="toolbar-tool-table"]').click()
    await expect(hint).toHaveCount(0)
  })
})
